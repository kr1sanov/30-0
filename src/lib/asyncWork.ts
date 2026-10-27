/** Join concurrent work; failures are never retained and can be retried. */
export function singleFlight<T>(load: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined;
  return () => {
    if (!pending) {
      pending = Promise.resolve().then(load).finally(() => { pending = undefined; });
    }
    return pending;
  };
}

/** Polls join the active read; a mutation requests one fresh read after it. */
export function serialRefresh<T>(load: () => Promise<T>): (fresh?: boolean) => Promise<T> {
  let pending: Promise<T> | undefined;
  const read = () => {
    if (!pending) pending = Promise.resolve().then(load).finally(() => { pending = undefined; });
    return pending;
  };
  return async (fresh = false) => {
    if (fresh && pending) await pending.catch(() => undefined);
    return read();
  };
}

/** Small process-local snapshots for public counters, never for permissions or drafts. */
export function cachedValue<T>(load: () => Promise<T>, ttlMs: number, now = Date.now): () => Promise<T> {
  let snapshot: { value: T; expires: number } | undefined;
  const refresh = singleFlight(async () => {
    const value = await load();
    snapshot = { value, expires: now() + ttlMs };
    return value;
  });
  return () => snapshot && now() < snapshot.expires ? Promise.resolve(snapshot.value) : refresh();
}
