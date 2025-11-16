export async function asyncPool<T, R>(concurrency: number, items: T[], worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  if (concurrency < 1) concurrency = 1;
  const results: R[] = new Array(items.length) as R[];
  let i = 0;
  const workers: Array<Promise<void>> = [];

  const runNext = async (): Promise<void> => {
    const idx = i++;
    if (idx >= items.length) return;
    try {
      results[idx] = await worker(items[idx], idx);
    } catch (err) {
      // Propagate error by throwing after all workers finish
      throw err;
    }
    await runNext();
  };

  for (let w = 0; w < Math.min(concurrency, items.length); w++) {
    workers.push(runNext());
  }

  await Promise.allSettled(workers);
  return results;
}

export async function withRetry<R>(fn: () => Promise<R>, retries = 2, baseDelayMs = 250): Promise<R> {
  let attempt = 0;
  // Exponential backoff retry, useful for transient 429/5xx
  // Will throw last error if still failing
  // Keep it tiny to avoid hammering provider
  // retries=2 => up to 3 attempts
  // baseDelayMs grows 250, 500, 1000
  // jitter minimal
  // Never blocks the event loop excessively
  // This is intentionally simple
  // Do not overcomplicate here
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
      attempt++;
    }
  }
}
