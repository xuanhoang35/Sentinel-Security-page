"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { createLeadServer } = require("../lead-api");
const { DEFAULT_EXPECTED_KEYS } = require("../lib/validation");
const { createSilentLogger, requestJson, startServer, stopServer } = require("./test-utils");

const validPayload = () => ({
  name: "Tran Van B",
  email: "b@example.com",
  message: "Can danh gia bao mat ha tang va backup cho he thong.",
  website: "",
  language: "vi",
  sourceUrl: "http://127.0.0.1/#contact",
});

const baseConfig = () => ({
  port: 0,
  bindAddress: "127.0.0.1",
  maxBodyBytes: 16 * 1024,
  rateWindowMs: 60 * 1000,
  rateLimitCount: 3,
  blockForMs: 60 * 1000,
  outboundTimeoutMs: 1000,
  maxSourceUrlLength: 512,
  expectedJsonKeys: new Set(DEFAULT_EXPECTED_KEYS),
  allowedSecFetchSite: new Set(["same-origin", "same-site"]),
  leadForwardEndpoint: "https://example.invalid/lead",
  allowedOrigins: ["http://127.0.0.1"],
  blockedIps: new Set(),
});

const buildServer = (overrides = {}) =>
  createLeadServer({
    config: {
      ...baseConfig(),
      ...(overrides.config || {}),
    },
    logger: createSilentLogger(),
    forwardLeadFn: overrides.forwardLeadFn || (async () => true),
    requestIdFn: overrides.requestIdFn || (() => "test-request-id"),
  });

test("GET /health returns service status", async () => {
  const server = buildServer();
  const port = await startServer(server);
  try {
    const response = await requestJson({
      port,
      path: "/health",
      method: "GET",
      headers: {},
      body: {},
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, { ok: true, service: "lead-api" });
  } finally {
    await stopServer(server);
  }
});

test("rejects request with forbidden sec-fetch-site", async () => {
  const server = buildServer();
  const port = await startServer(server);
  try {
    const response = await requestJson({
      port,
      headers: {
        origin: "http://127.0.0.1",
        "sec-fetch-site": "cross-site",
      },
      body: validPayload(),
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.body.code, "forbidden_fetch_site");
  } finally {
    await stopServer(server);
  }
});

test("rejects request without trusted origin and referer", async () => {
  const server = buildServer();
  const port = await startServer(server);
  try {
    const response = await requestJson({
      port,
      headers: {
        origin: "https://evil.example",
      },
      body: validPayload(),
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.body.code, "forbidden_origin");
  } finally {
    await stopServer(server);
  }
});

test("accepts valid lead submission", async () => {
  const server = buildServer();
  const port = await startServer(server);
  try {
    const response = await requestJson({
      port,
      headers: {
        origin: "http://127.0.0.1",
        "sec-fetch-site": "same-origin",
      },
      body: validPayload(),
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.requestId, "test-request-id");
  } finally {
    await stopServer(server);
  }
});

test("returns 429 when request rate exceeds configured limit", async () => {
  const server = buildServer({
    config: {
      rateLimitCount: 1,
      blockForMs: 30 * 1000,
    },
  });
  const port = await startServer(server);
  try {
    const headers = {
      origin: "http://127.0.0.1",
      "sec-fetch-site": "same-origin",
    };

    const first = await requestJson({
      port,
      headers,
      body: validPayload(),
    });
    assert.equal(first.statusCode, 200);

    const second = await requestJson({
      port,
      headers,
      body: validPayload(),
    });
    assert.equal(second.statusCode, 429);
    assert.equal(second.body.code, "rate_limited");
    assert.equal(second.headers["retry-after"], "30");
  } finally {
    await stopServer(server);
  }
});

test("rejects blocked IP", async () => {
  const server = buildServer({
    config: {
      blockedIps: new Set(["127.0.0.1"]),
    },
  });
  const port = await startServer(server);
  try {
    const response = await requestJson({
      port,
      headers: {
        origin: "http://127.0.0.1",
        "sec-fetch-site": "same-origin",
      },
      body: validPayload(),
    });
    assert.equal(response.statusCode, 403);
    assert.equal(response.body.code, "forbidden");
  } finally {
    await stopServer(server);
  }
});

test("ignores spoofed x-forwarded-for when x-real-ip is unavailable", async () => {
  const server = buildServer({
    config: {
      blockedIps: new Set(["127.0.0.1"]),
      allowProxyXff: false,
    },
  });
  const port = await startServer(server);
  try {
    const response = await requestJson({
      port,
      headers: {
        origin: "http://127.0.0.1",
        "sec-fetch-site": "same-origin",
        "x-forwarded-for": "8.8.8.8",
      },
      body: validPayload(),
    });
    assert.equal(response.statusCode, 403);
    assert.equal(response.body.code, "forbidden");
  } finally {
    await stopServer(server);
  }
});

test("uses right-most x-forwarded-for when trusted fallback is enabled", async () => {
  const server = buildServer({
    config: {
      blockedIps: new Set(["203.0.113.7"]),
      allowProxyXff: true,
    },
  });
  const port = await startServer(server);
  try {
    const response = await requestJson({
      port,
      headers: {
        origin: "http://127.0.0.1",
        "sec-fetch-site": "same-origin",
        "x-forwarded-for": "198.51.100.1, 203.0.113.7",
      },
      body: validPayload(),
    });
    assert.equal(response.statusCode, 403);
    assert.equal(response.body.code, "forbidden");
  } finally {
    await stopServer(server);
  }
});

test("prefers x-real-ip over x-forwarded-for when both are present", async () => {
  const server = buildServer({
    config: {
      blockedIps: new Set(["203.0.113.20"]),
      allowProxyXff: true,
    },
  });
  const port = await startServer(server);
  try {
    const response = await requestJson({
      port,
      headers: {
        origin: "http://127.0.0.1",
        "sec-fetch-site": "same-origin",
        "x-real-ip": "203.0.113.20",
        "x-forwarded-for": "198.51.100.4, 198.51.100.5",
      },
      body: validPayload(),
    });
    assert.equal(response.statusCode, 403);
    assert.equal(response.body.code, "forbidden");
  } finally {
    await stopServer(server);
  }
});

test("returns 200 when lead forwarding fails but lead is saved", async () => {
  const server = buildServer({
    forwardLeadFn: async () => false,
  });
  const port = await startServer(server);
  try {
    const response = await requestJson({
      port,
      headers: {
        origin: "http://127.0.0.1",
        "sec-fetch-site": "same-origin",
      },
      body: validPayload(),
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.forwarded, false);
  } finally {
    await stopServer(server);
  }
});
