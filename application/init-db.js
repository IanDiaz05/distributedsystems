import { readFile } from "node:fs/promises";
import { MongoClient } from "mongodb";
import mysql from "mysql2/promise";
import { mongoUri, required, sqlOptions } from "./data-config.js";

const connectToMariaDb = async () => {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      return await mysql.createConnection({
        ...sqlOptions(),
        multipleStatements: true,
      });
    } catch (error) {
      if (!["ECONNREFUSED", "ETIMEDOUT", "EHOSTUNREACH", "ECONNRESET", "PROTOCOL_CONNECTION_LOST"].includes(error.code) || attempt === 30) {
        throw error;
      }
      console.log(`MariaDB is not ready; retrying (${attempt}/30)`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw new Error("MariaDB connection retry limit reached");
};

const connection = await connectToMariaDb();
const mongo = new MongoClient(
  mongoUri(),
  {
    auth: {
      username: required("MONGO_USER"),
      password: required("MONGO_PASSWORD"),
    },
    authSource: "admin",
    serverSelectionTimeoutMS: 10_000,
    writeConcern: { w: "majority", wtimeoutMS: 5000 },
  },
);

try {
  const schema = await readFile(new URL("./database/catalog.sql", import.meta.url), "utf8");
  await connection.query(schema);
  console.log("Product catalog schema initialized");
} finally {
  await connection.end();
}

try {
  await mongo.connect();
  const reviews = mongo.db(required("MONGO_DB")).collection("product_reviews");
  await reviews.createIndex({ sku: 1, createdAt: -1 });
  await reviews.updateOne(
    { sampleId: "sample-st-001" },
    {
      $setOnInsert: {
        sampleId: "sample-st-001",
        sku: "ST-001",
        reviewer: "Alex",
        rating: 5,
        comment: "Sturdy and convenient for grocery shopping.",
        createdAt: new Date("2025-01-15T12:00:00.000Z"),
      },
    },
    { upsert: true },
  );
  await reviews.updateOne(
    { sampleId: "sample-st-003" },
    {
      $setOnInsert: {
        sampleId: "sample-st-003",
        sku: "ST-003",
        reviewer: "Sam",
        rating: 4,
        comment: "A comfortable everyday mug.",
        createdAt: new Date("2025-01-16T12:00:00.000Z"),
      },
    },
    { upsert: true },
  );
  await reviews.createIndex({ sampleId: 1 }, { unique: true, sparse: true });
  console.log("Product reviews initialized in MongoDB");
} finally {
  await mongo.close();
}
