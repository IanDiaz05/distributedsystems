import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import vm from "node:vm";
import { createCatalogCache } from "./catalog-cache.js";
import { mongoUri, positiveInteger, required, sentinelOptions, sqlOptions } from "./data-config.js";

const environment = {
  DB_HOST: "galera-proxy", DB_NAME: "catalog", DB_USER: "test", DB_PASSWORD: "test-only",
  MONGO_HOSTS: "mongodb:27017,mongodb2:27017,mongodb3:27017", MONGO_DB: "reviews",
  MONGO_REPLICA_SET: "store-rs", MONGO_USER: "test", MONGO_PASSWORD: "test-only",
  REDIS_MASTER_NAME: "catalog-cache", REDIS_SENTINELS: "sentinel1:26379,sentinel2:26379,sentinel3:26379",
};

test("data configuration uses replica discovery, majority writes and bounded SQL options", () => {
  assert.match(mongoUri(environment), /mongodb2:27017,mongodb3:27017/);
  assert.match(mongoUri(environment), /replicaSet=store-rs/);
  assert.match(mongoUri(environment), /w=majority/);
  assert.equal(sqlOptions(environment).host, "galera-proxy");
  assert.equal(sqlOptions(environment).connectTimeout, 3000);
  assert.equal(sentinelOptions(environment).sentinelRootNodes.length, 3);
  assert.equal(sentinelOptions(environment).replicaPoolSize, 0);
  assert.throws(() => positiveInteger("DB_POOL_LIMIT", 10, { DB_POOL_LIMIT: "0" }));
  assert.throws(() => positiveInteger("DB_POOL_LIMIT", 10, { DB_POOL_LIMIT: "1.5" }));
  assert.throws(() => sentinelOptions({ ...environment, REDIS_SENTINELS: "sentinel:invalid" }));
});

test("cache bypasses an unavailable Sentinel client without queuing commands", async () => {
  let calls = 0;
  const client = {
    isOpen: false, isReady: false,
    connect: async () => { throw new Error("offline"); },
    get: async () => { calls += 1; },
  };
  const cache = createCatalogCache(client, 5, () => {});
  assert.deepEqual(await cache.get("catalog"), { available: false });
  assert.equal(calls, 0);
  cache.close();
});

test("cache bounds hanging work and recovers after the pending command settles", async () => {
  let finish;
  let calls = 0;
  const client = {
    isOpen: true, isReady: true,
    get: () => { calls += 1; return new Promise((resolve) => { finish = resolve; }); },
  };
  const cache = createCatalogCache(client, 5, () => {});
  assert.deepEqual(await cache.get("catalog"), { available: false });
  assert.deepEqual(await cache.get("catalog"), { available: false });
  assert.equal(calls, 1);
  finish("late");
  await new Promise((resolve) => setImmediate(resolve));
  client.get = async () => "recovered";
  assert.deepEqual(await cache.get("catalog"), { available: true, value: "recovered" });
});

test("cache reports write failures and preserves TTL and scoped deletion", async () => {
  const calls = [];
  const client = {
    isOpen: true, isReady: true,
    set: async (...args) => { calls.push(args); throw new Error("failover"); },
    del: async (key) => { calls.push(key); return 1; },
  };
  const cache = createCatalogCache(client, 5, () => {});
  assert.deepEqual(await cache.set("store:products:cheapest", "[]"), { available: false });
  assert.deepEqual(calls[0], ["store:products:cheapest", "[]", { EX: 60 }]);
  assert.deepEqual(await cache.del("store:products:cheapest"), { available: true, value: 1 });
  assert.equal(calls[1], "store:products:cheapest");
});

test("healthy concurrent cache hits do not unnecessarily fall back to SQL", async () => {
  const client = { isOpen: true, isReady: true, get: async () => "cached" };
  const cache = createCatalogCache(client, 5, () => {});
  const results = await Promise.all(Array.from({ length: 20 }, () => cache.get("catalog")));
  assert.ok(results.every((result) => result.available && result.value === "cached"));
});

const healthyGalera = "wsrep_cluster_status\tPrimary\nwsrep_connected\tON\nwsrep_ready\tON\nwsrep_local_state\t4\n0\t1\t0\n";
for (const [label, output, exitCode] of [
  ["synced primary", healthyGalera, 0],
  ["non-primary component", healthyGalera.replace("Primary", "non-Primary"), 1],
  ["unsynced node", healthyGalera.replace("state\t4", "state\t2"), 1],
  ["disconnected node", healthyGalera.replace("connected\tON", "connected\tOFF"), 1],
  ["not ready node", healthyGalera.replace("ready\tON", "ready\tOFF"), 1],
  ["read-only node", healthyGalera.replace("0\t1", "1\t1"), 1],
  ["wsrep disabled", healthyGalera.replace("0\t1", "0\t0"), 1],
  ["desynced node", healthyGalera.replace("0\t1\t0", "0\t1\t1"), 1],
  ["missing status", "", 1],
]) {
  test(`Galera check: ${label}`, () => {
    // Override the SQL subprocess with a shell function; no database is contacted.
    const result = spawnSync("bash", ["-c", `
      timeout() { printf '%s' "$GALERA_TEST_STATUS"; }
      export -f timeout
      exec bash database/galera-proxy/check-galera.sh ignored ignored 127.0.0.1 3306
    `], {
      cwd: new URL("../", import.meta.url), encoding: "utf8",
      env: { ...process.env, DB_USER: "test", DB_PASSWORD: "test-only", GALERA_TEST_STATUS: output },
    });
    assert.equal(result.status, exitCode, result.stderr);
  });
}

