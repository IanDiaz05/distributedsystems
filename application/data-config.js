export const required = (name, env = process.env) => {
  const value = env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

export const positiveInteger = (name, fallback, env = process.env) => {
  const value = Number(env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
};

export const sqlOptions = (env = process.env) => ({
  host: required("DB_HOST", env),
  port: positiveInteger("DB_PORT", 3306, env),
  database: required("DB_NAME", env),
  user: required("DB_USER", env),
  password: required("DB_PASSWORD", env),
  connectTimeout: positiveInteger("DB_CONNECT_TIMEOUT_MS", 3000, env),
});

export const mongoUri = (env = process.env) => {
  const hosts = required("MONGO_HOSTS", env);
  const database = encodeURIComponent(required("MONGO_DB", env));
  const replicaSet = encodeURIComponent(required("MONGO_REPLICA_SET", env));
  return `mongodb://${hosts}/${database}?replicaSet=${replicaSet}&readPreference=primary&w=majority&retryWrites=true`;
};

export const sentinelOptions = (env = process.env) => ({
  name: required("REDIS_MASTER_NAME", env),
  sentinelRootNodes: required("REDIS_SENTINELS", env).split(",").map((entry) => {
    const [host, port = "26379"] = entry.trim().split(":");
    if (!host) throw new Error("REDIS_SENTINELS contains an empty host");
    return { host, port: positiveInteger("port", 26379, { port }) };
  }),
  // Read from the master too: replica lag must not undo a cache invalidation.
  masterPoolSize: 1,
  replicaPoolSize: 0,
  maxCommandRediscovers: 1,
  nodeClientOptions: {
    disableOfflineQueue: true,
    socket: { connectTimeout: 1000 },
  },
  sentinelClientOptions: {
    socket: { connectTimeout: 1000, reconnectStrategy: false },
  },
});
