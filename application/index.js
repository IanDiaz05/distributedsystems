import { createServer } from "node:http";
import { MongoClient } from "mongodb";
import mysql from "mysql2/promise";
import { createSentinel } from "redis";
import { mongoUri, positiveInteger, required, sentinelOptions, sqlOptions } from "./data-config.js";
import { createCatalogCache } from "./catalog-cache.js";

const pool = mysql.createPool({
  ...sqlOptions(),
  waitForConnections: true,
  connectionLimit: positiveInteger("DB_POOL_LIMIT", 10),
  queueLimit: positiveInteger("DB_QUEUE_LIMIT", 20),
  maxIdle: positiveInteger("DB_POOL_LIMIT", 10),
  idleTimeout: 30_000,
});

const mongo = new MongoClient(
  mongoUri(),
  {
    auth: {
      username: required("MONGO_USER"),
      password: required("MONGO_PASSWORD"),
    },
    authSource: "admin",
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 3000,
    socketTimeoutMS: 5000,
    writeConcern: { w: "majority", wtimeoutMS: 5000 },
  },
);
const redis = createSentinel(sentinelOptions());
redis.on("error", (error) => console.error("Redis client error:", error));
const cache = createCatalogCache(redis);

class HttpError extends Error {
  constructor(statusCode, message, trace) {
    super(message);
    this.statusCode = statusCode;
    this.trace = trace;
  }
}

const readJsonBody = async (request) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 16_384) {
      throw new HttpError(413, "Request body is too large");
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
};

const sendJson = (response, statusCode, payload, trace = []) => {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "x-request-trace": trace.join(" -> "),
  });
  response.end(JSON.stringify(payload));
};

const start = async () => {
  await mongo.connect();
  cache.connect();
  const reviews = mongo.db(required("MONGO_DB")).collection("product_reviews");
  const productsCacheKey = "store:products:cheapest";
  const server = createServer((request, response) => {
    const trace = [
      request.headers["x-presentation-lb"] || "presentation-lb-unknown",
      request.headers["x-web-node"] || "web-node-unknown",
      request.headers["x-application-lb"] || "application-lb-unknown",
      process.env.APPLICATION_NODE || "app-node-unknown",
    ];
    void (async () => {
      const pathname = new URL(request.url, "http://localhost").pathname;

      if (request.method === "GET" && pathname === "/health") {
        await Promise.all([pool.query("SELECT 1"), mongo.db().command({ ping: 1 })]);
        sendJson(response, 200, { status: "ok", cache: redis.isReady ? "available" : "degraded" },
          [...trace, "galera-proxy", "mongodb replica set"]);
        return;
      }

      if (request.method === "GET" && pathname === "/") {
        sendJson(response, 200, {
          service: "store-catalog-api",
          products: "/products/cheapest",
          reviews: "/products/{sku}/reviews",
        }, trace);
        return;
      }

      if (request.method === "GET" && pathname === "/products/cheapest") {
        const cached = await cache.get(productsCacheKey);
        if (cached.available && cached.value) {
          try {
            const products = JSON.parse(cached.value);
            if (!Array.isArray(products)) throw new Error("Invalid cached catalog");
            sendJson(response, 200, products, [...trace, "redis (cache hit)"]);
            return;
          } catch {
            // A corrupt disposable entry is repopulated from the source of truth.
          }
        }
        trace.push(cached.available ? "redis (cache miss)" : "redis (unavailable; bypass)");
        trace.push("galera-proxy");
        const [products] = await pool.execute(
          "SELECT id, sku, name, description, price FROM products ORDER BY price ASC, id ASC LIMIT 10",
        );
        const stored = await cache.set(productsCacheKey, JSON.stringify(products));
        trace.push(stored.available ? "redis (cache write)" : "redis (cache write skipped)");
        sendJson(response, 200, products, trace);
        return;
      }

      if (request.method === "POST" && pathname === "/cache/clear") {
        const removed = await cache.del(productsCacheKey);
        if (!removed.available) {
          throw new HttpError(503, "Catalog cache is unavailable; cache was not cleared", trace);
        }
        sendJson(
          response,
          200,
          { cacheKey: productsCacheKey, cacheEntryRemoved: removed.value === 1 },
          [...trace, "redis (delete catalog cache)"],
        );
        return;
      }

      const reviewMatch = pathname.match(/^\/products\/([A-Za-z0-9-]+)\/reviews$/);
      if (reviewMatch && request.method === "GET") {
        const productSku = reviewMatch[1];
        const productReviews = await reviews
          .find({ sku: productSku })
          .sort({ createdAt: -1 })
          .limit(50)
          .project({ _id: 0, reviewer: 1, rating: 1, comment: 1, createdAt: 1 })
          .toArray();
        sendJson(response, 200, { sku: productSku, reviews: productReviews }, [...trace, "mongodb"]);
        return;
      }

      if (reviewMatch && request.method === "POST") {
        if (!request.headers["content-type"]?.includes("application/json")) {
          throw new HttpError(415, "Content-Type must be application/json");
        }
        const body = await readJsonBody(request);
        if (body === null || typeof body !== "object" || Array.isArray(body)) {
          throw new HttpError(400, "Request body must be a JSON object");
        }
        const reviewer = typeof body.reviewer === "string" ? body.reviewer.trim() : "";
        const comment = typeof body.comment === "string" ? body.comment.trim() : "";
        if (
          reviewer.length < 1 ||
          reviewer.length > 80 ||
          !Number.isInteger(body.rating) ||
          body.rating < 1 ||
          body.rating > 5 ||
          comment.length < 1 ||
          comment.length > 1000
        ) {
          throw new HttpError(400, "Provide reviewer, rating (1-5), and comment within the allowed lengths");
        }
        trace.push("galera-proxy (product lookup)");
        const [matches] = await pool.execute("SELECT 1 FROM products WHERE sku = ? LIMIT 1", [
          reviewMatch[1],
        ]);
        if (matches.length === 0) {
          throw new HttpError(404, "Product not found", trace);
        }
        const review = {
          sku: reviewMatch[1],
          reviewer,
          rating: body.rating,
          comment,
          createdAt: new Date(),
        };
        const result = await reviews.insertOne(review);
        sendJson(response, 201, { id: result.insertedId.toString(), ...review }, [...trace, "mongodb (insert review)"]);
        return;
      }

      sendJson(response, 404, { error: "Not found" }, trace);
    })().catch((error) => {
      if (!(error instanceof HttpError)) {
        console.error("Request failed:", error);
      }
      if (response.headersSent) {
        response.destroy();
        return;
      }
      sendJson(
        response,
        error instanceof HttpError ? error.statusCode : 503,
        { error: error instanceof HttpError ? error.message : "Service temporarily unavailable" },
        error instanceof HttpError && error.trace ? error.trace : trace,
      );
    });
  });

  server.listen(8080, "0.0.0.0", () => {
    console.log("Store catalog API listening on port 8080");
  });

  const shutdown = () => {
    cache.close();
    server.close(() => {
      void Promise.all([pool.end(), mongo.close()]).then(() => process.exit(0));
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

start().catch((error) => {
  console.error("Application startup failed:", error);
  process.exitCode = 1;
});
