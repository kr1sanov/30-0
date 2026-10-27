type Entry = { count: number; resetAt: number };
type Options = { limit: number; windowMs: number };

/** Bounded process-local limiter. Cleanup is amortised, not a scan per request. */
export class FixedWindowLimit {
  private entries = new Map<string, Entry>();
  private sweepAt = 0;
  private capacity: number;
  constructor(capacity = 10_000) { this.capacity = capacity; }

  consume(key: string, options: Options, now = Date.now()) {
    if (now >= this.sweepAt) {
      for (const [key, entry] of this.entries) if (entry.resetAt <= now) this.entries.delete(key);
      this.sweepAt = now + 1_000;
    }
    let entry = this.entries.get(key);
    if (entry && entry.resetAt <= now) { this.entries.delete(key); entry = undefined; }
    if (!entry) {
      // Never evict an active address: flooding new keys must not reset limits.
      if (this.entries.size >= this.capacity) return { allowed: false, resetAt: this.sweepAt };
      entry = { count: 0, resetAt: now + options.windowMs };
      this.entries.set(key, entry);
    }
    const allowed = entry.count < options.limit;
    if (allowed) entry.count++;
    return { allowed, resetAt: entry.resetAt };
  }
}
