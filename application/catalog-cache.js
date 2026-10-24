// Cache failures must never turn a successful SQL read into a failed request.
export const createCatalogCache = (client, timeoutMs = 250, warn = console.warn) => {
  let connecting = null;
  let nextConnectAt = 0;
  let stopped = false;
  let pending = 0;
  let paused = false;

  const connect = () => {
    if (stopped || connecting || client.isOpen || Date.now() < nextConnectAt) return;
    connecting = client.connect().catch(() => {
      nextConnectAt = Date.now() + 2000;
    }).finally(() => { connecting = null; });
  };

  const command = async (operation) => {
    connect();
    // Allow normal concurrent hits, but stop submitting work after a timeout.
    // The underlying Sentinel operation can outlive the HTTP response budget.
    if (stopped || !client.isReady || paused || pending >= 64) return { available: false };
    pending += 1;
    const operationResult = Promise.resolve().then(operation).finally(() => {
      pending -= 1;
      if (pending === 0) paused = false;
    });
    let timer;
    try {
      const value = await Promise.race([
        operationResult,
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error("Cache command timed out")), timeoutMs);
        }),
      ]);
      return { available: true, value };
    } catch (error) {
      paused = pending > 0;
      warn("Catalog cache unavailable:", error.message);
      return { available: false };
    } finally {
      clearTimeout(timer);
    }
  };

  return {
    connect,
    get: (key) => command(() => client.get(key)),
    set: (key, value) => command(() => client.set(key, value, { EX: 60 })),
    del: (key) => command(() => client.del(key)),
    close: () => {
      stopped = true;
      if (client.isOpen) client.destroy();
    },
  };
};
