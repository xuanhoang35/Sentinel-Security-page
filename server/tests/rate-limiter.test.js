"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { InMemoryRateLimiter } = require("../lib/rate-limiter");

test("InMemoryRateLimiter blocks after max requests", () => {
  let now = 0;
  const limiter = new InMemoryRateLimiter({
    windowMs: 1000,
    maxCount: 2,
    blockMs: 5000,
    nowFn: () => now,
  });

  assert.deepEqual(limiter.hit("ip-1"), { blocked: false, retryAfter: 0 });
  assert.deepEqual(limiter.hit("ip-1"), { blocked: false, retryAfter: 0 });

  const blocked = limiter.hit("ip-1");
  assert.equal(blocked.blocked, true);
  assert.equal(blocked.retryAfter, 5);

  now = 2500;
  const stillBlocked = limiter.hit("ip-1");
  assert.equal(stillBlocked.blocked, true);
  assert.equal(stillBlocked.retryAfter, 3);
});

test("InMemoryRateLimiter resets after window expires", () => {
  let now = 0;
  const limiter = new InMemoryRateLimiter({
    windowMs: 1000,
    maxCount: 1,
    blockMs: 5000,
    nowFn: () => now,
  });

  assert.equal(limiter.hit("ip-2").blocked, false);
  assert.equal(limiter.hit("ip-2").blocked, true);

  now = 6000;
  assert.equal(limiter.hit("ip-2").blocked, false);
});

test("InMemoryRateLimiter prune removes stale entries", () => {
  let now = 0;
  const limiter = new InMemoryRateLimiter({
    windowMs: 1000,
    maxCount: 5,
    blockMs: 1000,
    nowFn: () => now,
  });

  limiter.hit("ip-3");
  assert.equal(limiter.table.has("ip-3"), true);

  now = 5000;
  limiter.prune();
  assert.equal(limiter.table.has("ip-3"), false);
});

test("InMemoryRateLimiter blocks new keys when table is saturated", () => {
  let now = 0;
  const limiter = new InMemoryRateLimiter({
    windowMs: 10_000,
    maxCount: 5,
    blockMs: 5_000,
    maxEntries: 2,
    nowFn: () => now,
  });

  assert.equal(limiter.hit("ip-a").blocked, false);
  assert.equal(limiter.hit("ip-b").blocked, false);

  const saturated = limiter.hit("ip-c");
  assert.equal(saturated.blocked, true);
  assert.equal(saturated.saturated, true);
  assert.equal(saturated.retryAfter, 10);

  now = 20_000;
  limiter.prune();
  const afterPrune = limiter.hit("ip-c");
  assert.equal(afterPrune.blocked, false);
});
