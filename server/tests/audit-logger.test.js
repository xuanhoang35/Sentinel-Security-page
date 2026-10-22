"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { createAuditLogger } = require("../lib/audit-logger");

test("audit logger redacts sensitive fields", () => {
  const lines = [];
  const writer = {
    write: (line) => lines.push(line),
  };
  const logger = createAuditLogger({
    service: "lead-api",
    salt: "unit-test-salt",
    writer,
  });

  logger.info("lead_accepted", {
    requestId: "req-1",
    clientIp: "203.0.113.42",
    email: "user@example.com",
    name: "Example User",
    message: "secret detail",
  });

  assert.equal(lines.length, 1);
  const payload = JSON.parse(lines[0]);
  assert.equal(payload.service, "lead-api");
  assert.equal(payload.level, "info");
  assert.equal(payload.meta.requestId, "req-1");
  assert.match(payload.meta.clientIp, /^ip_[a-f0-9]{12}$/);
  assert.match(payload.meta.email, /^email_[a-f0-9]{12}$/);
  assert.equal(payload.meta.name, "[redacted]");
  assert.equal(payload.meta.message, "message_len_13");
});
