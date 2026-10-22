"use strict";

const http = require("node:http");
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
  rateLimitCount: 20,
  rateMaxEntries: 2000,
  blockForMs: 60 * 1000,
  outboundTimeoutMs: 1000,
  maxSourceUrlLength: 512,
  expectedJsonKeys: new Set(DEFAULT_EXPECTED_KEYS),
  allowedSecFetchSite: new Set(["same-origin", "same-site"]),
  leadForwardEndpoint: "https://example.invalid/lead",
  allowedOrigins: ["http://127.0.0.1"],
  blockedIps: new Set(),
  trustedProxyIps: new Set(["127.0.0.1", "::1"]),
  allowProxyXff: false,
  adminEmail: "admin@example.com",
  adminPassword: "REPLACE_WITH_STRONG_PASSWORD_MIN_12",
  adminCookieName: "sentinel_admin_session",
  adminCookieSecure: false,
  adminSessionTtlMs: 8 * 60 * 60 * 1000,
  adminSessionMaxEntries: 100,
  adminLoginRateWindowMs: 60 * 1000,
  adminLoginRateLimitCount: 10,
  adminMaxLeads: 200,
});

const requestText = ({ port, path, method = "GET", headers = {} }) =>
  new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path,
        method,
        headers,
      },
      (res) => {
        let chunks = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          chunks += chunk;
        });
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers,
            body: chunks,
          });
        });
      }
    );
    req.on("error", reject);
    req.end();
  });

const extractTokenPair = (response) => {
  const rawCookie = response.headers["set-cookie"];
  const cookieHeader = Array.isArray(rawCookie) ? rawCookie[0] : String(rawCookie || "");
  return cookieHeader.split(";")[0];
};

const loginAsAdmin = async (port, headers = {}) => {
  const login = await requestJson({
    port,
    path: "/api/admin/login",
    method: "POST",
    headers: {
      origin: "http://127.0.0.1",
      "sec-fetch-site": "same-origin",
      ...headers,
    },
    body: {
      email: "admin@example.com",
      password: "REPLACE_WITH_STRONG_PASSWORD_MIN_12",
    },
  });
  return {
    response: login,
    tokenPair: extractTokenPair(login),
  };
};

const createInMemoryLeadStore = (initialLeads = []) => {
  const data = initialLeads.map((lead) => ({ ...lead }));
  const nowIso = () => new Date("2026-02-27T10:00:00.000Z").toISOString();
  const toDateMs = (value) => {
    if (value === null || value === undefined || value === "") {
      return Number.NaN;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  };

  const matches = (lead, filters = {}) => {
    const email = String(filters.email || "").toLowerCase().trim();
    const language = String(filters.language || "").toLowerCase().trim();
    const status = String(filters.status || "").toLowerCase().trim();
    const dateFromMs = toDateMs(filters.dateFromMs);
    const dateToMs = toDateMs(filters.dateToMs);
    const createdMs = new Date(lead.createdAt).getTime();

    if (email && !String(lead.email || "").toLowerCase().includes(email)) {
      return false;
    }
    if (language && language !== "all" && String(lead.language || "").toLowerCase() !== language) {
      return false;
    }
    if (status && status !== "all" && String(lead.status || "").toLowerCase() !== status) {
      return false;
    }
    if (Number.isFinite(dateFromMs) && createdMs < dateFromMs) {
      return false;
    }
    if (Number.isFinite(dateToMs) && createdMs > dateToMs) {
      return false;
    }
    return true;
  };

  return {
    append: async (lead) => {
      data.push({
        leadId: lead.leadId || lead.requestId || `lead-${data.length + 1}`,
        createdAt: lead.createdAt || nowIso(),
        status: lead.status || "new",
        processedAt: lead.processedAt || null,
        ...lead,
      });
    },
    listRecent: async ({ limit = 200, filters = {} } = {}) =>
      data
        .filter((lead) => matches(lead, filters))
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit),
    updateStatus: async ({ leadId, processed = true } = {}) => {
      const index = data.findIndex((item) => item.leadId === leadId);
      if (index === -1) {
        return null;
      }
      data[index] = {
        ...data[index],
        status: processed ? "processed" : "new",
        processedAt: processed ? nowIso() : null,
      };
      return { ...data[index] };
    },
    deleteById: async (leadId) => {
      const index = data.findIndex((item) => item.leadId === leadId);
      if (index === -1) {
        return false;
      }
      data.splice(index, 1);
      return true;
    },
  };
};

test("GET /login returns admin login page", async () => {
  const server = createLeadServer({
    config: baseConfig(),
    logger: createSilentLogger(),
  });
  const port = await startServer(server);
  try {
    const response = await requestText({
      port,
      path: "/login",
      method: "GET",
    });
    assert.equal(response.statusCode, 200);
    assert.match(response.body, /admin-login-form/i);
    assert.match(String(response.headers["content-type"] || ""), /text\/html/i);
  } finally {
    await stopServer(server);
  }
});