const apiSource = readFileSync(new URL("./index.js", import.meta.url), "utf8")
  .replace(/^import .*;\n/gm, "");

const makeApi = async ({ cached = null, cacheFailure = false, offline = false } = {}) => {
  let handler;
  let queries = 0;
  const products = [{ id: 1, sku: "ST-001", name: "Test", price: "3.49" }];
  const redis = {
    isOpen: !offline, isReady: !offline,
    on() {}, connect: async () => {},
    get: async () => { if (cacheFailure) throw new Error("Redis down"); return cached; },
    set: async () => { if (cacheFailure) throw new Error("Redis down"); return "OK"; },
    del: async () => { if (cacheFailure) throw new Error("Redis down"); return 1; },
  };
  class MongoClient {
    connect = async () => {};
    db = () => ({ collection: () => ({}), command: async () => ({ ok: 1 }) });
  }
  const context = {
    URL, Buffer, console: { log() {}, error() {}, warn() {} },
    process: { env: environment, on() {} },
    MongoClient,
    mongoUri: () => mongoUri(environment),
    positiveInteger: (name, fallback) => positiveInteger(name, fallback, environment),
    required: (name) => required(name, environment),
    sentinelOptions: () => sentinelOptions(environment),
    sqlOptions: () => sqlOptions(environment),
    createSentinel: () => redis,
    createCatalogCache: (client) => createCatalogCache(client, 5, () => {}),
    mysql: { createPool: () => ({
      query: async () => [[]],
      execute: async () => { queries += 1; return [products]; },
    }) },
    createServer: (callback) => {
      handler = callback;
      return { listen() {} };
    },
  };
  await vm.runInNewContext(apiSource, context);
  return {
    queries: () => queries,
    request: (url, method = "GET") => new Promise((resolve) => {
      const response = {
        writeHead(status, headers) { this.status = status; this.headers = headers; },
        end(body) { resolve({ status: this.status, body: JSON.parse(body), headers: this.headers }); },
      };
      handler({ url, method, headers: {} }, response);
    }),
  };
};

for (const scenario of [{ offline: true }, { cacheFailure: true }, { cached: "invalid-json" }]) {
  test(`catalog and health survive cache failure ${JSON.stringify(scenario)}`, async () => {
    const api = await makeApi(scenario);
    const result = await api.request("/products/cheapest");
    assert.equal(result.status, 200);
    assert.equal(result.body[0].sku, "ST-001");
    assert.equal(api.queries(), 1);
    assert.match(result.headers["x-request-trace"], /galera-proxy/);
    assert.equal((await api.request("/health")).status, 200);
  });
}

test("cache hit avoids SQL and failed invalidation returns an explicit error", async () => {
  const api = await makeApi({ cached: '[{"sku":"cached"}]' });
  assert.equal((await api.request("/products/cheapest")).body[0].sku, "cached");
  assert.equal(api.queries(), 0);
  const unavailable = await makeApi({ offline: true });
  assert.equal((await unavailable.request("/cache/clear", "POST")).status, 503);
});

test("MongoDB bootstrap initializes once and leaves an existing topology intact", () => {
  const source = readFileSync(new URL("../mongodb/init-replica.js", import.meta.url), "utf8");
  const expected = ["mongodb:27017", "mongodb2:27017", "mongodb3:27017"];
  for (const existing of [false, true]) {
    let initiations = 0;
    let configured = existing;
    const stopped = new Error("mongosh quit");
    const Mongo = function () {
      return { getDB: () => ({
        auth: () => true,
        runCommand: (command) => {
          if (command.replSetGetConfig) return configured
            ? { ok: 1, config: { _id: "store-rs", members: expected.map((host) => ({ host })) } }
            : { ok: 0, code: 94 };
          if (command.replSetInitiate) {
            assert.deepEqual(Array.from(command.replSetInitiate.members, (member) => member.host), expected);
            initiations += 1; configured = true; return { ok: 1 };
          }
          return { ok: 1, members: [1, 2, 2].map((state) => ({ health: 1, state })) };
        },
      }) };
    };
    assert.throws(() => vm.runInNewContext(source, {
      Mongo, process: { env: {} }, sleep() {}, print() {},
      quit: (code) => { assert.equal(code, 0); throw stopped; },
    }), (error) => error === stopped);
    assert.equal(initiations, existing ? 0 : 1);
  }
});
