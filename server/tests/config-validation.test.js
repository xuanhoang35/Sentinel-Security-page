"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { buildConfig, startServer, validateConfig } = require("../lead-api");

const secureEnv = () => ({
  NODE_ENV: "production",
  LEAD_STRICT_STARTUP: "true",
  LEAD_FORWARD_ENDPOINT: "https://formsubmit.co/ajax/hovanduy1104@gmail.com",
  ALLOWED_ORIGINS: "https://hovanduy.com,https://www.hovanduy.com",
  TRUSTED_PROXY_IPS: "127.0.0.1,::1",
  TRUST_PROXY_X_FORWARDED_FOR: "false",
});

test("validateConfig passes with strict secure production settings", () => {
  const config = buildConfig(secureEnv());
  const result = validateConfig(config);

  assert.equal(result.ok, true);
  assert.equal(result.strictStartup, true);
  assert.equal(result.errors.length, 0);
});

test("validateConfig rejects localhost origins in strict mode", () => {
  const config = buildConfig({
    ...secureEnv(),
    ALLOWED_ORIGINS: "https://hovanduy.com,http://127.0.0.1",
  });
  const result = validateConfig(config);

  assert.equal(result.ok, false);
  assert.match(result.errors.join(" | "), /ALLOWED_ORIGINS/i);
});

test("validateConfig remains valid without captcha settings", () => {
  const config = buildConfig(secureEnv());
  const result = validateConfig(config);

  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});

test("validateConfig warns when XFF trust fallback is enabled", () => {
  const config = buildConfig({
    NODE_ENV: "development",
    LEAD_STRICT_STARTUP: "false",
    TRUST_PROXY_X_FORWARDED_FOR: "true",
    ALLOWED_ORIGINS: "http://127.0.0.1",
  });
  const result = validateConfig(config);

  assert.equal(result.ok, true);
  assert.equal(result.warnings.length > 0, true);
});

test("startServer accepts strict config without captcha settings", async () => {
  const config = buildConfig({
    ...secureEnv(),
    LEAD_API_PORT: "28977",
  });
  const logger = {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  };

  const server = startServer({ config, logger });
  await new Promise((resolve) => server.close(resolve));
});