test("serves admin static css asset", async () => {
  const server = createLeadServer({
    config: baseConfig(),
    logger: createSilentLogger(),
  });
  const port = await startServer(server);
  try {
    const response = await requestText({
      port,
      path: "/assets/admin.css",
      method: "GET",
    });
    assert.equal(response.statusCode, 200);
    assert.match(String(response.headers["content-type"] || ""), /text\/css/i);
    assert.match(response.body, /--bg:/i);
  } finally {
    await stopServer(server);
  }
});

test("admin login returns session cookie", async () => {
  const server = createLeadServer({
    config: baseConfig(),
    logger: createSilentLogger(),
  });
  const port = await startServer(server);
  try {
    const { response } = await loginAsAdmin(port);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    const rawCookie = response.headers["set-cookie"];
    const joined = Array.isArray(rawCookie) ? rawCookie.join(";") : String(rawCookie || "");
    assert.match(joined, /sentinel_admin_session=/);
  } finally {
    await stopServer(server);
  }
});

test("admin login allows exact same-origin with explicit local port", async () => {
  const config = {
    ...baseConfig(),
    allowedOrigins: ["http://127.0.0.1"],
  };
  const server = createLeadServer({
    config,
    logger: createSilentLogger(),
  });
  const port = await startServer(server);
  try {
    const { response } = await loginAsAdmin(port, {
      host: `127.0.0.1:${port}`,
      origin: `http://127.0.0.1:${port}`,
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
  } finally {
    await stopServer(server);
  }
});

test("admin leads endpoint requires authentication", async () => {
  const server = createLeadServer({
    config: baseConfig(),
    logger: createSilentLogger(),
  });
  const port = await startServer(server);
  try {
    const response = await requestJson({
      port,
      path: "/api/admin/leads",
      method: "GET",
      headers: {},
      body: {},
    });
    assert.equal(response.statusCode, 401);
    assert.equal(response.body.code, "unauthorized");
  } finally {
    await stopServer(server);
  }
});

test("admin can list stored leads after login", async () => {
  const memoryLeads = [];
  const server = createLeadServer({
    config: baseConfig(),
    logger: createSilentLogger(),
    forwardLeadFn: async () => true,
    requestIdFn: () => "req-admin-test",
    leadStore: {
      append: async (lead) => {
        memoryLeads.push({
          leadId: "req-admin-test",
          createdAt: "2026-01-01T00:00:00.000Z",
          status: "new",
          processedAt: null,
          ...lead,
        });
      },
      listRecent: async () => memoryLeads.slice().reverse(),
    },
  });
  const port = await startServer(server);
  try {
    await requestJson({
      port,
      path: "/api/lead",
      method: "POST",
      headers: {
        origin: "http://127.0.0.1",
        "sec-fetch-site": "same-origin",
      },
      body: validPayload(),
    });

    const { tokenPair } = await loginAsAdmin(port);
    const leads = await requestJson({
      port,
      path: "/api/admin/leads",
      method: "GET",
      headers: {
        cookie: tokenPair,
      },
      body: {},
    });
    assert.equal(leads.statusCode, 200);
    assert.equal(leads.body.ok, true);
    assert.equal(Array.isArray(leads.body.leads), true);
    assert.equal(leads.body.leads.length, 1);
    assert.equal(leads.body.leads[0].email, "b@example.com");
  } finally {
    await stopServer(server);
  }
});

test("admin can filter leads by email, language and date range", async () => {
  const store = createInMemoryLeadStore([
    {
      leadId: "lead-1",
      createdAt: "2026-02-20T10:00:00.000Z",
      status: "new",
      processedAt: null,
      name: "A",
      email: "a@example.com",
      language: "vi",
      sourceUrl: "http://127.0.0.1/#contact",
      message: "m1",
    },
    {
      leadId: "lead-2",
      createdAt: "2026-02-27T10:00:00.000Z",
      status: "processed",
      processedAt: "2026-02-27T11:00:00.000Z",
      name: "B",
      email: "security@example.com",
      language: "en",
      sourceUrl: "http://127.0.0.1/#contact",
      message: "m2",
    },
  ]);
  const server = createLeadServer({
    config: baseConfig(),
    logger: createSilentLogger(),
    leadStore: store,
  });
  const port = await startServer(server);
  try {
    const { tokenPair } = await loginAsAdmin(port);
    const response = await requestJson({
      port,
      path: "/api/admin/leads?email=security&language=en&status=processed&dateFrom=2026-02-26&dateTo=2026-02-28",
      method: "GET",
      headers: {
        cookie: tokenPair,
      },
      body: {},
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.ok, true);
    assert.equal(response.body.leads.length, 1);
    assert.equal(response.body.leads[0].leadId, "lead-2");
  } finally {
    await stopServer(server);
  }
});

test("admin can mark lead as processed and then new", async () => {
  const store = createInMemoryLeadStore([
    {
      leadId: "lead-1",
      createdAt: "2026-02-27T10:00:00.000Z",
      status: "new",
      processedAt: null,
      name: "A",
      email: "a@example.com",
      language: "vi",
      sourceUrl: "http://127.0.0.1/#contact",
      message: "m1",
    },
  ]);
  const server = createLeadServer({
    config: baseConfig(),
    logger: createSilentLogger(),
    leadStore: store,
  });
  const port = await startServer(server);
  try {
    const { tokenPair } = await loginAsAdmin(port);

    const markProcessed = await requestJson({
      port,
      path: "/api/admin/leads/lead-1/process",
      method: "POST",
      headers: {
        cookie: tokenPair,
        origin: "http://127.0.0.1",
        "sec-fetch-site": "same-origin",
      },
      body: {
        processed: true,
      },
    });
    assert.equal(markProcessed.statusCode, 200);
    assert.equal(markProcessed.body.lead.status, "processed");

    const markNew = await requestJson({
      port,
      path: "/api/admin/leads/lead-1/process",
      method: "POST",
      headers: {
        cookie: tokenPair,
        origin: "http://127.0.0.1",
        "sec-fetch-site": "same-origin",
      },
      body: {
        processed: false,
      },
    });
    assert.equal(markNew.statusCode, 200);
    assert.equal(markNew.body.lead.status, "new");
  } finally {
    await stopServer(server);
  }
});

test("admin can delete a lead", async () => {
  const store = createInMemoryLeadStore([
    {
      leadId: "lead-1",
      createdAt: "2026-02-27T10:00:00.000Z",
      status: "new",
      processedAt: null,
      name: "A",
      email: "a@example.com",
      language: "vi",
      sourceUrl: "http://127.0.0.1/#contact",
      message: "m1",
    },
  ]);
  const server = createLeadServer({
    config: baseConfig(),
    logger: createSilentLogger(),
    leadStore: store,
  });
  const port = await startServer(server);
  try {
    const { tokenPair } = await loginAsAdmin(port);

    const deleted = await requestJson({
      port,
      path: "/api/admin/leads/lead-1",
      method: "DELETE",
      headers: {
        cookie: tokenPair,
        origin: "http://127.0.0.1",
        "sec-fetch-site": "same-origin",
      },
      body: {},
    });
    assert.equal(deleted.statusCode, 200);
    assert.equal(deleted.body.ok, true);

    const afterDelete = await requestJson({
      port,
      path: "/api/admin/leads",
      method: "GET",
      headers: {
        cookie: tokenPair,
      },
      body: {},
    });
    assert.equal(afterDelete.statusCode, 200);
    assert.equal(afterDelete.body.leads.length, 0);
  } finally {
    await stopServer(server);
  }
});

test("admin can export filtered leads to CSV", async () => {
  const store = createInMemoryLeadStore([
    {
      leadId: "lead-1",
      createdAt: "2026-02-20T10:00:00.000Z",
      status: "new",
      processedAt: null,
      name: "A",
      email: "a@example.com",
      language: "vi",
      sourceUrl: "http://127.0.0.1/#contact",
      message: "m1",
      requestId: "req-1",
      clientIp: "127.0.0.1",
    },
    {
      leadId: "lead-2",
      createdAt: "2026-02-27T10:00:00.000Z",
      status: "processed",
      processedAt: "2026-02-27T11:00:00.000Z",
      name: "B",
      email: "security@example.com",
      language: "en",
      sourceUrl: "http://127.0.0.1/#contact",
      message: "m2",
      requestId: "req-2",
      clientIp: "127.0.0.1",
    },
  ]);
  const server = createLeadServer({
    config: baseConfig(),
    logger: createSilentLogger(),
    leadStore: store,
  });
  const port = await startServer(server);
  try {
    const { tokenPair } = await loginAsAdmin(port);
    const csv = await requestText({
      port,
      path: "/api/admin/leads/export.csv?language=en",
      method: "GET",
      headers: {
        cookie: tokenPair,
      },
    });
    assert.equal(csv.statusCode, 200);
    assert.match(String(csv.headers["content-type"] || ""), /text\/csv/i);
    assert.match(String(csv.headers["content-disposition"] || ""), /attachment; filename="leads-/i);
    assert.match(csv.body, /lead_id,created_at,status/);
    assert.match(csv.body, /lead-2/);
    assert.doesNotMatch(csv.body, /lead-1/);
  } finally {
    await stopServer(server);
  }
});
