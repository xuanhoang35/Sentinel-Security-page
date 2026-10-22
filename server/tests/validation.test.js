"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DEFAULT_EXPECTED_KEYS,
  allowedOrigin,
  allowedReferer,
  hasUnexpectedJsonKeys,
  validateLeadPayload,
} = require("../lib/validation");

const allowedOrigins = ["https://hovanduy.com", "http://127.0.0.1"];

const validPayload = () => ({
  name: "Nguyen Van A",
  email: "lead@example.com",
  message: "Toi can tu van bao mat ha tang cho he thong production.",
  website: "",
  language: "vi",
  sourceUrl: "https://hovanduy.com/#contact",
});

test("allowedOrigin and allowedReferer only accept configured origins", () => {
  assert.equal(allowedOrigin("https://hovanduy.com", allowedOrigins), true);
  assert.equal(allowedOrigin("https://evil.example", allowedOrigins), false);
  assert.equal(allowedReferer("https://hovanduy.com/page", allowedOrigins), true);
  assert.equal(allowedReferer("https://evil.example/page", allowedOrigins), false);
  assert.equal(allowedReferer("not-a-url", allowedOrigins), false);
});

test("hasUnexpectedJsonKeys rejects payload with unknown fields", () => {
  const payload = validPayload();
  payload.extra = "field";
  assert.equal(hasUnexpectedJsonKeys(payload, DEFAULT_EXPECTED_KEYS), true);
  assert.equal(hasUnexpectedJsonKeys(validPayload(), DEFAULT_EXPECTED_KEYS), false);
});

test("validateLeadPayload accepts valid data", () => {
  const result = validateLeadPayload(validPayload(), {
    expectedKeys: DEFAULT_EXPECTED_KEYS,
    allowedOrigins,
    maxSourceUrlLength: 512,
  });

  assert.equal(result.ok, true);
  assert.equal(result.payload.language, "vi");
  assert.equal(result.payload.email, "lead@example.com");
});

test("validateLeadPayload rejects bot honeypot and invalid source", () => {
  const botPayload = validPayload();
  botPayload.website = "https://spam.example";

  const botResult = validateLeadPayload(botPayload, {
    expectedKeys: DEFAULT_EXPECTED_KEYS,
    allowedOrigins,
  });
  assert.deepEqual(botResult, { ok: false, code: "bot_detected" });

  const sourcePayload = validPayload();
  sourcePayload.sourceUrl = "https://evil.example/hook";

  const sourceResult = validateLeadPayload(sourcePayload, {
    expectedKeys: DEFAULT_EXPECTED_KEYS,
    allowedOrigins,
  });
  assert.deepEqual(sourceResult, { ok: false, code: "invalid_source" });
});

test("validateLeadPayload rejects invalid email", () => {
  const emailPayload = validPayload();
  emailPayload.email = "bad-email";

  const emailResult = validateLeadPayload(emailPayload, {
    expectedKeys: DEFAULT_EXPECTED_KEYS,
    allowedOrigins,
  });
  assert.deepEqual(emailResult, { ok: false, code: "invalid_email" });
});

test("validateLeadPayload accepts legacy captcha field without enforcing it", () => {
  const legacyPayload = {
    ...validPayload(),
    turnstileToken: "legacy-token",
  };

  const legacyResult = validateLeadPayload(legacyPayload, {
    expectedKeys: DEFAULT_EXPECTED_KEYS,
    allowedOrigins,
  });
  assert.equal(legacyResult.ok, true);
});
