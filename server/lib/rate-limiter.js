"use strict";

class InMemoryRateLimiter {
  constructor({ windowMs, maxCount, blockMs, maxEntries = 10000, nowFn = Date.now }) {
    this.windowMs = windowMs;
    this.maxCount = maxCount;
    this.blockMs = blockMs;
    this.maxEntries = Number.isFinite(maxEntries) && maxEntries > 0 ? Math.floor(maxEntries) : 10000;
    this.nowFn = nowFn;
    this.table = new Map();
  }

  prune() {
    const current = this.nowFn();
    for (const [key, entry] of this.table.entries()) {
      const windowExpired = current - entry.windowStart > this.windowMs;
      const blockExpired = entry.blockUntil <= current;
      if (windowExpired && blockExpired) {
        this.table.delete(key);
      }
    }
  }

  hit(key) {
    const current = this.nowFn();
    const existing = this.table.get(key);

    if (!existing) {
      if (this.table.size >= this.maxEntries) {
        return {
          blocked: true,
          retryAfter: Math.ceil(this.windowMs / 1000),
          saturated: true,
        };
      }
      this.table.set(key, {
        windowStart: current,
        count: 1,
        blockUntil: 0,
      });
      return { blocked: false, retryAfter: 0 };
    }

    if (existing.blockUntil > current) {
      return {
        blocked: true,
        retryAfter: Math.ceil((existing.blockUntil - current) / 1000),
      };
    }

    const windowExpired = current - existing.windowStart > this.windowMs;
    if (windowExpired) {
      existing.windowStart = current;
      existing.count = 1;
      existing.blockUntil = 0;
      return { blocked: false, retryAfter: 0 };
    }

    existing.count += 1;
    if (existing.count > this.maxCount) {
      existing.blockUntil = current + this.blockMs;
      return { blocked: true, retryAfter: Math.ceil(this.blockMs / 1000) };
    }

    return { blocked: false, retryAfter: 0 };
  }

  clear() {
    this.table.clear();
  }
}

module.exports = {
  InMemoryRateLimiter,
};
