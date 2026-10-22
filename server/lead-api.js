"use strict";

const http = require("node:http");
const crypto = require("node:crypto");
const childProcess = require("node:child_process");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const net = require("node:net");
const pathModule = require("node:path");
const { URL } = require("node:url");

const { InMemoryRateLimiter } = require("./lib/rate-limiter");
const { constantTimeEquals, createSessionStore } = require("./lib/admin-session");
const { createFileLeadStore } = require("./lib/lead-store");
const {
  DEFAULT_EXPECTED_KEYS,
  DEFAULT_MAX_SOURCE_URL_LENGTH,
  allowedOrigin,
  allowedReferer,
  validateLeadPayload,
} = require("./lib/validation");
const { createAuditLogger } = require("./lib/audit-logger");

const DEFAULT_ALLOWED_SEC_FETCH_SITE = new Set(["same-origin", "same-site"]);
const DEFAULT_TRUSTED_PROXY_IPS = ["127.0.0.1", "::1"];
const DEFAULT_PUBLIC_HOSTNAMES = ["hovanduy.com", "www.hovanduy.com"];
const DEFAULT_ALLOWED_ORIGINS = DEFAULT_PUBLIC_HOSTNAMES.map((hostname) => `https://${hostname}`);
const DEFAULT_LEAD_FORWARD_ENDPOINT = "https://formsubmit.co/ajax/hovanduy1104@gmail.com";
const MAX_IP_HEADER_LENGTH = 256;
const MAX_XFF_HEADER_LENGTH = 512;
const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);
const PLACEHOLDER_MARKERS = ["replace_with", "changeme", "your_", "example", "placeholder"];
const DEFAULT_ADMIN_COOKIE_NAME = "sentinel_admin_session";
const DEFAULT_ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const DEFAULT_ADMIN_LOGIN_RATE_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_ADMIN_LOGIN_RATE_LIMIT_COUNT = 8;
const DEFAULT_LEAD_STORAGE_PATH = "./data/leads.ndjson";
const DEFAULT_MAINTENANCE_FLAG_PATH = "./data/maintenance.enabled";
const DEFAULT_MAINTENANCE_CONFIG_PATH = "./assets/maintenance-config.json";
const DEFAULT_STORAGE_DIR = "/var/lib/monitoring-lite/storage-site";
const DEFAULT_STORAGE_DOWNLOAD_LOCK_PATH = "./data/storage-download-locks.json";
const DEFAULT_STORAGE_FOLDERS_PATH = "./data/storage-folders.json";
const DEFAULT_STORAGE_COOKIE_NAME = "sentinel_storage_session";
const DEFAULT_STORAGE_SESSION_TTL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_STORAGE_MAX_UPLOAD_BYTES = 15 * 1024 * 1024 * 1024;
const DEFAULT_STORAGE_UPLOAD_TIMEOUT_MS = 60 * 60 * 1000;
const MAX_STORAGE_KEY_BODY_BYTES = 4 * 1024;
const MAX_STORAGE_FILE_NAME_LENGTH = 180;
const MAX_STORAGE_CHUNK_BYTES = 90 * 1024 * 1024;
const DEFAULT_ADMIN_MAX_LEADS = 200;
const ADMIN_PASSWORD_HASH_PREFIX = "scrypt";
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const DEFAULT_TOTP_DIGITS = 6;
const DEFAULT_TOTP_STEP_SECONDS = 30;
const DEFAULT_ADMIN_MFA_CHALLENGE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_ADMIN_MFA_CHALLENGE_MAX_ATTEMPTS = 5;
const MAX_ADMIN_LOGIN_BODY_BYTES = 8 * 1024;
const MAX_ADMIN_MAINTENANCE_CONFIG_BODY_BYTES = 150 * 1024 * 1024;
const MAX_MAINTENANCE_MEDIA_BYTES = 100 * 1024 * 1024;
const MAX_MAINTENANCE_MEDIA_TOTAL_BYTES = 100 * 1024 * 1024;
const MAX_MAINTENANCE_IMAGE_COUNT = 15;
const ADMIN_STATIC_ASSETS = {
  "/assets/admin.css": {
    contentType: "text/css; charset=utf-8",
    filePath: pathModule.resolve(__dirname, "..", "assets", "admin.css"),
  },
  "/assets/admin-login.js": {
    contentType: "application/javascript; charset=utf-8",
    filePath: pathModule.resolve(__dirname, "..", "assets", "admin-login.js"),
  },
  "/assets/admin-dashboard.js": {
    contentType: "application/javascript; charset=utf-8",
    filePath: pathModule.resolve(__dirname, "..", "assets", "admin-dashboard.js"),
  },
  "/assets/favicon.svg": {
    contentType: "image/svg+xml",
    filePath: pathModule.resolve(__dirname, "..", "assets", "favicon.svg"),
  },
};

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cache-Control": "no-store",
  Pragma: "no-cache",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Permitted-Cross-Domain-Policies": "none",
};

const parseCsv = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const normalizeEnvSecret = (value, fallback = "") => {
  const raw = String(value === undefined || value === null ? fallback : value).trim();
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1).trim();
  }
  return raw;
};

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const normalized = String(value).trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
};

const isValidSimpleEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || ""));

const normalizeIp = (ip) =>
  String(ip || "")
    .trim()
    .replace(/^\[|\]$/g, "")
    .replace(/^::ffff:/i, "");

const parseIp = (value) => {
  const normalized = normalizeIp(value);
  if (!normalized || normalized.length > MAX_IP_HEADER_LENGTH || net.isIP(normalized) === 0) {
    return "";
  }
  return normalized;
};

const normalizeIpSet = (values) => new Set(values.map((value) => parseIp(value)).filter(Boolean));

const parseUrlSafe = (value) => {
  try {
    return new URL(String(value || "").trim());
  } catch (_error) {
    return null;
  }
};

const isLoopbackHostname = (value) => LOOPBACK_HOSTNAMES.has(String(value || "").toLowerCase());

const isLikelyPlaceholder = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return PLACEHOLDER_MARKERS.some((marker) => normalized.includes(marker));
};

const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;

const isPowerOfTwo = (value) => isPositiveInteger(value) && Number.isInteger(Math.log2(value));

const parseHexBytes = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw || raw.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(raw)) {
    return null;
  }
  return Buffer.from(raw, "hex");
};

const parseScryptPasswordHash = (value) => {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }
  const parts = raw.split("$");
  if (parts.length !== 6 || parts[0] !== ADMIN_PASSWORD_HASH_PREFIX) {
    return null;
  }

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!isPowerOfTwo(n) || !isPositiveInteger(r) || !isPositiveInteger(p)) {
    return null;
  }

  const salt = parseHexBytes(parts[4]);
  const hash = parseHexBytes(parts[5]);
  if (!salt || !hash || salt.length < 8 || hash.length < 16) {
    return null;
  }

  return { n, r, p, salt, hash };
};

const verifyScryptPasswordHash = ({ plainTextPassword, encodedHash }) => {
  const parsed = parseScryptPasswordHash(encodedHash);
  if (!parsed) {
    return false;
  }
  try {
    const derived = crypto.scryptSync(String(plainTextPassword || ""), parsed.salt, parsed.hash.length, {
      N: parsed.n,
      r: parsed.r,
      p: parsed.p,
    });
    return crypto.timingSafeEqual(derived, parsed.hash);
  } catch (_error) {
    return false;
  }
};

const decodeBase32Secret = (value) => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "");
  if (!normalized || normalized.length < 16 || /[^A-Z2-7]/.test(normalized)) {
    return null;
  }
  let bitStream = "";
  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) {
      return null;
    }
    bitStream += index.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let cursor = 0; cursor + 8 <= bitStream.length; cursor += 8) {
    bytes.push(Number.parseInt(bitStream.slice(cursor, cursor + 8), 2));
  }
  if (bytes.length < 10) {
    return null;
  }
  return Buffer.from(bytes);
};

const normalizeTotpCode = (value) => String(value || "").replace(/\s+/g, "").trim();

const computeTotpForCounter = ({
  secretBytes,
  counter,
  digits = DEFAULT_TOTP_DIGITS,
}) => {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac("sha1", secretBytes).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  const modulo = 10 ** digits;
  return String(binary % modulo).padStart(digits, "0");
};

const verifyTotpCode = ({
  secretBytes,
  totpCode,
  nowMs,
  windowSteps = 1,
  stepSeconds = DEFAULT_TOTP_STEP_SECONDS,
}) => {
  if (!secretBytes || !Buffer.isBuffer(secretBytes)) {
    return false;
  }
  const normalizedCode = normalizeTotpCode(totpCode);
  if (!/^\d{6}$/.test(normalizedCode)) {
    return false;
  }
  const currentCounter = Math.floor(Math.floor(nowMs / 1000) / stepSeconds);
  for (let offset = -windowSteps; offset <= windowSteps; offset += 1) {
    const counter = currentCounter + offset;
    if (counter < 0) {
      continue;
    }
    const expectedCode = computeTotpForCounter({
      secretBytes,
      counter,
    });
    if (constantTimeEquals(normalizedCode, expectedCode)) {
      return true;
    }
  }
  return false;
};

const fromTrustedProxy = (remoteIp, trustedProxyIps = normalizeIpSet(DEFAULT_TRUSTED_PROXY_IPS)) => {
  const ip = parseIp(remoteIp);
  return Boolean(ip && trustedProxyIps.has(ip));
};

const parseXffRightMostIp = (xffValue) => {
  if (typeof xffValue !== "string") {
    return "";
  }
  if (xffValue.length > MAX_XFF_HEADER_LENGTH) {
    return "";
  }
  const items = xffValue
    .split(",")
    .map((item) => parseIp(item))
    .filter(Boolean);
  if (items.length === 0) {
    return "";
  }
  return items[items.length - 1];
};

const getClientIp = (req, config = {}) => {
  const remoteIp = parseIp(req.socket.remoteAddress || "");
  const trustedProxyIps =
    config.trustedProxyIps instanceof Set && config.trustedProxyIps.size > 0
      ? config.trustedProxyIps
      : normalizeIpSet(DEFAULT_TRUSTED_PROXY_IPS);

  if (!fromTrustedProxy(remoteIp, trustedProxyIps)) {
    return remoteIp || "unknown";
  }

  const xRealIp = parseIp(req.headers["x-real-ip"] || "");
  if (xRealIp) {
    return xRealIp;
  }

  if (toBoolean(config.allowProxyXff, false)) {
    const fallbackXffIp = parseXffRightMostIp(req.headers["x-forwarded-for"]);
    if (fallbackXffIp) {
      return fallbackXffIp;
    }
  }

  return remoteIp || "unknown";
};

const sendJson = (res, statusCode, payload, extraHeaders = {}) => {
  res.writeHead(statusCode, {
    ...securityHeaders,
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders,
  });
  res.end(JSON.stringify(payload));
};

const sendHtml = (res, statusCode, html, extraHeaders = {}) => {
  res.writeHead(statusCode, {
    ...securityHeaders,
    "Content-Type": "text/html; charset=utf-8",
    "X-Robots-Tag": "noindex, nofollow",
    ...extraHeaders,
  });
  res.end(html);
};

const sendBytes = (res, statusCode, body, contentType, extraHeaders = {}) => {
  res.writeHead(statusCode, {
    ...securityHeaders,
    "Content-Type": contentType,
    ...extraHeaders,
  });
  res.end(body);
};

const redirect = (res, location) => {
  res.writeHead(302, {
    ...securityHeaders,
    Location: location,
    "X-Robots-Tag": "noindex, nofollow",
  });
  res.end();
};

const parseCookies = (cookieHeader) => {
  const output = {};
  if (typeof cookieHeader !== "string" || cookieHeader.trim() === "") {
    return output;
  }
  for (const item of cookieHeader.split(";")) {
    const part = item.trim();
    if (!part) {
      continue;
    }
    const separator = part.indexOf("=");
    if (separator === -1) {
      continue;
    }
    const key = part.slice(0, separator).trim();
    const rawValue = part.slice(separator + 1).trim();
    if (!key) {
      continue;
    }
    try {
      output[key] = decodeURIComponent(rawValue || "");
    } catch (_error) {
      output[key] = rawValue || "";
    }
  }
  return output;
};

const sanitizeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch (_error) {
    return false;
  }
};

const buildSessionCookie = ({ cookieName, token, maxAgeSeconds, secure }) => {
  const parts = [
    `${cookieName}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${String(maxAgeSeconds)}`,
  ];
  if (secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
};

const buildClearSessionCookie = ({ cookieName, secure }) => {
  const parts = [`${cookieName}=`, "Path=/", "HttpOnly", "SameSite=Strict", "Max-Age=0"];
  if (secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
};

const getSessionTokenFromRequest = (req, cookieName) => {
  const cookies = parseCookies(req.headers.cookie || "");
  return String(cookies[cookieName] || "");
};

const getRequestOrigin = (req) => {
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").trim();
  if (!host) {
    return "";
  }

  const forwardedProto = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  const proto = forwardedProto === "https" ? "https" : "http";

  try {
    return new URL(`${proto}://${host}`).origin;
  } catch (_error) {
    return "";
  }
};

const isSameOriginRequest = (req, origin, referer) => {
  const requestOrigin = getRequestOrigin(req);
  if (!requestOrigin) {
    return false;
  }

  if (origin && allowedOrigin(origin, [requestOrigin])) {
    return true;
  }
  if (referer && allowedReferer(referer, [requestOrigin])) {
    return true;
  }
  return false;
};

const validateAdminLoginPayload = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, code: "invalid_request" };
  }
  const keys = Object.keys(body);
  if (keys.some((key) => key !== "email" && key !== "password")) {
    return { ok: false, code: "invalid_request" };
  }

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "").trim();
  if (!email || !password) {
    return { ok: false, code: "invalid_credentials" };
  }

  if (email.length > 254 || password.length > 256) {
    return { ok: false, code: "invalid_credentials" };
  }

  return {
    ok: true,
    payload: {
      email,
      password,
    },
  };
};

const validateAdminMfaPayload = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, code: "invalid_request" };
  }
  const keys = Object.keys(body);
  if (keys.some((key) => key !== "challengeToken" && key !== "totpCode")) {
    return { ok: false, code: "invalid_request" };
  }

  const challengeToken = String(body.challengeToken || "").trim();
  const totpCode = normalizeTotpCode(body.totpCode);
  if (!challengeToken || challengeToken.length > 128 || !/^[A-Za-z0-9._~-]+$/.test(challengeToken)) {
    return { ok: false, code: "invalid_request" };
  }
  if (!/^\d{6}$/.test(totpCode)) {
    return { ok: false, code: "invalid_totp" };
  }

  return {
    ok: true,
    payload: {
      challengeToken,
      totpCode,
    },
  };
};

const credentialsMatchAdmin = ({ email, password, config }) => {
  const configuredEmail = String(config.adminEmail || "").toLowerCase().trim();
  if (!constantTimeEquals(email, configuredEmail)) {
    return false;
  }

  const encodedHash = String(config.adminPasswordHash || "").trim();
  if (encodedHash) {
    return verifyScryptPasswordHash({
      plainTextPassword: password,
      encodedHash,
    });
  }

  return constantTimeEquals(password, String(config.adminPassword || ""));
};

const parseDateBoundaryMs = (value, endOfDay = false) => {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return null;
  }
  const suffix = endOfDay ? "T23:59:59.999" : "T00:00:00.000";
  const parsed = new Date(`${raw}${suffix}`).getTime();
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
};

const parseAdminLeadFilters = (searchParams) => {
  const email = String(searchParams.get("email") || "").trim().toLowerCase();
  const phone = String(searchParams.get("phone") || "").trim().toLowerCase();
  const languageRaw = String(searchParams.get("language") || "").trim().toLowerCase();
  const language = languageRaw === "vi" || languageRaw === "en" ? languageRaw : "all";
  const statusRaw = String(searchParams.get("status") || "").trim().toLowerCase();
  const status = statusRaw === "processed" || statusRaw === "new" ? statusRaw : "all";
  const dateFrom = String(searchParams.get("dateFrom") || "").trim();
  const dateTo = String(searchParams.get("dateTo") || "").trim();

  return {
    email,
    phone,
    language,
    status,
    dateFrom,
    dateTo,
    dateFromMs: parseDateBoundaryMs(dateFrom, false),
    dateToMs: parseDateBoundaryMs(dateTo, true),
  };
};

const csvEscape = (value) => `"${String(value === undefined || value === null ? "" : value).replace(/"/g, '""')}"`;

const leadsToCsv = (leads) => {
  const headers = [
    "lead_id",
    "created_at",
    "status",
    "processed_at",
    "name",
    "email",
    "phone",
    "language",
    "source_url",
    "message",
    "request_id",
    "client_ip",
  ];
  const rows = [headers.join(",")];
  for (const lead of leads) {
    rows.push(
      [
        csvEscape(lead.leadId),
        csvEscape(lead.createdAt),
        csvEscape(lead.status || "new"),
        csvEscape(lead.processedAt || ""),
        csvEscape(lead.name),
        csvEscape(lead.email),
        csvEscape(lead.phone || ""),
        csvEscape(lead.language),
        csvEscape(lead.sourceUrl),
        csvEscape(lead.message),
        csvEscape(lead.requestId || ""),
        csvEscape(lead.clientIp || ""),
      ].join(",")
    );
  }
  return `\uFEFF${rows.join("\n")}\n`;
};

const decodePathToken = (value) => {
  try {
    return decodeURIComponent(String(value || "").trim());
  } catch (_error) {
    return "";
  }
};

const renderLoginPage = ({ emailPrefill = "" } = {}) => `<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sentinel Shield Admin</title>
    <meta name="robots" content="noindex,nofollow" />
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg" />
    <link rel="stylesheet" href="/assets/admin.css?v=20260719-pause-1" />
  </head>
  <body class="admin-body">
    <div class="admin-scene" aria-hidden="true">
      <span class="admin-scene-line admin-scene-a"></span>
      <span class="admin-scene-line admin-scene-b"></span>
      <span class="admin-scene-grid"></span>
    </div>
    <main class="admin-auth-wrap">
      <section class="admin-auth-shell">
        <div class="admin-auth-copy">
          <a class="admin-brand" href="/" aria-label="Sentinel Shield">
            <span class="admin-brand-mark"><span></span></span>
            <span>
              <strong>Sentinel Shield</strong>
              <small>DevSecOps Command</small>
            </span>
          </a>
          <p class="admin-eyebrow">Secure admin access</p>
          <h1>Trung tâm quản trị lead bảo mật</h1>
          <p>
            Khu vực nội bộ để kiểm tra yêu cầu tư vấn, lọc lead, xuất dữ liệu và
            ghi nhận trạng thái xử lý. Phiên đăng nhập được bảo vệ bằng mật khẩu và OTP.
          </p>
          <div class="admin-auth-points">
            <span>MFA challenge</span>
            <span>Same-origin session</span>
            <span>No-index portal</span>
          </div>
        </div>

        <form id="admin-login-form" class="admin-card" novalidate>
          <p class="admin-eyebrow">Admin Portal</p>
          <h2>\u0110\u0103ng nh\u1eadp qu\u1ea3n tr\u1ecb</h2>
          <label for="admin-email">Email</label>
          <input id="admin-email" name="email" type="email" autocomplete="username" required value="${sanitizeHtml(
            emailPrefill
          )}" />

          <label for="admin-password">M\u1eadt kh\u1ea9u</label>
          <input id="admin-password" name="password" type="password" autocomplete="current-password" required />

          <div id="admin-mfa-wrap" hidden>
            <label for="admin-totp-code">Secret code</label>
            <input
              id="admin-totp-code"
              name="totpCode"
              type="password"
              inputmode="numeric"
              maxlength="6"
              autocomplete="one-time-code"
              placeholder="******"
            />
            <input id="admin-mfa-challenge-token" name="challengeToken" type="hidden" />
          </div>

          <button type="submit">\u0110\u0103ng nh\u1eadp</button>
          <p id="admin-login-note" class="admin-note" aria-live="polite"></p>
        </form>
      </section>
    </main>
    <script src="/assets/admin-login.js?v=20260717-1" defer></script>
  </body>
</html>
`;

const renderStorageSitePage = () => `<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex,nofollow" />
    <title>Storage Site | Sentinel Shield</title>
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg" />
    <style>
      :root{--bg:#05070d;--panel:#0d1424;--text:#edf4ff;--muted:#9bacca;--line:rgba(152,169,198,.2);--green:#10f2a2;--cyan:#18c8ff;--danger:#ff5f7a;--yellow:#ffd166;--radius:12px}*{box-sizing:border-box}body{min-height:100vh;margin:0;color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:radial-gradient(900px 520px at 88% 12%,rgba(0,245,166,.12),transparent 62%),radial-gradient(700px 420px at 10% 0%,rgba(24,200,255,.12),transparent 58%),#05070d}.scene{position:fixed;inset:0;pointer-events:none;background-image:linear-gradient(rgba(152,169,198,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(152,169,198,.06) 1px,transparent 1px);background-size:54px 54px;mask-image:linear-gradient(to bottom,#000,transparent 82%)}.line{position:fixed;width:1px;height:120vh;background:linear-gradient(to bottom,transparent,rgba(24,200,255,.55),transparent);transform:rotate(62deg);left:18%;top:-28%}.wrap{position:relative;z-index:1;width:min(1180px,100%);margin:0 auto;padding:clamp(1rem,3vw,2.4rem)}.brand{display:inline-flex;align-items:center;gap:.75rem;color:var(--text);text-decoration:none}.brand-mark{width:44px;height:44px;border-radius:10px;background:url('/assets/favicon.svg') center/contain no-repeat;box-shadow:0 0 24px rgba(20,184,255,.16)}.brand strong,.brand small{display:block}.brand small{color:var(--muted);font:700 .68rem/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase}.hero{margin:clamp(2rem,6vw,4rem) 0 1.2rem}.eyebrow{margin:0 0 .7rem;color:var(--green);font:900 .72rem/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase}h1{max-width:820px;margin:0;font-size:clamp(2.6rem,7vw,5.8rem);line-height:.98}.copy{max-width:72ch;color:var(--muted);line-height:1.7;font-size:1.03rem}.panel,.stat{border:1px solid var(--line);border-radius:20px;background:linear-gradient(180deg,rgba(17,26,45,.92),rgba(8,13,23,.94));box-shadow:0 28px 80px rgba(0,0,0,.42)}.unlock{width:min(520px,100%);padding:1.2rem;margin-top:1.2rem}.unlock label{display:grid;gap:.45rem;color:#dce8ff;font-weight:800}.unlock input,.search{width:100%;border:1px solid rgba(152,169,198,.22);border-radius:var(--radius);background:#07101c;color:var(--text);padding:.85rem .95rem;font:inherit;outline:none}.button{display:inline-flex;align-items:center;justify-content:center;min-height:42px;border:0;border-radius:var(--radius);background:linear-gradient(135deg,var(--green),var(--cyan));color:#03101b;font-weight:900;cursor:pointer;padding:.8rem 1rem;text-decoration:none}.button.secondary{border:1px solid rgba(152,169,198,.24);background:rgba(13,20,36,.82);color:var(--text)}.button.disabled{cursor:not-allowed;background:rgba(255,95,122,.14);color:#ffc2cf;border:1px solid rgba(255,95,122,.3)}.unlock .button{width:100%;margin-top:1rem}.note{min-height:1.3rem;margin:1rem 0 0;color:var(--green);font-size:.92rem}.note.error{color:var(--danger)}.app{display:none}.app.active{display:block}.top{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1rem}.stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;margin-bottom:1rem}.stat{padding:1rem;min-height:120px}.stat span{display:block;color:var(--muted);font-weight:800}.stat strong{display:block;margin-top:.45rem;color:var(--green);font-size:clamp(1.8rem,4.1vw,3.1rem);line-height:1.02;overflow-wrap:anywhere;max-width:100%}.stat strong.compact{font-size:clamp(1.45rem,3vw,2.45rem);line-height:1.12}.toolbar{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:.75rem;margin:1rem 0}.files{overflow:auto}.table{width:100%;min-width:760px;border-collapse:collapse;table-layout:fixed}.table th{position:sticky;top:0;text-align:left;color:var(--muted);background:#080d16;font-size:.78rem;letter-spacing:.08em;text-transform:uppercase}.table th,.table td{padding:.9rem;border-bottom:1px solid rgba(152,169,198,.12);vertical-align:top;overflow-wrap:anywhere}.table td{color:#dce8ff}.file-name{font-weight:850;color:#f4f7ff}.pill{display:inline-flex;border:1px solid rgba(16,242,162,.28);border-radius:999px;padding:.28rem .55rem;color:#9dffd9;background:rgba(16,242,162,.08);font-size:.78rem;font-weight:900}.empty{padding:2rem;color:var(--muted);text-align:center}.folder-row{background:rgba(16,242,162,.08)!important;color:#9dffd9!important;font-weight:900;letter-spacing:.04em}@media(max-width:1100px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:820px){.stats,.toolbar{grid-template-columns:1fr}.top{display:block}.button{width:100%;margin-top:.5rem}}
    </style>
  </head>
  <body>
    <div class="scene" aria-hidden="true"></div><span class="line" aria-hidden="true"></span>
    <main class="wrap">
      <a class="brand" href="/" aria-label="Sentinel Shield"><span class="brand-mark"></span><span><strong>Sentinel Shield</strong><small>Storage Site</small></span></a>
      <section id="unlock-view" class="hero">
        <p class="eyebrow">Protected storage</p>
        <h1>Kho tải file nội bộ</h1>
        <p class="copy">Khu lưu trữ tách riêng khỏi landing page. Nhập khóa Storage hoặc mã OTP admin 6 số để xem danh sách file và tải xuống.</p>
        <form id="storage-unlock-form" class="panel unlock" novalidate>
          <label>Khóa bảo mật<input id="storage-key" type="password" autocomplete="one-time-code" placeholder="Nhập khóa Storage hoặc OTP admin" required /></label>
          <button class="button" type="submit">Mở kho file</button>
          <p id="storage-unlock-note" class="note" aria-live="polite"></p>
        </form>
      </section>
      <section id="storage-app" class="app">
        <header class="top"><div><p class="eyebrow">Storage browser</p><h1>Kho file đã mở</h1><p class="copy">Nếu chưa thấy file nào, hãy vào trang admin mục Storage/NAS để upload trước. File sau khi upload sẽ xuất hiện tại đây để tải xuống.</p></div><button id="storage-lock-btn" class="button secondary" type="button">Khóa lại</button></header>
        <section class="stats"><article class="stat"><span>Tổng file</span><strong id="storage-stat-count">0</strong></article><article class="stat"><span>Cập nhật mới nhất</span><strong id="storage-stat-updated" class="compact">Đã mở</strong></article></section>
        <section class="panel" style="padding:1rem"><div class="toolbar"><input id="storage-search" class="search" type="search" placeholder="Tìm file..." /><button id="storage-refresh-btn" class="button secondary" type="button">Tải lại</button><a class="button secondary" href="/">Trang chủ</a></div><p id="storage-note" class="note" aria-live="polite"></p><div class="files"><table class="table"><thead><tr><th>Tên file</th><th>Dung lượng</th><th>Cập nhật</th><th>Tải xuống</th></tr></thead><tbody id="storage-files-body"><tr><td colspan="4" class="empty">Kho đang trống. Vào admin > Storage/NAS để upload file.</td></tr></tbody></table></div></section>
      </section>
    </main>
    <script>
      const storageTokenKey='sentinel_storage_token';
      let storageToken=sessionStorage.getItem(storageTokenKey)||'';
      const unlockView=document.getElementById('unlock-view'),app=document.getElementById('storage-app'),form=document.getElementById('storage-unlock-form'),keyInput=document.getElementById('storage-key'),unlockNote=document.getElementById('storage-unlock-note'),note=document.getElementById('storage-note'),body=document.getElementById('storage-files-body'),search=document.getElementById('storage-search'),countEl=document.getElementById('storage-stat-count'),updatedEl=document.getElementById('storage-stat-updated');
      let files=[];
      const fmtBytes=n=>{const v=Number(n)||0;const u=['B','KiB','MiB','GiB','TiB'];let i=0,x=v;while(x>=1024&&i<u.length-1){x/=1024;i++}return x.toFixed(i?1:0)+' '+u[i]};
      const fmtDate=v=>v?new Date(v).toLocaleString('vi-VN'):'-';
      const setNote=(el,msg,err=false)=>{el.textContent=msg||'';el.classList.toggle('error',!!err)};
      const showApp=()=>{unlockView.style.display='none';app.classList.add('active')};
      const showUnlock=()=>{app.classList.remove('active');unlockView.style.display='block'};
      const authHeaders=()=>{const headers={Accept:'application/json'};if(storageToken){headers['X-Storage-Token']=storageToken}return headers};
      const withStorageToken=url=>{if(!storageToken){return url}const sep=url.includes('?')?'&':'?';return url+sep+'storageToken='+encodeURIComponent(storageToken)};
      const saveStorageToken=token=>{storageToken=String(token||'').trim();if(storageToken){sessionStorage.setItem(storageTokenKey,storageToken)}else{sessionStorage.removeItem(storageTokenKey)}};
      const render=()=>{const q=(search.value||'').toLowerCase().trim();const rows=files.filter(f=>!q||String(f.name).toLowerCase().includes(q)||String(f.folderName||'').toLowerCase().includes(q));body.replaceChildren();if(!rows.length){const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=4;td.className='empty';td.textContent='Kho đang trống hoặc không có file phù hợp. Upload file trong admin > Storage/NAS rồi bấm Tải lại.';tr.appendChild(td);body.appendChild(tr);return}const groups=new Map();for(const f of rows){const folder=f.folderName||'Chưa phân loại';if(!groups.has(folder))groups.set(folder,[]);groups.get(folder).push(f)}for(const [folder,items] of groups){const head=document.createElement('tr');const hc=document.createElement('td');hc.colSpan=4;hc.className='folder-row';hc.textContent='📁 '+folder+' · '+items.length+' file';head.appendChild(hc);body.appendChild(head);for(const f of items){const tr=document.createElement('tr');const name=document.createElement('td');name.innerHTML='<span class="file-name"></span><br><span class="pill"></span>';name.querySelector('.file-name').textContent=f.name;name.querySelector('.pill').textContent=f.type||'file';const size=document.createElement('td');size.textContent=fmtBytes(f.size);const m=document.createElement('td');m.textContent=fmtDate(f.modifiedAt);const a=document.createElement('td');if(f.downloadLocked){const lock=document.createElement('span');lock.className='button disabled';lock.textContent='Đang khóa';a.appendChild(lock)}else{const link=document.createElement('a');link.className='button';link.href=withStorageToken(f.downloadUrl);link.textContent='Tải xuống';a.appendChild(link)}tr.append(name,size,m,a);body.appendChild(tr)}}};
      const load=async()=>{setNote(note,'Đang tải danh sách file...');const r=await fetch('/api/storage/files',{credentials:'same-origin',headers:authHeaders()});const p=await r.json().catch(()=>({}));if(!r.ok||p.ok!==true){saveStorageToken('');showUnlock();setNote(unlockNote,'Phiên truy cập hết hạn hoặc khóa chưa đúng. Hãy nhập lại khóa Storage.',true);return}files=Array.isArray(p.files)?p.files:[];countEl.textContent=String(files.length);updatedEl.textContent=files[0]?fmtDate(files[0].modifiedAt):'Chưa có file';render();const lockedCount=files.filter(f=>f.downloadLocked).length;setNote(note,lockedCount?'Đã tải '+files.length+' file. Có '+lockedCount+' file đang bị khóa tải xuống.':(files.length?'Đã tải '+files.length+' file.':'Kho đang trống. Hãy upload file trong admin > Storage/NAS.'))};
      form.addEventListener('submit',async e=>{e.preventDefault();setNote(unlockNote,'Đang kiểm tra khóa...');let r,p;try{r=await fetch('/api/storage/unlock',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({key:keyInput.value||''})});p=await r.json()}catch(_error){setNote(unlockNote,'Không gọi được API mở kho. Hãy tải lại trang rồi thử lại.',true);return}if(!r.ok||p.ok!==true){setNote(unlockNote,'Khóa không đúng hoặc mã OTP đã hết hạn. Hãy nhập khóa Storage cố định hoặc mã OTP admin hiện tại.',true);return}saveStorageToken(p.storageToken||'');keyInput.value='';showApp();load().catch(()=>setNote(note,'Không thể tải danh sách file.',true))});
      document.getElementById('storage-refresh-btn').addEventListener('click',()=>load().catch(()=>setNote(note,'Không thể tải danh sách file.',true)));
      document.getElementById('storage-lock-btn').addEventListener('click',async()=>{await fetch('/api/storage/logout',{method:'POST',credentials:'same-origin',headers:authHeaders()}).catch(()=>{});files=[];saveStorageToken('');showUnlock();setNote(unlockNote,'Đã khóa phiên truy cập.')});
      search.addEventListener('input',render);
      fetch('/api/storage/session',{credentials:'same-origin',headers:authHeaders()}).then(r=>r.json()).then(p=>{if(p&&p.ok&&p.unlocked){showApp();return load()}saveStorageToken('')}).catch(()=>{});
    </script>
  </body>
</html>`;


const protectedStaticPages = {
  "/learnit": { title: "LearnIT", eyebrow: "Protected learning", heading: "Khu học tập DevOps đã khóa", copy: "Nhập khóa Storage hoặc mã OTP admin 6 số để mở trang LearnIT.", filePath: pathModule.join(__dirname, "..", "learnit.html") },
  "/learnit/": { title: "LearnIT", eyebrow: "Protected learning", heading: "Khu học tập DevOps đã khóa", copy: "Nhập khóa Storage hoặc mã OTP admin 6 số để mở trang LearnIT.", filePath: pathModule.join(__dirname, "..", "learnit.html") },
  "/setupdev": { title: "SetupDev", eyebrow: "Protected runbook", heading: "SetupDev đã khóa", copy: "Nhập khóa Storage hoặc mã OTP admin 6 số để mở tài liệu triển khai hệ thống.", filePath: pathModule.join(__dirname, "..", "setupdev.html") },
  "/setupdev/": { title: "SetupDev", eyebrow: "Protected runbook", heading: "SetupDev đã khóa", copy: "Nhập khóa Storage hoặc mã OTP admin 6 số để mở tài liệu triển khai hệ thống.", filePath: pathModule.join(__dirname, "..", "setupdev.html") },
};

const renderProtectedStaticPage = ({ title, eyebrow, heading, copy }) => `<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex,nofollow" />
    <title>${title} | Protected</title>
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg" />
    <style>
      :root{--bg:#05070d;--panel:#0d1424;--text:#edf4ff;--muted:#9bacca;--line:rgba(152,169,198,.2);--green:#10f2a2;--cyan:#18c8ff;--danger:#ff5f7a;--radius:12px}*{box-sizing:border-box}body{min-height:100vh;margin:0;color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:radial-gradient(900px 520px at 88% 12%,rgba(0,245,166,.12),transparent 62%),radial-gradient(700px 420px at 10% 0%,rgba(24,200,255,.12),transparent 58%),#05070d}.scene{position:fixed;inset:0;pointer-events:none;background-image:linear-gradient(rgba(152,169,198,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(152,169,198,.06) 1px,transparent 1px);background-size:54px 54px;mask-image:linear-gradient(to bottom,#000,transparent 82%)}.line{position:fixed;width:1px;height:120vh;background:linear-gradient(to bottom,transparent,rgba(24,200,255,.55),transparent);transform:rotate(62deg);left:18%;top:-28%}.wrap{position:relative;z-index:1;width:min(980px,100%);margin:0 auto;padding:clamp(1rem,3vw,2.4rem)}.brand{display:inline-flex;align-items:center;gap:.75rem;color:var(--text);text-decoration:none}.brand-mark{width:44px;height:44px;border-radius:10px;background:url('/assets/favicon.svg') center/contain no-repeat;box-shadow:0 0 24px rgba(20,184,255,.16)}.brand strong,.brand small{display:block}.brand small{color:var(--muted);font:700 .68rem/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase}.hero{margin:clamp(2rem,6vw,4rem) 0 1.2rem}.eyebrow{margin:0 0 .7rem;color:var(--green);font:900 .72rem/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase}h1{max-width:820px;margin:0;font-size:clamp(2.6rem,7vw,5.8rem);line-height:.98}.copy{max-width:72ch;color:var(--muted);line-height:1.7;font-size:1.03rem}.panel{width:min(520px,100%);padding:1.2rem;margin-top:1.2rem;border:1px solid var(--line);border-radius:20px;background:linear-gradient(180deg,rgba(17,26,45,.92),rgba(8,13,23,.94));box-shadow:0 28px 80px rgba(0,0,0,.42)}label{display:grid;gap:.45rem;color:#dce8ff;font-weight:800}input{width:100%;border:1px solid rgba(152,169,198,.22);border-radius:var(--radius);background:#07101c;color:var(--text);padding:.85rem .95rem;font:inherit;outline:none}.button{display:inline-flex;align-items:center;justify-content:center;min-height:42px;border:0;border-radius:var(--radius);background:linear-gradient(135deg,var(--green),var(--cyan));color:#03101b;font-weight:900;cursor:pointer;padding:.8rem 1rem;text-decoration:none;width:100%;margin-top:1rem}.note{min-height:1.3rem;margin:1rem 0 0;color:var(--green);font-size:.92rem}.note.error{color:var(--danger)}
    </style>
  </head>
  <body>
    <div class="scene" aria-hidden="true"></div><span class="line" aria-hidden="true"></span>
    <main class="wrap">
      <a class="brand" href="/" aria-label="Sentinel Shield"><span class="brand-mark"></span><span><strong>Sentinel Shield</strong><small>${title}</small></span></a>
      <section class="hero">
        <p class="eyebrow">${eyebrow}</p>
        <h1>${heading}</h1>
        <p class="copy">${copy}</p>
        <form id="protected-unlock-form" class="panel" novalidate>
          <label>Khóa bảo mật<input id="protected-key" type="password" autocomplete="one-time-code" placeholder="Nhập khóa Storage hoặc OTP admin" required /></label>
          <button class="button" type="submit">Mở ${title}</button>
          <p id="protected-note" class="note" aria-live="polite"></p>
        </form>
      </section>
    </main>
    <script>
      const form=document.getElementById('protected-unlock-form'),keyInput=document.getElementById('protected-key'),note=document.getElementById('protected-note');
      const setNote=(msg,err=false)=>{note.textContent=msg||'';note.classList.toggle('error',!!err)};
      form.addEventListener('submit',async e=>{e.preventDefault();setNote('Đang kiểm tra khóa...');let r,p;try{r=await fetch('/api/storage/unlock',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({key:keyInput.value||''})});p=await r.json()}catch(_error){setNote('Không gọi được API mở khóa. Hãy tải lại trang rồi thử lại.',true);return}if(!r.ok||!p||p.ok!==true){setNote('Khóa không đúng hoặc mã OTP đã hết hạn.',true);return}sessionStorage.setItem('sentinel_storage_token',p.storageToken||'');setNote('Đã mở khóa, đang tải trang...');window.location.reload();});
    </script>
  </body>
</html>`;

const renderAdminPage = () => `<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sentinel Shield Admin Dashboard</title>
    <meta name="robots" content="noindex,nofollow" />
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg" />
    <link rel="stylesheet" href="/assets/admin.css?v=20260719-pause-1" />
  </head>
  <body class="admin-body">
    <div class="admin-scene" aria-hidden="true">
      <span class="admin-scene-line admin-scene-a"></span>
      <span class="admin-scene-line admin-scene-b"></span>
      <span class="admin-scene-grid"></span>
    </div>
    <div class="admin-shell">
      <aside class="admin-sidebar" aria-label="Admin navigation">
        <div>
          <a class="admin-brand" href="/" aria-label="Sentinel Shield">
            <span class="admin-brand-mark"><span></span></span>
            <span>
              <strong>Sentinel Shield</strong>
              <small>DevSecOps Command</small>
            </span>
          </a>
          <nav class="admin-side-nav">
            <button class="admin-nav-item active" type="button" data-admin-view="overview">
              <span>01</span>
              T\u1ed5ng quan
            </button>
            <button class="admin-nav-item" type="button" data-admin-view="leads">
              <span>02</span>
              Qu\u1ea3n l\u00fd y\u00eau c\u1ea7u t\u01b0 v\u1ea5n
            </button>
            <button class="admin-nav-item" type="button" data-admin-view="maintenance">
              <span>03</span>
              B\u1ea3o tr\u00ec web
            </button>
            <button class="admin-nav-item" type="button" data-admin-view="storage">
              <span>04</span>
              Storage/NAS
            </button>
          </nav>
        </div>
        <button id="admin-logout-btn" type="button">\u0110\u0103ng xu\u1ea5t</button>
      </aside>

      <main class="admin-dashboard">
        <section class="admin-view active" id="admin-view-overview" data-admin-view-panel="overview">
          <header class="admin-topbar">
            <div>
              <p class="admin-eyebrow">Command overview</p>
              <h1>T\u1ed5ng quan v\u1eadn h\u00e0nh</h1>
              <p class="admin-topbar-copy">Theo d\u00f5i nhanh lead m\u1edbi, tr\u1ea1ng th\u00e1i x\u1eed l\u00fd v\u00e0 c\u00e1c t\u00e1c v\u1ee5 qu\u1ea3n tr\u1ecb quan tr\u1ecdng.</p>
            </div>
          </header>

          <section class="admin-stats" aria-label="T\u1ed5ng quan lead">
            <article>
              <span>T\u1ed5ng lead</span>
              <strong id="admin-stat-total">0</strong>
              <small>Theo b\u1ed9 l\u1ecdc hi\u1ec7n t\u1ea1i</small>
            </article>
            <article>
              <span>Lead m\u1edbi</span>
              <strong id="admin-stat-new">0</strong>
              <small>C\u1ea7n ph\u1ea3n h\u1ed3i</small>
            </article>
            <article>
              <span>\u0110\u00e3 x\u1eed l\u00fd</span>
              <strong id="admin-stat-processed">0</strong>
              <small>\u0110\u00e3 c\u1eadp nh\u1eadt tr\u1ea1ng th\u00e1i</small>
            </article>
          </section>

          <section class="admin-overview-grid">
            <article class="admin-panel">
              <p class="admin-eyebrow">Next actions</p>
              <h2>Vi\u1ec7c n\u00ean l\u00e0m</h2>
              <ul class="admin-check-list">
                <li>Ph\u1ea3n h\u1ed3i lead m\u1edbi trong khung SLA \u0111\u00e3 cam k\u1ebft.</li>
                <li>Xu\u1ea5t CSV khi c\u1ea7n b\u00e0n giao danh s\u00e1ch cho sales/ops.</li>
                <li>Ki\u1ec3m tra tr\u1ea1ng th\u00e1i web sau m\u1ed7i l\u1ea7n c\u1eadp nh\u1eadt n\u1ed9i dung.</li>
              </ul>
            </article>
            <article class="admin-panel">
              <p class="admin-eyebrow">Quick commands</p>
              <h2>Thao t\u00e1c nhanh</h2>
              <div class="admin-quick-actions">
                <button class="admin-secondary-btn" type="button" data-admin-view="leads">M\u1edf danh s\u00e1ch lead</button>
                <button class="admin-secondary-btn" type="button" data-admin-view="maintenance">Ki\u1ec3m tra b\u1ea3o tr\u00ec</button>
                <a class="admin-link-button" href="/" target="_blank" rel="noopener">Xem website</a>
                <button class="admin-secondary-btn" type="button" data-admin-view="storage">Mở Storage/NAS</button>
              </div>
            </article>
          </section>
        </section>

        <section class="admin-view" id="admin-view-leads" data-admin-view-panel="leads">
          <header class="admin-topbar">
            <div>
              <p class="admin-eyebrow">Lead operations</p>
              <h1>Qu\u1ea3n l\u00fd y\u00eau c\u1ea7u t\u01b0 v\u1ea5n</h1>
              <p class="admin-topbar-copy">Theo d\u00f5i lead m\u1edbi, l\u1ecdc theo tr\u1ea1ng th\u00e1i, xu\u1ea5t CSV v\u00e0 \u0111\u00e1nh d\u1ea5u ti\u1ebfn \u0111\u1ed9 x\u1eed l\u00fd.</p>
            </div>
          </header>

          <section class="admin-panel">
            <div class="admin-panel-head">
              <div>
                <p class="admin-eyebrow">Lead queue</p>
                <h2>Danh s\u00e1ch lead</h2>
              </div>
              <div class="admin-toolbar-actions">
                <button id="admin-export-btn" type="button">Xu\u1ea5t CSV</button>
                <button id="admin-refresh-btn" type="button">T\u1ea3i l\u1ea1i</button>
              </div>
            </div>

            <form id="admin-filter-form" class="admin-filter-grid">
              <label>
                Email
                <input id="admin-filter-email" name="email" type="search" placeholder="lead@company.com" />
              </label>
              <label>
                S\u1ed1 \u0111i\u1ec7n tho\u1ea1i
                <input id="admin-filter-phone" name="phone" type="search" placeholder="09xxxxxxxx" />
              </label>
              <label>
                Tr\u1ea1ng th\u00e1i
                <select id="admin-filter-status" name="status">
                  <option value="all">T\u1ea5t c\u1ea3</option>
                  <option value="new">M\u1edbi</option>
                  <option value="processed">\u0110\u00e3 x\u1eed l\u00fd</option>
                </select>
              </label>
              <label>
                T\u1eeb ng\u00e0y
                <input id="admin-filter-date-from" name="dateFrom" type="date" />
              </label>
              <label>
                \u0110\u1ebfn ng\u00e0y
                <input id="admin-filter-date-to" name="dateTo" type="date" />
              </label>
              <div class="admin-filter-actions">
                <button id="admin-filter-apply" type="submit">L\u1ecdc</button>
                <button id="admin-filter-clear" type="button" class="admin-secondary-btn">X\u00f3a l\u1ecdc</button>
              </div>
            </form>

            <p id="admin-dashboard-note" class="admin-note" aria-live="polite"></p>
            <div class="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Th\u1eddi gian</th>
                    <th>H\u1ecd t\u00ean</th>
                    <th>Email</th>
                    <th>S\u1ed1 \u0111i\u1ec7n tho\u1ea1i</th>
                    <th>Tr\u1ea1ng th\u00e1i</th>
                    <th>N\u1ed9i dung</th>
                    <th>T\u00e1c v\u1ee5</th>
                  </tr>
                </thead>
                <tbody id="admin-leads-body"></tbody>
              </table>
            </div>
          </section>
        </section>

        <section class="admin-view" id="admin-view-maintenance" data-admin-view-panel="maintenance">
          <header class="admin-topbar">
            <div>
              <p class="admin-eyebrow">Web maintenance</p>
              <h1>B\u1ea3o tr\u00ec web</h1>
              <p class="admin-topbar-copy">Ki\u1ec3m tra nhanh tr\u1ea1ng th\u00e1i website, API lead v\u00e0 c\u00e1c \u0111\u01b0\u1eddng d\u1eabn quan tr\u1ecdng sau khi c\u1eadp nh\u1eadt n\u1ed9i dung.</p>
            </div>
          </header>

          <section class="admin-maintenance-grid">
            <article class="admin-panel">
              <p class="admin-eyebrow">Service health</p>
              <h2>Tr\u1ea1ng th\u00e1i d\u1ecbch v\u1ee5</h2>
              <div class="admin-health-list">
                <p><span>Public website</span><strong id="admin-public-status">Ch\u01b0a ki\u1ec3m tra</strong></p>
                <p><span>Lead API</span><strong id="admin-api-status">Ch\u01b0a ki\u1ec3m tra</strong></p>
              </div>
              <button id="admin-health-check-btn" class="admin-health-check-btn" type="button">Ki\u1ec3m tra ngay</button>
              <p id="admin-maintenance-note" class="admin-note" aria-live="polite"></p>
            </article>
            <article class="admin-panel">
              <p class="admin-eyebrow">Maintenance mode</p>
              <h2>Ch\u1ebf \u0111\u1ed9 b\u1ea3o tr\u00ec</h2>
              <p class="admin-panel-copy">G\u1ea1t sang K\u00edch ho\u1ea1t l\u00e0 \u00e1p d\u1ee5ng ngay l\u1eadp t\u1ee9c, kh\u00f4ng ph\u1ee5 thu\u1ed9c v\u00e0o k\u1ebft qu\u1ea3 ki\u1ec3m tra d\u1ecbch v\u1ee5. Website public s\u1ebd hi\u1ec3n th\u1ecb th\u00f4ng b\u00e1o b\u1ea3o tr\u00ec, c\u00f2n admin, login v\u00e0 API v\u1eabn ho\u1ea1t \u0111\u1ed9ng \u0111\u1ec3 c\u00f3 th\u1ec3 t\u1eaft l\u1ea1i.</p>
              <label class="admin-switch-row" for="admin-maintenance-toggle">
                <span>
                  <strong id="admin-maintenance-state" class="admin-health-warn">Tr\u1ea1ng th\u00e1i: \u0110\u00f3ng</strong>
                  <small>G\u1ea1t sang ph\u1ea3i \u0111\u1ec3 k\u00edch ho\u1ea1t b\u1ea3o tr\u00ec</small>
                </span>
                <span class="admin-switch-control" aria-hidden="true">
                  <input id="admin-maintenance-toggle" type="checkbox" role="switch" />
                  <span class="admin-switch-track"><span class="admin-switch-thumb"></span></span>
                </span>
              </label>
              <p id="admin-maintenance-toggle-note" class="admin-note" aria-live="polite"></p>
            </article>
            <article class="admin-panel admin-panel-wide">
              <p class="admin-eyebrow">Maintenance media</p>
              <h2>Hi\u1ec3n th\u1ecb link v\u00e0 \u1ea3nh</h2>
              <p class="admin-panel-copy">C\u1ea5u h\u00ecnh logo, \u1ea3nh \u0111\u1ea1i di\u1ec7n v\u00e0 video/player nh\u00fang tr\u1ef1c ti\u1ebfp trong khung hi\u1ec3n th\u1ecb c\u1ee7a trang b\u1ea3o tr\u00ec.</p>
              <form id="admin-maintenance-media-form" class="admin-maintenance-form">
                <div class="admin-maintenance-form-grid">
                  <label>
                    <span>Logo URL</span>
                    <input id="admin-maintenance-logo-url" type="url" placeholder="https://example.com/logo.png" />
                  </label>
                  <label>
                    <span>YouTube</span>
                    <input id="admin-maintenance-youtube-url" type="url" placeholder="https://youtube.com/..." />
                  </label>
                  <label>
                    <span>SoundCloud</span>
                    <input id="admin-maintenance-soundcloud-url" type="url" placeholder="https://soundcloud.com/..." />
                  </label>
                  <label>
                    <span>Facebook</span>
                    <input id="admin-maintenance-facebook-url" type="url" placeholder="https://facebook.com/..." />
                  </label>
                </div>
                <label class="admin-file-picker" for="admin-maintenance-image-file">
                  <span>
                    <strong>\u1ea2nh hi\u1ec3n th\u1ecb</strong>
                    <small id="admin-maintenance-image-name">Ch\u01b0a ch\u1ecdn media. T\u1ed1i \u0111a 15 file \u1ea3nh/video, t\u1ed5ng 100MB.</small>
                  </span>
                  <input id="admin-maintenance-image-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/ogg" multiple />
                </label>
                <div id="admin-maintenance-media-preview" class="admin-maintenance-preview" hidden></div>
                <div class="admin-maintenance-actions">
                  <button id="admin-maintenance-media-save" class="admin-health-check-btn" type="submit">L\u01b0u hi\u1ec3n th\u1ecb</button>
                  <button id="admin-maintenance-image-remove" class="admin-secondary-btn" type="button">B\u1ecf \u1ea3nh</button>
                </div>
                <p id="admin-maintenance-media-note" class="admin-note" aria-live="polite"></p>
              </form>
            </article>
            <article class="admin-panel">
              <p class="admin-eyebrow">Quick links</p>
              <h2>\u0110\u01b0\u1eddng d\u1eabn nhanh</h2>
              <div class="admin-quick-actions">
                <a class="admin-link-button" href="/" target="_blank" rel="noopener">Trang ch\u1ee7</a>
                <a class="admin-link-button" href="/privacy-policy.html" target="_blank" rel="noopener">Privacy</a>
                <a class="admin-link-button" href="/terms.html" target="_blank" rel="noopener">Terms</a>
                <a class="admin-link-button" href="/cookie-policy.html" target="_blank" rel="noopener">Cookie</a>
              </div>
            </article>
          </section>
        </section>

        <section class="admin-view" id="admin-view-storage" data-admin-view-panel="storage">
          <header class="admin-topbar">
            <div>
              <p class="admin-eyebrow">Storage operations</p>
              <h1>Upload file Storage/NAS</h1>
              <p class="admin-topbar-copy">Upload file dung lượng lớn lên ổ lưu trữ riêng. Landing page không bị ảnh hưởng; người nhận file tải tại <strong>/storagesit</strong> sau khi nhập khóa bảo mật.</p>
            </div>
          </header>
          <section class="admin-stats" aria-label="Tổng quan storage">
            <article><span>Tổng file</span><strong id="admin-storage-stat-count">0</strong><small>Trong kho storage</small></article>
            <article><span>Dung lượng</span><strong id="admin-storage-stat-size">0 B</strong><small>Tổng file đã upload</small></article>
            <article><span>Còn trống</span><strong id="admin-storage-stat-free">-</strong><small>Ổ /var/lib/monitoring-lite</small></article>
          </section>
          <section class="admin-storage-grid">
            <article class="admin-panel">
              <p class="admin-eyebrow">Upload</p>
              <h2>Tải file lên kho</h2>
              <p class="admin-panel-copy">Chọn một hoặc nhiều file. Mỗi file được upload trực tiếp dạng stream, không base64. Nếu trùng tên hệ thống sẽ tự thêm hậu tố thời gian.</p>
              <form id="admin-storage-upload-form" class="admin-maintenance-form">
                <label class="admin-file-picker" for="admin-storage-file-input">
                  <span><strong>Chọn file upload</strong><small id="admin-storage-file-name">Chưa chọn file.</small></span>
                  <input id="admin-storage-file-input" type="file" multiple />
                </label>
                <div class="admin-maintenance-actions">
                  <button id="admin-storage-upload-btn" class="admin-health-check-btn" type="submit">Upload file</button>
                  <button id="admin-storage-pause-btn" class="admin-upload-pause-btn" type="button" hidden>Tạm dừng</button>
                  <a class="admin-link-button" href="/storagesit" target="_blank" rel="noopener">Mở /storagesit</a>
                </div>
                <div id="admin-storage-upload-progress" class="admin-upload-progress" hidden>
                  <div class="admin-upload-progress-head">
                    <span>Uploading</span>
                    <strong id="admin-storage-upload-progress-text">0%</strong>
                  </div>
                  <div class="admin-upload-progress-track" aria-hidden="true">
                    <span id="admin-storage-upload-progress-bar"></span>
                  </div>
                </div>
                <p id="admin-storage-upload-note" class="admin-note" aria-live="polite"></p>
              </form>
            </article>
            <article class="admin-panel">
              <p class="admin-eyebrow">Storage health</p>
              <h2>Trạng thái kho file</h2>
              <div class="admin-health-list">
                <p><span>Storage API</span><strong id="admin-storage-api-status">Chưa kiểm tra</strong></p>
                <p><span>Public link</span><strong>/storagesit</strong></p>
                <p><span>Giới hạn mỗi file</span><strong id="admin-storage-max-upload">-</strong></p>
              </div>
              <button id="admin-storage-refresh-btn" class="admin-health-check-btn" type="button">Tải lại danh sách</button>
              <p id="admin-storage-note" class="admin-note" aria-live="polite"></p>
            </article>
            <article class="admin-panel admin-panel-wide">
              <div class="admin-panel-head"><div><p class="admin-eyebrow">File repository</p><h2>Danh sách file storage</h2></div></div>
              <div class="admin-storage-toolbar"><input id="admin-storage-search" type="search" placeholder="Tìm file..." /></div>
              <div class="admin-table-wrap"><table><thead><tr><th>Tên file</th><th>Dung lượng</th><th>Cập nhật</th><th>Thư mục</th><th>Tác vụ</th></tr></thead><tbody id="admin-storage-files-body"><tr><td colspan="5" class="admin-cell-message">Chưa tải danh sách file.</td></tr></tbody></table></div>
            </article>
            <article class="admin-panel admin-panel-wide">
              <div class="admin-panel-head"><div><p class="admin-eyebrow">Folder map</p><h2>Thư mục file</h2><p class="admin-panel-copy">Tạo thư mục logic và gán file vào thư mục trong bảng danh sách file phía trên.</p></div></div>
              <form id="admin-storage-folder-form" class="admin-storage-folder-form">
                <input id="admin-storage-folder-name" type="text" maxlength="80" placeholder="Tên thư mục mới" />
                <button class="admin-health-check-btn" type="submit">Tạo thư mục</button>
              </form>
              <div class="admin-table-wrap"><table><thead><tr><th>Thư mục</th><th>Số file</th><th>Dung lượng</th><th>Tác vụ</th></tr></thead><tbody id="admin-storage-folders-body"><tr><td colspan="4" class="admin-cell-message">Chưa có thư mục.</td></tr></tbody></table></div>
            </article>
          </section>
        </section>
      </main>
    </div>
    <script src="/assets/admin-dashboard.js?v=20260719-pause-1" defer></script>
  </body>
</html>
`;

const buildConfig = (env = process.env) => ({
  environment: String(env.NODE_ENV || "development").toLowerCase(),
  strictStartup: toBoolean(
    env.LEAD_STRICT_STARTUP,
    String(env.NODE_ENV || "").toLowerCase() === "production"
  ),
  port: toPositiveInt(env.LEAD_API_PORT, 8787),
  bindAddress: env.LEAD_API_BIND || "127.0.0.1",
  socketPath: String(env.LEAD_API_SOCKET || "").trim(),
  maxBodyBytes: toPositiveInt(env.LEAD_MAX_BODY_BYTES, 16 * 1024),
  rateWindowMs: toPositiveInt(env.LEAD_RATE_WINDOW_MS, 10 * 60 * 1000),
  rateLimitCount: toPositiveInt(env.LEAD_RATE_LIMIT_COUNT, 20),
  rateMaxEntries: toPositiveInt(env.LEAD_RATE_MAX_ENTRIES, 10000),
  blockForMs: toPositiveInt(env.LEAD_BLOCK_FOR_MS, 10 * 60 * 1000),
  requestTimeoutMs: toPositiveInt(env.LEAD_REQUEST_TIMEOUT_MS, 15 * 1000),
  headersTimeoutMs: toPositiveInt(env.LEAD_HEADERS_TIMEOUT_MS, 12 * 1000),
  keepAliveTimeoutMs: toPositiveInt(env.LEAD_KEEPALIVE_TIMEOUT_MS, 5 * 1000),
  maxConnections: toPositiveInt(env.LEAD_MAX_CONNECTIONS, 1024),
  outboundTimeoutMs: toPositiveInt(env.LEAD_OUTBOUND_TIMEOUT_MS, 6000),
  maxSourceUrlLength: toPositiveInt(env.LEAD_MAX_SOURCE_URL_LENGTH, DEFAULT_MAX_SOURCE_URL_LENGTH),
  expectedJsonKeys: new Set(DEFAULT_EXPECTED_KEYS),
  allowedSecFetchSite: new Set(DEFAULT_ALLOWED_SEC_FETCH_SITE),
  leadForwardEndpoint: env.LEAD_FORWARD_ENDPOINT || DEFAULT_LEAD_FORWARD_ENDPOINT,
  allowedOrigins: parseCsv(env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(",")),
  blockedIps: normalizeIpSet(parseCsv(env.BLOCKED_IPS || "")),
  trustedProxyIps: normalizeIpSet(parseCsv(env.TRUSTED_PROXY_IPS || DEFAULT_TRUSTED_PROXY_IPS.join(","))),
  allowProxyXff: toBoolean(env.TRUST_PROXY_X_FORWARDED_FOR, false),
  adminEmail: normalizeEnvSecret(env.ADMIN_EMAIL, "").toLowerCase(),
  adminPasswordHash: normalizeEnvSecret(env.ADMIN_PASSWORD_HASH, ""),
  adminPassword: normalizeEnvSecret(env.ADMIN_PASSWORD, ""),
  adminTotpSecret: normalizeEnvSecret(env.ADMIN_TOTP_SECRET, ""),
  adminMfaChallengeTtlMs: toPositiveInt(
    env.ADMIN_MFA_CHALLENGE_TTL_MS,
    DEFAULT_ADMIN_MFA_CHALLENGE_TTL_MS
  ),
  adminMfaChallengeMaxAttempts: toPositiveInt(
    env.ADMIN_MFA_CHALLENGE_MAX_ATTEMPTS,
    DEFAULT_ADMIN_MFA_CHALLENGE_MAX_ATTEMPTS
  ),
  adminCookieName: String(env.ADMIN_COOKIE_NAME || DEFAULT_ADMIN_COOKIE_NAME).trim(),
  adminCookieSecure: toBoolean(
    env.ADMIN_COOKIE_SECURE,
    String(env.NODE_ENV || "").toLowerCase() === "production"
  ),
  adminSessionTtlMs: toPositiveInt(env.ADMIN_SESSION_TTL_MS, DEFAULT_ADMIN_SESSION_TTL_MS),
  adminSessionMaxEntries: toPositiveInt(env.ADMIN_SESSION_MAX_ENTRIES, 1000),
  adminLoginRateWindowMs: toPositiveInt(
    env.ADMIN_LOGIN_RATE_WINDOW_MS,
    DEFAULT_ADMIN_LOGIN_RATE_WINDOW_MS
  ),
  adminLoginRateLimitCount: toPositiveInt(
    env.ADMIN_LOGIN_RATE_LIMIT_COUNT,
    DEFAULT_ADMIN_LOGIN_RATE_LIMIT_COUNT
  ),
  leadStoragePath: String(env.LEAD_STORAGE_PATH || DEFAULT_LEAD_STORAGE_PATH),
  maintenanceFlagPath: String(env.MAINTENANCE_FLAG_PATH || DEFAULT_MAINTENANCE_FLAG_PATH),
  maintenanceConfigPath: String(env.MAINTENANCE_CONFIG_PATH || DEFAULT_MAINTENANCE_CONFIG_PATH),
  storageDir: String(env.STORAGE_SITE_DIR || DEFAULT_STORAGE_DIR),
  storageAccessKey: normalizeEnvSecret(env.STORAGE_ACCESS_KEY, ""),
  storageCookieName: String(env.STORAGE_COOKIE_NAME || DEFAULT_STORAGE_COOKIE_NAME).trim(),
  storageSessionTtlMs: toPositiveInt(env.STORAGE_SESSION_TTL_MS, DEFAULT_STORAGE_SESSION_TTL_MS),
  storageMaxUploadBytes: toPositiveInt(env.STORAGE_MAX_UPLOAD_BYTES, DEFAULT_STORAGE_MAX_UPLOAD_BYTES),
  storageDownloadLockPath: env.STORAGE_DOWNLOAD_LOCK_PATH || DEFAULT_STORAGE_DOWNLOAD_LOCK_PATH,
  storageFoldersPath: env.STORAGE_FOLDERS_PATH || DEFAULT_STORAGE_FOLDERS_PATH,
  storageUploadTimeoutMs: toPositiveInt(env.STORAGE_UPLOAD_TIMEOUT_MS, DEFAULT_STORAGE_UPLOAD_TIMEOUT_MS),
  adminMaxLeads: toPositiveInt(env.ADMIN_MAX_LEADS, DEFAULT_ADMIN_MAX_LEADS),
});

const validateConfig = (config) => {
  const errors = [];
  const warnings = [];
  const strictStartup = toBoolean(config.strictStartup, false);

  const forwardUrl = parseUrlSafe(config.leadForwardEndpoint);
  const allowedOrigins = Array.isArray(config.allowedOrigins) ? config.allowedOrigins : [];

  if (!forwardUrl) {
    errors.push("LEAD_FORWARD_ENDPOINT must be a valid URL.");
  } else if (forwardUrl.protocol !== "https:") {
    errors.push("LEAD_FORWARD_ENDPOINT must use HTTPS.");
  }

  if (config.allowProxyXff) {
    warnings.push(
      "TRUST_PROXY_X_FORWARDED_FOR=true increases IP spoofing risk if proxy chain is misconfigured."
    );
  }

  if (!config.adminCookieName || !/^[A-Za-z0-9_-]{8,64}$/.test(config.adminCookieName)) {
    errors.push("ADMIN_COOKIE_NAME must be 8-64 chars and contain only A-Z, a-z, 0-9, _ or -.");
  }

  if (!isValidSimpleEmail(config.adminEmail)) {
    errors.push("ADMIN_EMAIL must be a valid email.");
  }

  const adminPassword = String(config.adminPassword || "");
  const adminPasswordHash = String(config.adminPasswordHash || "").trim();
  const hasPlainAdminPassword = adminPassword.length > 0;
  const hasHashedAdminPassword = adminPasswordHash.length > 0;
  const parsedPasswordHash = hasHashedAdminPassword ? parseScryptPasswordHash(adminPasswordHash) : null;

  if (!hasPlainAdminPassword && !hasHashedAdminPassword) {
    errors.push("Set ADMIN_PASSWORD_HASH (recommended) or ADMIN_PASSWORD.");
  }

  if (hasPlainAdminPassword && adminPassword.length < 12) {
    errors.push("ADMIN_PASSWORD must be at least 12 characters.");
  }

  if (hasHashedAdminPassword && !parsedPasswordHash) {
    errors.push("ADMIN_PASSWORD_HASH must use format scrypt$N$r$p$saltHex$hashHex.");
  }

  if (hasHashedAdminPassword && hasPlainAdminPassword) {
    warnings.push("ADMIN_PASSWORD is ignored because ADMIN_PASSWORD_HASH is configured.");
  }

  const adminTotpSecret = String(config.adminTotpSecret || "").trim();
  const parsedAdminTotpSecret = adminTotpSecret ? decodeBase32Secret(adminTotpSecret) : null;
  if (!adminTotpSecret) {
    errors.push("ADMIN_TOTP_SECRET is required.");
  } else if (!parsedAdminTotpSecret) {
    errors.push("ADMIN_TOTP_SECRET must be a valid base32 secret.");
  }

  if (config.socketPath && !pathModule.isAbsolute(config.socketPath)) {
    errors.push("LEAD_API_SOCKET must be an absolute path.");
  }

  if (strictStartup) {
    if (allowedOrigins.length === 0) {
      errors.push("ALLOWED_ORIGINS must not be empty in strict startup mode.");
    }

    const invalidOrigins = allowedOrigins.filter((origin) => !parseUrlSafe(origin));
    if (invalidOrigins.length > 0) {
      errors.push(`ALLOWED_ORIGINS contains invalid URLs: ${invalidOrigins.join(", ")}`);
    }

    const nonHttpsOrigins = allowedOrigins.filter((origin) => {
      const parsed = parseUrlSafe(origin);
      return parsed && parsed.protocol !== "https:";
    });
    if (nonHttpsOrigins.length > 0) {
      errors.push(`ALLOWED_ORIGINS must be HTTPS in strict startup mode: ${nonHttpsOrigins.join(", ")}`);
    }

    const localOrigins = allowedOrigins.filter((origin) => {
      const parsed = parseUrlSafe(origin);
      return parsed && isLoopbackHostname(parsed.hostname);
    });
    if (localOrigins.length > 0) {
      errors.push(`ALLOWED_ORIGINS must not include local hosts in strict startup mode: ${localOrigins.join(", ")}`);
    }

    if (!(config.trustedProxyIps instanceof Set) || config.trustedProxyIps.size === 0) {
      errors.push("TRUSTED_PROXY_IPS must not be empty in strict startup mode.");
    }

    if (!hasHashedAdminPassword) {
      errors.push("ADMIN_PASSWORD_HASH is required in strict startup mode.");
    } else if (isLikelyPlaceholder(adminPasswordHash)) {
      errors.push("ADMIN_PASSWORD_HASH is missing or still uses a placeholder.");
    }

    if (isLikelyPlaceholder(adminTotpSecret)) {
      errors.push("ADMIN_TOTP_SECRET is missing or still uses a placeholder.");
    }
  }

  return {
    ok: errors.length === 0,
    strictStartup,
    errors,
    warnings,
  };
};

const parseRequestUrl = (requestUrl) => {
  try {
    return new URL(String(requestUrl || "/"), "http://lead-api.local");
  } catch (_error) {
    return new URL("http://lead-api.local/");
  }
};

const readJsonBody = (req, maxBodyBytes) =>
  new Promise((resolve, reject) => {
    let totalBytes = 0;
    let chunks = "";

    req.on("data", (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBodyBytes) {
        reject(new Error("payload_too_large"));
        req.destroy();
        return;
      }
      chunks += chunk.toString("utf8");
    });

    req.on("end", () => {
      try {
        resolve(JSON.parse(chunks || "{}"));
      } catch (_error) {
        reject(new Error("invalid_json"));
      }
    });

    req.on("error", () => reject(new Error("request_stream_error")));
  });

const normalizeMaintenanceUrl = (value) => {
  const input = String(value || "").trim();
  if (!input) {
    return "";
  }
  if (input.length > 700) {
    throw new Error("url_too_long");
  }
  let parsed;
  try {
    parsed = new URL(input);
  } catch (_error) {
    throw new Error("invalid_url");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("invalid_url_protocol");
  }
  return parsed.toString();
};

const normalizeMaintenanceConfig = (body, existing = {}) => ({
  logoUrl: normalizeMaintenanceUrl(body.logoUrl),
  youtubeUrl: normalizeMaintenanceUrl(body.youtubeUrl),
  soundcloudUrl: normalizeMaintenanceUrl(body.soundcloudUrl),
  facebookUrl: normalizeMaintenanceUrl(body.facebookUrl),
  imageUrl: String(existing.imageUrl || "").trim(),
  mediaItems: Array.isArray(existing.mediaItems)
    ? existing.mediaItems
        .map((item) => ({
          url: String(item && item.url ? item.url : "").trim(),
          type: item && item.type === "video" ? "video" : "image",
        }))
        .filter((item) => item.url)
        .slice(0, MAX_MAINTENANCE_IMAGE_COUNT)
    : [],
  imageUrls: Array.isArray(existing.imageUrls)
    ? existing.imageUrls.map((item) => String(item || "").trim()).filter(Boolean).slice(0, MAX_MAINTENANCE_IMAGE_COUNT)
    : String(existing.imageUrl || "").trim()
      ? [String(existing.imageUrl || "").trim()]
      : [],
  updatedAt: new Date().toISOString(),
});

const parseMaintenanceMediaDataUrl = (value) => {
  const input = String(value || "").trim();
  if (!input) {
    return null;
  }
  const match = input.match(/^data:(image\/(png|jpeg|webp|gif)|video\/(mp4|webm|ogg));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    throw new Error("invalid_media_data");
  }
  const mimeType = match[1];
  const type = mimeType.startsWith("video/") ? "video" : "image";
  const rawExtension = match[2] || match[3];
  const extension = rawExtension === "jpeg" ? "jpg" : rawExtension;
  const buffer = Buffer.from(match[4], "base64");
  if (buffer.length <= 0 || buffer.length > MAX_MAINTENANCE_MEDIA_BYTES) {
    throw new Error("media_too_large");
  }
  return { extension, buffer, type, mimeType };
};

const parseMaintenanceMediaDataUrls = (value) => {
  const items = Array.isArray(value)
    ? value
    : String(value || "").trim()
      ? [value]
      : [];
  if (items.length > MAX_MAINTENANCE_IMAGE_COUNT) {
    throw new Error("too_many_images");
  }
  const parsedMedia = items.map(parseMaintenanceMediaDataUrl).filter(Boolean);
  const totalBytes = parsedMedia.reduce((sum, item) => sum + item.buffer.length, 0);
  if (totalBytes > MAX_MAINTENANCE_MEDIA_TOTAL_BYTES) {
    throw new Error("media_total_too_large");
  }
  return parsedMedia;
};

const readJsonFileSafe = async (filePath, fallback = {}) => {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
};

const sanitizeStorageFileName = (value) => {
  const input = String(value || "").normalize("NFKC").trim();
  const withoutPath = input.split(/[\\/]+/).filter(Boolean).pop() || "";
  const cleaned = withoutPath
    .replace(/[\u0000-\u001f\u007f<>:"|?*]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^\.+/, "")
    .trim()
    .slice(0, MAX_STORAGE_FILE_NAME_LENGTH);
  return cleaned || `file-${Date.now()}`;
};

const resolveStoragePath = (storageDir, fileName) => {
  const root = pathModule.resolve(storageDir);
  const safeName = sanitizeStorageFileName(fileName);
  const resolved = pathModule.resolve(root, safeName);
  if (resolved !== pathModule.join(root, safeName)) {
    return null;
  }
  return { root, safeName, filePath: resolved };
};

const getUniqueStoragePath = async (storageDir, fileName) => {
  const parsed = resolveStoragePath(storageDir, fileName);
  if (!parsed) {
    throw new Error("invalid_file_name");
  }
  let candidate = parsed;
  let exists = await fileExists(candidate.filePath);
  if (!exists) {
    return candidate;
  }
  const ext = pathModule.extname(parsed.safeName);
  const base = pathModule.basename(parsed.safeName, ext).slice(0, 120) || "file";
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  for (let index = 1; index <= 50; index += 1) {
    const nextName = `${base}-${stamp}${index > 1 ? `-${index}` : ""}${ext}`;
    candidate = resolveStoragePath(storageDir, nextName);
    exists = candidate ? await fileExists(candidate.filePath) : true;
    if (!exists) {
      return candidate;
    }
  }
  throw new Error("file_name_conflict");
};

const listStorageFiles = async (storageDir) => {
  await fs.mkdir(storageDir, { recursive: true, mode: 0o750 });
  const entries = await fs.readdir(storageDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile() || entry.name.startsWith(".")) {
      continue;
    }
    const parsed = resolveStoragePath(storageDir, entry.name);
    if (!parsed) {
      continue;
    }
    const stat = await fs.stat(parsed.filePath).catch(() => null);
    if (!stat || !stat.isFile()) {
      continue;
    }
    files.push({
      id: encodeURIComponent(entry.name),
      name: entry.name,
      size: stat.size,
      type: pathModule.extname(entry.name).replace(/^\./, "").toLowerCase() || "file",
      modifiedAt: stat.mtime.toISOString(),
      downloadUrl: `/api/storage/download/${encodeURIComponent(entry.name)}`,
    });
  }
  files.sort((a, b) => String(b.modifiedAt).localeCompare(String(a.modifiedAt)));
  return {
    files,
    totalBytes: files.reduce((sum, item) => sum + item.size, 0),
  };
};

const getFilesystemStats = async (storageDir) =>
  new Promise((resolve) => {
    childProcess.execFile("df", ["-B1", "--output=size,avail", storageDir], { timeout: 5000 }, (error, stdout) => {
      if (error) {
        resolve({ sizeBytes: 0, freeBytes: 0 });
        return;
      }
      const line = String(stdout || "").trim().split(/\n+/).slice(-1)[0] || "";
      const parts = line.trim().split(/\s+/).map((item) => Number(item));
      resolve({
        sizeBytes: Number.isFinite(parts[0]) ? parts[0] : 0,
        freeBytes: Number.isFinite(parts[1]) ? parts[1] : 0,
      });
    });
  });

const readRawUploadToFile = (req, targetPath, maxBytes, timeoutMs) =>
  new Promise((resolve, reject) => {
    let totalBytes = 0;
    let settled = false;
    const tmpPath = `${targetPath}.upload-${crypto.randomBytes(8).toString("hex")}`;
    const output = fsSync.createWriteStream(tmpPath, { mode: 0o640, flags: "wx" });
    const cleanup = () => {
      output.destroy();
      fs.unlink(tmpPath).catch(() => {});
    };
    const fail = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    };
    req.setTimeout(timeoutMs, () => fail(new Error("upload_timeout")));
    req.on("data", (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        fail(new Error("payload_too_large"));
        req.destroy();
        return;
      }
      if (!output.write(chunk)) {
        req.pause();
      }
    });
    output.on("drain", () => req.resume());
    req.on("end", () => {
      if (settled) {
        return;
      }
      output.end(async () => {
        if (settled) {
          return;
        }
        try {
          await fs.rename(tmpPath, targetPath);
          settled = true;
          resolve({ bytes: totalBytes });
        } catch (error) {
          fail(error);
        }
      });
    });
    req.on("error", () => fail(new Error("request_stream_error")));
    output.on("error", fail);
  });

const readRawRequestToFile = (req, targetPath, maxBytes, timeoutMs, flags = "wx") =>
  new Promise((resolve, reject) => {
    let totalBytes = 0;
    let settled = false;
    const output = fsSync.createWriteStream(targetPath, { mode: 0o640, flags });
    const fail = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      output.destroy();
      reject(error);
    };
    req.setTimeout(timeoutMs, () => fail(new Error("upload_timeout")));
    req.on("data", (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        fail(new Error("payload_too_large"));
        req.destroy();
        return;
      }
      if (!output.write(chunk)) {
        req.pause();
      }
    });
    output.on("drain", () => req.resume());
    req.on("end", () => {
      if (settled) {
        return;
      }
      output.end(() => {
        if (settled) {
          return;
        }
        settled = true;
        resolve({ bytes: totalBytes });
      });
    });
    req.on("error", () => fail(new Error("request_stream_error")));
    output.on("error", fail);
  });

const sanitizeUploadId = (value) => String(value || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);

const getStorageUploadStatePath = (storageDir, uploadId) =>
  pathModule.join(storageDir, ".uploads", `${uploadId}.json`);

const readStorageUploadState = async (storageDir, uploadId) => {
  const statePath = getStorageUploadStatePath(storageDir, uploadId);
  return readJsonFileSafe(statePath, null);
};

const writeStorageUploadState = async (storageDir, uploadId, state) => {
  const stateDir = pathModule.join(storageDir, ".uploads");
  await fs.mkdir(stateDir, { recursive: true, mode: 0o750 });
  await fs.writeFile(getStorageUploadStatePath(storageDir, uploadId), JSON.stringify(state, null, 2), { mode: 0o640 });
};

const removeStorageUploadState = async (storageDir, uploadId) => {
  await fs.unlink(getStorageUploadStatePath(storageDir, uploadId)).catch((error) => {
    if (!error || error.code !== "ENOENT") {
      throw error;
    }
  });
};

const sendFileDownload = (res, filePath, fileName, stat) => {
  res.writeHead(200, {
    ...securityHeaders,
    "Content-Type": "application/octet-stream",
    "Content-Length": String(stat.size),
    "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    "Cache-Control": "private, no-store",
  });
  fsSync.createReadStream(filePath).pipe(res);
};

const forwardLead = async ({ lead, config, fetchImpl }) => {
  if (typeof fetchImpl !== "function") {
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.outboundTimeoutMs);
  try {
    const response = await fetchImpl(config.leadForwardEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        name: lead.name,
        email: lead.email,
        phone: lead.phone || "",
        message: lead.message,
        language: lead.language,
        source_url: lead.sourceUrl,
        _subject:
          lead.language === "en"
            ? "New Infrastructure Security Lead (EN)"
            : "Lead moi - Tu van bao mat ha tang (VI)",
        _template: "table",
        _replyto: lead.email,
      }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    return response.ok && (payload.success === "true" || payload.ok === true || !payload.error);
  } catch (_error) {
    return false;
  } finally {
    clearTimeout(timeout);
  }
};

const createLeadServer = ({
  config = buildConfig(),
  logger = createAuditLogger({ service: "lead-api" }),
  fetchImpl = globalThis.fetch,
  forwardLeadFn,
  nowFn = Date.now,
  requestIdFn = () => crypto.randomUUID(),
  leadStore,
  sessionStore,
} = {}) => {
  const requestTimeoutMs = toPositiveInt(config.requestTimeoutMs, 15 * 1000);
  const keepAliveTimeoutMs = toPositiveInt(config.keepAliveTimeoutMs, 5 * 1000);
  const headersTimeoutMs = Math.max(
    toPositiveInt(config.headersTimeoutMs, 12 * 1000),
    keepAliveTimeoutMs + 1000
  );
  const maxConnections = toPositiveInt(config.maxConnections, 1024);
  const maxAdminLeads = toPositiveInt(config.adminMaxLeads, DEFAULT_ADMIN_MAX_LEADS);
  const adminSessionTtlSec = Math.ceil(toPositiveInt(config.adminSessionTtlMs, DEFAULT_ADMIN_SESSION_TTL_MS) / 1000);
  const adminTotpSecretBytes = decodeBase32Secret(config.adminTotpSecret);
  const adminMfaChallengeTtlMs = toPositiveInt(
    config.adminMfaChallengeTtlMs,
    DEFAULT_ADMIN_MFA_CHALLENGE_TTL_MS
  );
  const adminMfaChallengeMaxAttempts = toPositiveInt(
    config.adminMfaChallengeMaxAttempts,
    DEFAULT_ADMIN_MFA_CHALLENGE_MAX_ATTEMPTS
  );
  const pendingMfaChallenges = new Map();

  const leadRateLimiter = new InMemoryRateLimiter({
    windowMs: config.rateWindowMs,
    maxCount: config.rateLimitCount,
    blockMs: config.blockForMs,
    maxEntries: config.rateMaxEntries,
    nowFn,
  });
  const adminLoginRateLimiter = new InMemoryRateLimiter({
    windowMs: config.adminLoginRateWindowMs,
    maxCount: config.adminLoginRateLimitCount,
    blockMs: config.blockForMs,
    maxEntries: config.rateMaxEntries,
    nowFn,
  });
  const activeLeadStore =
    leadStore ||
    createFileLeadStore({
      filePath: config.leadStoragePath || DEFAULT_LEAD_STORAGE_PATH,
      maxList: maxAdminLeads,
    });
  const activeSessionStore =
    sessionStore ||
    createSessionStore({
      ttlMs: config.adminSessionTtlMs,
      maxSessions: config.adminSessionMaxEntries,
      nowFn,
    });
  const activeStorageSessionStore = createSessionStore({
    ttlMs: config.storageSessionTtlMs,
    maxSessions: 500,
    nowFn,
  });
  const storageSessionTtlSec = Math.ceil(toPositiveInt(config.storageSessionTtlMs, DEFAULT_STORAGE_SESSION_TTL_MS) / 1000);

  const prunePendingMfaChallenges = () => {
    const now = nowFn();
    for (const [token, challenge] of pendingMfaChallenges.entries()) {
      if (!challenge || challenge.expiresAt <= now) {
        pendingMfaChallenges.delete(token);
      }
    }
  };

  const createPendingMfaChallenge = ({ email, clientIp }) => {
    prunePendingMfaChallenges();
    const token = crypto.randomBytes(24).toString("hex");
    const now = nowFn();
    pendingMfaChallenges.set(token, {
      token,
      email: String(email || "").trim().toLowerCase(),
      clientIp: String(clientIp || "").trim(),
      attempts: 0,
      createdAt: now,
      expiresAt: now + adminMfaChallengeTtlMs,
    });
    return {
      token,
      expiresInSeconds: Math.max(1, Math.ceil(adminMfaChallengeTtlMs / 1000)),
    };
  };

  const getPendingMfaChallenge = (token) => {
    prunePendingMfaChallenges();
    const challenge = pendingMfaChallenges.get(String(token || "").trim());
    if (!challenge) {
      return null;
    }
    if (challenge.expiresAt <= nowFn()) {
      pendingMfaChallenges.delete(challenge.token);
      return null;
    }
    return challenge;
  };

  const runForwardLead =
    forwardLeadFn ||
    ((params) =>
      forwardLead({
        ...params,
        config,
        fetchImpl,
      }));

  const getAuthContext = (req) => {
    const token = getSessionTokenFromRequest(req, config.adminCookieName);
    const session = activeSessionStore.get(token);
    return {
      token,
      session,
    };
  };

  const getStorageAuthContext = (req, requestUrl = null) => {
    const cookieToken = getSessionTokenFromRequest(req, config.storageCookieName);
    const headerToken = String(req.headers["x-storage-token"] || "").trim();
    const authHeader = String(req.headers.authorization || "").trim();
    const bearerToken = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
    const queryToken = requestUrl ? String(requestUrl.searchParams.get("storageToken") || "").trim() : "";
    const token = cookieToken || headerToken || bearerToken || queryToken;
    const session = activeStorageSessionStore.get(token);
    return { token, session };
  };

  const validateStorageAccessKey = (value) => {
    const key = String(value || "").trim();
    if (!key) {
      return false;
    }
    const configuredStorageKey = String(config.storageAccessKey || "").trim();
    if (configuredStorageKey && constantTimeEquals(key, configuredStorageKey)) {
      return true;
    }
    if (adminTotpSecretBytes && verifyTotpCode({ secretBytes: adminTotpSecretBytes, totpCode: key, nowMs: nowFn() })) {
      return true;
    }
    return false;
  };

  const getStoragePayload = async () => {
    const storageDir = pathModule.resolve(config.storageDir || DEFAULT_STORAGE_DIR);
    await fs.mkdir(storageDir, { recursive: true, mode: 0o750 });
    const listed = await listStorageFiles(storageDir);
    const disk = await getFilesystemStats(storageDir);
    return {
      ...listed,
      storageDir,
      disk,
      maxUploadBytes: config.storageMaxUploadBytes,
    };
  };

  const hasAllowedRequestOrigin = (req) => {
    const origin = String(req.headers.origin || "");
    const referer = String(req.headers.referer || "");
    const sameOrigin = isSameOriginRequest(req, origin, referer);
    const hasAllowedOrigin = allowedOrigin(origin, config.allowedOrigins);
    const hasAllowedReferer = allowedReferer(referer, config.allowedOrigins);
    return {
      ok: sameOrigin || hasAllowedOrigin || hasAllowedReferer,
      origin,
      referer,
    };
  };

  const getMaintenanceStatus = async () => ({
    enabled: await fileExists(config.maintenanceFlagPath || DEFAULT_MAINTENANCE_FLAG_PATH),
  });

  const setMaintenanceStatus = async (enabled) => {
    const flagPath = config.maintenanceFlagPath || DEFAULT_MAINTENANCE_FLAG_PATH;
    if (enabled) {
      await fs.mkdir(pathModule.dirname(flagPath), { recursive: true });
      await fs.writeFile(
        flagPath,
        JSON.stringify({ enabled: true, updatedAt: new Date(nowFn()).toISOString() }, null, 2),
        { mode: 0o640 }
      );
      return { enabled: true };
    }
    try {
      await fs.unlink(flagPath);
    } catch (error) {
      if (!error || error.code !== "ENOENT") {
        throw error;
      }
    }
    return { enabled: false };
  };


  const getStorageDownloadLockStore = async () => {
    const lockPath = config.storageDownloadLockPath || DEFAULT_STORAGE_DOWNLOAD_LOCK_PATH;
    const parsed = await readJsonFileSafe(lockPath, { files: [] });
    const files = Array.isArray(parsed.files) ? parsed.files.map((item) => sanitizeStorageFileName(item)).filter(Boolean) : [];
    return new Set(files);
  };

  const writeStorageDownloadLockStore = async (lockedFiles) => {
    const lockPath = config.storageDownloadLockPath || DEFAULT_STORAGE_DOWNLOAD_LOCK_PATH;
    await fs.mkdir(pathModule.dirname(lockPath), { recursive: true });
    const files = Array.from(lockedFiles).map((item) => sanitizeStorageFileName(item)).filter(Boolean).sort();
    await fs.writeFile(lockPath, JSON.stringify({ files, updatedAt: new Date(nowFn()).toISOString() }, null, 2), { mode: 0o640 });
    return new Set(files);
  };

  const decorateStorageFilesWithLocks = (files, lockedFiles) =>
    files.map((file) => ({ ...file, downloadLocked: lockedFiles.has(file.name) }));

  const setStorageFileDownloadLockStatus = async (fileName, enabled) => {
    const safeName = sanitizeStorageFileName(fileName);
    const lockedFiles = await getStorageDownloadLockStore();
    if (enabled) {
      lockedFiles.add(safeName);
    } else {
      lockedFiles.delete(safeName);
    }
    await writeStorageDownloadLockStore(lockedFiles);
    return { fileName: safeName, enabled: lockedFiles.has(safeName) };
  };


  const sanitizeStorageFolderName = (value) =>
    String(value || "")
      .normalize("NFKC")
      .replace(/[<>:"|?*\/ -]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);

  const sanitizeStorageFolderId = (value) => String(value || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);

  const readStorageFolderStore = async () => {
    const storePath = config.storageFoldersPath || DEFAULT_STORAGE_FOLDERS_PATH;
    const parsed = await readJsonFileSafe(storePath, { folders: [], assignments: {} });
    const folders = Array.isArray(parsed.folders)
      ? parsed.folders
          .map((folder) => ({ id: sanitizeStorageFolderId(folder && folder.id), name: sanitizeStorageFolderName(folder && folder.name) }))
          .filter((folder) => folder.id && folder.name)
      : [];
    const validIds = new Set(folders.map((folder) => folder.id));
    const assignments = {};
    if (parsed.assignments && typeof parsed.assignments === "object" && !Array.isArray(parsed.assignments)) {
      for (const [rawFileName, rawFolderId] of Object.entries(parsed.assignments)) {
        const fileName = sanitizeStorageFileName(rawFileName);
        const folderId = sanitizeStorageFolderId(rawFolderId);
        if (fileName && validIds.has(folderId)) {
          assignments[fileName] = folderId;
        }
      }
    }
    return { folders, assignments };
  };

  const writeStorageFolderStore = async (store) => {
    const storePath = config.storageFoldersPath || DEFAULT_STORAGE_FOLDERS_PATH;
    await fs.mkdir(pathModule.dirname(storePath), { recursive: true });
    const folders = Array.isArray(store.folders) ? store.folders : [];
    const validIds = new Set(folders.map((folder) => folder.id));
    const assignments = {};
    for (const [rawFileName, rawFolderId] of Object.entries(store.assignments || {})) {
      const fileName = sanitizeStorageFileName(rawFileName);
      const folderId = sanitizeStorageFolderId(rawFolderId);
      if (fileName && validIds.has(folderId)) {
        assignments[fileName] = folderId;
      }
    }
    await fs.writeFile(storePath, JSON.stringify({ folders, assignments, updatedAt: new Date(nowFn()).toISOString() }, null, 2), { mode: 0o640 });
    return { folders, assignments };
  };

  const decorateStorageFilesWithFolders = (files, folderStore) => {
    const folderMap = new Map((folderStore.folders || []).map((folder) => [folder.id, folder]));
    return files.map((file) => {
      const folderId = folderStore.assignments[file.name] || "";
      const folder = folderId ? folderMap.get(folderId) : null;
      return { ...file, folderId: folder ? folder.id : "", folderName: folder ? folder.name : "Chưa phân loại" };
    });
  };

  const createStorageFolder = async (name) => {
    const folderName = sanitizeStorageFolderName(name);
    if (!folderName) {
      throw new Error("invalid_folder_name");
    }
    const store = await readStorageFolderStore();
    if (store.folders.some((folder) => folder.name.toLowerCase() === folderName.toLowerCase())) {
      throw new Error("folder_exists");
    }
    const id = `folder-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
    store.folders.push({ id, name: folderName });
    return writeStorageFolderStore(store);
  };

  const deleteStorageFolder = async (folderId) => {
    const id = sanitizeStorageFolderId(folderId);
    const store = await readStorageFolderStore();
    store.folders = store.folders.filter((folder) => folder.id !== id);
    for (const [fileName, assignedId] of Object.entries(store.assignments)) {
      if (assignedId === id) {
        delete store.assignments[fileName];
      }
    }
    return writeStorageFolderStore(store);
  };

  const assignStorageFileFolder = async (fileName, folderId) => {
    const safeName = sanitizeStorageFileName(fileName);
    const parsed = resolveStoragePath(pathModule.resolve(config.storageDir || DEFAULT_STORAGE_DIR), safeName);
    if (!parsed || !(await fileExists(parsed.filePath))) {
      throw new Error("file_not_found");
    }
    const id = sanitizeStorageFolderId(folderId);
    const store = await readStorageFolderStore();
    if (!id) {
      delete store.assignments[safeName];
      return writeStorageFolderStore(store);
    }
    if (!store.folders.some((folder) => folder.id === id)) {
      throw new Error("folder_not_found");
    }
    store.assignments[safeName] = id;
    return writeStorageFolderStore(store);
  };

  const getMaintenanceConfig = async () => {
    const configPath = config.maintenanceConfigPath || DEFAULT_MAINTENANCE_CONFIG_PATH;
    return readJsonFileSafe(configPath, {});
  };

  const setMaintenanceConfig = async (body) => {
    const configPath = config.maintenanceConfigPath || DEFAULT_MAINTENANCE_CONFIG_PATH;
    const assetsDir = pathModule.dirname(configPath);
    const existing = await getMaintenanceConfig();
    const next = normalizeMaintenanceConfig(body, existing);
    const parsedMedia = parseMaintenanceMediaDataUrls(body.mediaDataUrls || body.imageDataUrls || body.imageDataUrl);

    await fs.mkdir(assetsDir, { recursive: true });

    if (body.removeImage === true) {
      next.imageUrl = "";
      next.imageUrls = [];
      next.mediaItems = [];
    }

    if (parsedMedia.length > 0 || body.removeImage === true) {
      for (const extension of ["png", "jpg", "webp", "gif", "mp4", "webm", "ogg"]) {
        await fs.unlink(pathModule.join(assetsDir, `maintenance-media.${extension}`)).catch((error) => {
          if (!error || error.code !== "ENOENT") {
            throw error;
          }
        });
      }
      const oldEntries = await fs.readdir(assetsDir).catch(() => []);
      for (const entry of oldEntries) {
        if (/^maintenance-media-\d+\.(png|jpg|webp|gif|mp4|webm|ogg)$/i.test(entry)) {
          await fs.unlink(pathModule.join(assetsDir, entry)).catch((error) => {
            if (!error || error.code !== "ENOENT") {
              throw error;
            }
          });
        }
      }
    }

    if (parsedMedia.length > 0) {
      const version = Date.now();
      next.mediaItems = [];
      next.imageUrls = [];
      for (const [index, parsedItem] of parsedMedia.entries()) {
        const mediaName = `maintenance-media-${index + 1}.${parsedItem.extension}`;
        const mediaPath = pathModule.join(assetsDir, mediaName);
        const mediaUrl = `/assets/${mediaName}?v=${version}`;
        await fs.writeFile(mediaPath, parsedItem.buffer, { mode: 0o644 });
        next.mediaItems.push({ url: mediaUrl, type: parsedItem.type });
        if (parsedItem.type === "image") {
          next.imageUrls.push(mediaUrl);
        }
      }
      next.imageUrl = next.imageUrls[0] || "";
    }

    await fs.writeFile(configPath, JSON.stringify(next, null, 2), { mode: 0o644 });
    return next;
  };

  const server = http.createServer(async (req, res) => {
    const requestId = requestIdFn();
    const method = req.method || "GET";
    const requestUrl = parseRequestUrl(req.url || "/");
    const path = requestUrl.pathname;
    const clientIp = getClientIp(req, config);

    const reject = (statusCode, code, meta = {}, extraHeaders = {}) => {
      logger.warn("request_rejected", {
        requestId,
        code,
        method,
        path,
        clientIp,
        ...meta,
      });
      sendJson(res, statusCode, { ok: false, code }, extraHeaders);
    };

    try {
      leadRateLimiter.prune();
      adminLoginRateLimiter.prune();
      activeSessionStore.prune();
      activeStorageSessionStore.prune();
      prunePendingMfaChallenges();

      if (method === "GET" && path === "/health") {
        sendJson(res, 200, { ok: true, service: "lead-api" });
        return;
      }

      if (method === "GET" && ADMIN_STATIC_ASSETS[path]) {
        const asset = ADMIN_STATIC_ASSETS[path];
        try {
          const fileBody = await fs.readFile(asset.filePath);
          sendBytes(res, 200, fileBody, asset.contentType, {
            "Cache-Control": "public, max-age=300",
          });
        } catch (_error) {
          sendJson(res, 404, { ok: false, code: "not_found" });
        }
        return;
      }

      if (method === "GET" && protectedStaticPages[path]) {
        const page = protectedStaticPages[path];
        const auth = getStorageAuthContext(req, requestUrl);
        if (!auth.session) {
          sendHtml(res, 200, renderProtectedStaticPage(page), { "Cache-Control": "no-store" });
          return;
        }
        try {
          const htmlBody = await fs.readFile(page.filePath, "utf8");
          sendHtml(res, 200, htmlBody, { "Cache-Control": "no-store" });
        } catch (_error) {
          sendJson(res, 404, { ok: false, code: "not_found" });
        }
        return;
      }

      if ((path === "/storagesit" || path === "/storagesit/") && method === "GET") {
        sendHtml(res, 200, renderStorageSitePage());
        return;
      }

      if (path === "/api/storage/session") {
        if (method !== "GET") {
          reject(405, "method_not_allowed", {}, { Allow: "GET" });
          return;
        }
        const auth = getStorageAuthContext(req, requestUrl);
        sendJson(res, 200, { ok: true, unlocked: Boolean(auth.session), expiresAt: auth.session ? auth.session.expiresAt : 0 });
        return;
      }

      if (path === "/api/storage/unlock") {
        if (method !== "POST") {
          reject(405, "method_not_allowed", {}, { Allow: "POST" });
          return;
        }
        const rateStatus = adminLoginRateLimiter.hit(`storage:${clientIp}`);
        if (rateStatus.blocked) {
          reject(429, "rate_limited", { retryAfter: rateStatus.retryAfter }, { "Retry-After": String(rateStatus.retryAfter) });
          return;
        }
        let body;
        try {
          body = await readJsonBody(req, MAX_STORAGE_KEY_BODY_BYTES);
        } catch (error) {
          reject(400, "invalid_request", { reason: error.message });
          return;
        }
        if (!validateStorageAccessKey(body && body.key)) {
          reject(401, "invalid_storage_key");
          return;
        }
        const token = activeStorageSessionStore.create({ email: "storage-user", clientIp });
        logger.info("storage_unlock_success", { requestId, clientIp });
        sendJson(res, 200, { ok: true, storageToken: token, expiresAt: nowFn() + config.storageSessionTtlMs }, {
          "Set-Cookie": buildSessionCookie({ cookieName: config.storageCookieName, token, maxAgeSeconds: storageSessionTtlSec, secure: config.adminCookieSecure }),
        });
        return;
      }

      if (path === "/api/storage/logout") {
        if (method !== "POST") {
          reject(405, "method_not_allowed", {}, { Allow: "POST" });
          return;
        }
        const auth = getStorageAuthContext(req, requestUrl);
        if (auth.token) {
          activeStorageSessionStore.destroy(auth.token);
        }
        sendJson(res, 200, { ok: true }, {
          "Set-Cookie": buildClearSessionCookie({ cookieName: config.storageCookieName, secure: config.adminCookieSecure }),
        });
        return;
      }

      if (path === "/api/storage/files") {
        if (method !== "GET") {
          reject(405, "method_not_allowed", {}, { Allow: "GET" });
          return;
        }
        const auth = getStorageAuthContext(req, requestUrl);
        if (!auth.session) {
          reject(401, "storage_locked");
          return;
        }
        const payload = await getStoragePayload();
        const lockedFiles = await getStorageDownloadLockStore();
        const folderStore = await readStorageFolderStore();
        const files = decorateStorageFilesWithFolders(decorateStorageFilesWithLocks(payload.files, lockedFiles), folderStore);
        sendJson(res, 200, { ok: true, files, folders: folderStore.folders, totalBytes: payload.totalBytes, disk: payload.disk });
        return;
      }

      const storageDownloadMatch = path.match(/^\/api\/storage\/download\/(.+)$/);
      if (storageDownloadMatch) {
        if (method !== "GET") {
          reject(405, "method_not_allowed", {}, { Allow: "GET" });
          return;
        }
        const auth = getStorageAuthContext(req, requestUrl);
        if (!auth.session) {
          reject(401, "storage_locked");
          return;
        }
        const fileName = decodePathToken(storageDownloadMatch[1]);
        const lockedFiles = await getStorageDownloadLockStore();
        if (lockedFiles.has(sanitizeStorageFileName(fileName))) {
          reject(423, "download_locked");
          return;
        }
        const parsed = resolveStoragePath(pathModule.resolve(config.storageDir || DEFAULT_STORAGE_DIR), fileName);
        if (!parsed) {
          reject(400, "invalid_file_name");
          return;
        }
        const stat = await fs.stat(parsed.filePath).catch(() => null);
        if (!stat || !stat.isFile()) {
          reject(404, "not_found");
          return;
        }
        logger.info("storage_file_download", { requestId, clientIp, fileName: parsed.safeName, bytes: stat.size });
        sendFileDownload(res, parsed.filePath, parsed.safeName, stat);
        return;
      }

      if (path === "/login") {
        if (method !== "GET") {
          reject(405, "method_not_allowed", {}, { Allow: "GET" });
          return;
        }
        const auth = getAuthContext(req);
        if (auth.session) {
          redirect(res, "/admin");
          return;
        }
        sendHtml(res, 200, renderLoginPage());
        return;
      }

      if (path === "/admin") {
        if (method !== "GET") {
          reject(405, "method_not_allowed", {}, { Allow: "GET" });
          return;
        }
        const auth = getAuthContext(req);
        if (!auth.session) {
          redirect(res, "/login");
          return;
        }
        sendHtml(res, 200, renderAdminPage());
        return;
      }

      if (path === "/api/admin/session") {
        if (method !== "GET") {
          reject(405, "method_not_allowed", {}, { Allow: "GET" });
          return;
        }
        const auth = getAuthContext(req);
        if (!auth.session) {
          reject(401, "unauthorized");
          return;
        }
        sendJson(res, 200, {
          ok: true,
          email: auth.session.email,
          expiresAt: auth.session.expiresAt,
        });
        return;
      }

      if (path === "/api/admin/maintenance") {
        const auth = getAuthContext(req);
        if (!auth.session) {
          reject(401, "unauthorized");
          return;
        }

        if (method === "GET") {
          const maintenance = await getMaintenanceStatus();
          sendJson(res, 200, { ok: true, ...maintenance });
          return;
        }

        if (method !== "POST") {
          reject(405, "method_not_allowed", {}, { Allow: "GET, POST" });
          return;
        }

        let body;
        try {
          body = await readJsonBody(req, MAX_ADMIN_LOGIN_BODY_BYTES);
        } catch (error) {
          reject(400, "invalid_request", { reason: error.message });
          return;
        }

        if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.enabled !== "boolean") {
          reject(400, "invalid_request", { reason: "enabled_boolean_required" });
          return;
        }

        const maintenance = await setMaintenanceStatus(body.enabled);
        logger.info("admin_maintenance_changed", {
          requestId,
          clientIp,
          email: auth.session.email,
          enabled: maintenance.enabled,
        });
        sendJson(res, 200, { ok: true, ...maintenance });
        return;
      }

      if (path === "/api/admin/maintenance-config") {
        const auth = getAuthContext(req);
        if (!auth.session) {
          reject(401, "unauthorized");
          return;
        }

        if (method === "GET") {
          const maintenanceConfig = await getMaintenanceConfig();
          sendJson(res, 200, { ok: true, config: maintenanceConfig });
          return;
        }

        if (method !== "POST") {
          reject(405, "method_not_allowed", {}, { Allow: "GET, POST" });
          return;
        }

        let body;
        try {
          body = await readJsonBody(req, MAX_ADMIN_MAINTENANCE_CONFIG_BODY_BYTES);
        } catch (error) {
          reject(400, "invalid_request", { reason: error.message });
          return;
        }

        if (!body || typeof body !== "object" || Array.isArray(body)) {
          reject(400, "invalid_request", { reason: "object_required" });
          return;
        }

        let maintenanceConfig;
        try {
          maintenanceConfig = await setMaintenanceConfig(body);
        } catch (error) {
          reject(400, "invalid_request", { reason: error.message });
          return;
        }

        logger.info("admin_maintenance_config_changed", {
          requestId,
          clientIp,
          email: auth.session.email,
          hasImage: Boolean(maintenanceConfig.imageUrl),
        });
        sendJson(res, 200, { ok: true, config: maintenanceConfig });
        return;
      }

      if (path === "/api/admin/storage/files") {
        if (method !== "GET") {
          reject(405, "method_not_allowed", {}, { Allow: "GET" });
          return;
        }
        const auth = getAuthContext(req);
        if (!auth.session) {
          reject(401, "unauthorized");
          return;
        }
        const payload = await getStoragePayload();
        sendJson(res, 200, {
          ok: true,
          files: decorateStorageFilesWithFolders(decorateStorageFilesWithLocks(payload.files, await getStorageDownloadLockStore()), await readStorageFolderStore()).map(({ downloadUrl: _downloadUrl, ...file }) => file),
          folders: (await readStorageFolderStore()).folders,
          totalBytes: payload.totalBytes,
          disk: payload.disk,
          maxUploadBytes: payload.maxUploadBytes,
        });
        return;
      }

      if (path === "/api/admin/storage/file-download-lock") {
        if (method !== "POST") {
          reject(405, "method_not_allowed", {}, { Allow: "POST" });
          return;
        }
        const secFetchSite = String(req.headers["sec-fetch-site"] || "");
        if (secFetchSite && !config.allowedSecFetchSite.has(secFetchSite)) {
          reject(403, "forbidden_fetch_site", { secFetchSite });
          return;
        }
        const originCheck = hasAllowedRequestOrigin(req);
        if (!originCheck.ok) {
          reject(403, "forbidden_origin", { origin: originCheck.origin, referer: originCheck.referer });
          return;
        }
        const auth = getAuthContext(req);
        if (!auth.session) {
          reject(401, "unauthorized");
          return;
        }
        let body;
        try {
          body = await readJsonBody(req, 4 * 1024);
        } catch (error) {
          reject(400, "invalid_request", { reason: error.message });
          return;
        }
        const rawName = body.fileName || body.name || "";
        const parsed = resolveStoragePath(pathModule.resolve(config.storageDir || DEFAULT_STORAGE_DIR), rawName);
        if (!parsed || !(await fileExists(parsed.filePath))) {
          reject(404, "file_not_found");
          return;
        }
        const status = await setStorageFileDownloadLockStatus(parsed.safeName, Boolean(body.enabled));
        logger.info("admin_storage_file_download_lock_changed", { requestId, clientIp, email: auth.session.email, fileName: status.fileName, enabled: status.enabled });
        sendJson(res, 200, { ok: true, fileName: status.fileName, enabled: status.enabled });
        return;
      }

      if (path === "/api/admin/storage/folders") {
        if (method !== "POST") {
          reject(405, "method_not_allowed", {}, { Allow: "POST" });
          return;
        }
        const originCheck = hasAllowedRequestOrigin(req);
        if (!originCheck.ok) {
          reject(403, "forbidden_origin", { origin: originCheck.origin, referer: originCheck.referer });
          return;
        }
        const auth = getAuthContext(req);
        if (!auth.session) {
          reject(401, "unauthorized");
          return;
        }
        let body;
        try { body = await readJsonBody(req, 8 * 1024); } catch (error) { reject(400, "invalid_request", { reason: error.message }); return; }
        try {
          const store = await createStorageFolder(body.name);
          sendJson(res, 200, { ok: true, folders: store.folders });
        } catch (error) {
          reject(error.message === "folder_exists" ? 409 : 400, error.message || "folder_create_failed");
        }
        return;
      }

      const adminStorageFolderDeleteMatch = path.match(/^\/api\/admin\/storage\/folders\/([A-Za-z0-9_-]+)$/);
      if (adminStorageFolderDeleteMatch) {
        if (method !== "DELETE") { reject(405, "method_not_allowed", {}, { Allow: "DELETE" }); return; }
        const auth = getAuthContext(req);
        if (!auth.session) { reject(401, "unauthorized"); return; }
        const store = await deleteStorageFolder(adminStorageFolderDeleteMatch[1]);
        sendJson(res, 200, { ok: true, folders: store.folders });
        return;
      }

      if (path === "/api/admin/storage/file-folder") {
        if (method !== "POST") { reject(405, "method_not_allowed", {}, { Allow: "POST" }); return; }
        const originCheck = hasAllowedRequestOrigin(req);
        if (!originCheck.ok) { reject(403, "forbidden_origin", { origin: originCheck.origin, referer: originCheck.referer }); return; }
        const auth = getAuthContext(req);
        if (!auth.session) { reject(401, "unauthorized"); return; }
        let body;
        try { body = await readJsonBody(req, 8 * 1024); } catch (error) { reject(400, "invalid_request", { reason: error.message }); return; }
        try {
          const store = await assignStorageFileFolder(body.fileName, body.folderId || "");
          sendJson(res, 200, { ok: true, folders: store.folders });
        } catch (error) {
          reject(error.message === "file_not_found" || error.message === "folder_not_found" ? 404 : 400, error.message || "folder_assign_failed");
        }
        return;
      }

      if (path === "/api/admin/storage/upload-chunk") {
        if (method !== "POST") {
          reject(405, "method_not_allowed", {}, { Allow: "POST" });
          return;
        }
        const secFetchSite = String(req.headers["sec-fetch-site"] || "");
        if (secFetchSite && !config.allowedSecFetchSite.has(secFetchSite)) {
          reject(403, "forbidden_fetch_site", { secFetchSite });
          return;
        }
        const originCheck = hasAllowedRequestOrigin(req);
        if (!originCheck.ok) {
          reject(403, "forbidden_origin", { origin: originCheck.origin, referer: originCheck.referer });
          return;
        }
        const auth = getAuthContext(req);
        if (!auth.session) {
          reject(401, "unauthorized");
          return;
        }
        const uploadId = sanitizeUploadId(requestUrl.searchParams.get("uploadId"));
        const rawName = requestUrl.searchParams.get("filename") || req.headers["x-storage-file-name"] || "";
        const chunkIndex = Number(requestUrl.searchParams.get("chunkIndex"));
        const chunkTotal = Number(requestUrl.searchParams.get("chunkTotal"));
        const totalSize = Number(requestUrl.searchParams.get("totalSize"));
        if (!uploadId || !Number.isInteger(chunkIndex) || !Number.isInteger(chunkTotal) || chunkIndex < 0 || chunkTotal < 1 || chunkIndex >= chunkTotal || !Number.isFinite(totalSize) || totalSize <= 0 || totalSize > config.storageMaxUploadBytes) {
          reject(400, "invalid_chunk_metadata");
          return;
        }
        const contentLength = Number(req.headers["content-length"] || 0);
        if (Number.isFinite(contentLength) && contentLength > MAX_STORAGE_CHUNK_BYTES) {
          reject(413, "chunk_too_large");
          return;
        }
        const storageDir = pathModule.resolve(config.storageDir || DEFAULT_STORAGE_DIR);
        await fs.mkdir(storageDir, { recursive: true, mode: 0o750 });
        let state = await readStorageUploadState(storageDir, uploadId);
        if (!state) {
          if (chunkIndex !== 0) {
            reject(409, "missing_upload_session");
            return;
          }
          const destination = await getUniqueStoragePath(storageDir, rawName);
          state = {
            uploadId,
            safeName: destination.safeName,
            tmpPath: `${destination.filePath}.chunk-${uploadId}`,
            finalPath: destination.filePath,
            totalSize,
            chunkTotal,
            nextIndex: 0,
            receivedBytes: 0,
            createdAt: new Date(nowFn()).toISOString(),
          };
          await writeStorageUploadState(storageDir, uploadId, state);
        }
        if (state.nextIndex !== chunkIndex || state.chunkTotal !== chunkTotal || state.totalSize !== totalSize) {
          reject(409, "unexpected_chunk_order");
          return;
        }
        let upload;
        const chunkPartPath = `${state.tmpPath}.part-${chunkIndex}-${crypto.randomBytes(6).toString("hex")}`;
        try {
          upload = await readRawRequestToFile(req, chunkPartPath, MAX_STORAGE_CHUNK_BYTES, config.storageUploadTimeoutMs, "wx");
          const chunkBody = await fs.readFile(chunkPartPath);
          await fs.appendFile(state.tmpPath, chunkBody, { mode: 0o640 });
          await fs.unlink(chunkPartPath).catch(() => {});
        } catch (error) {
          await fs.unlink(chunkPartPath).catch(() => {});
          reject(error.message === "payload_too_large" ? 413 : 400, error.message || "upload_failed");
          return;
        }
        state.receivedBytes += upload.bytes;
        state.nextIndex += 1;
        if (state.receivedBytes > config.storageMaxUploadBytes) {
          await fs.unlink(state.tmpPath).catch(() => {});
          await removeStorageUploadState(storageDir, uploadId).catch(() => {});
          reject(413, "payload_too_large");
          return;
        }
        if (state.nextIndex >= state.chunkTotal) {
          const stat = await fs.stat(state.tmpPath).catch(() => null);
          if (!stat || stat.size !== state.totalSize) {
            await fs.unlink(state.tmpPath).catch(() => {});
            await removeStorageUploadState(storageDir, uploadId).catch(() => {});
            reject(400, "upload_size_mismatch");
            return;
          }
          await fs.rename(state.tmpPath, state.finalPath);
          await removeStorageUploadState(storageDir, uploadId).catch(() => {});
          logger.info("admin_storage_upload", { requestId, clientIp, email: auth.session.email, fileName: state.safeName, bytes: stat.size, chunked: true });
          sendJson(res, 200, { ok: true, complete: true, file: { id: encodeURIComponent(state.safeName), name: state.safeName, size: stat.size, uploadedBytes: stat.size, modifiedAt: stat.mtime.toISOString() } });
          return;
        }
        await writeStorageUploadState(storageDir, uploadId, state);
        sendJson(res, 200, { ok: true, complete: false, receivedBytes: state.receivedBytes, nextIndex: state.nextIndex });
        return;
      }

      if (path === "/api/admin/storage/upload") {
        if (method !== "POST") {
          reject(405, "method_not_allowed", {}, { Allow: "POST" });
          return;
        }
        const secFetchSite = String(req.headers["sec-fetch-site"] || "");
        if (secFetchSite && !config.allowedSecFetchSite.has(secFetchSite)) {
          reject(403, "forbidden_fetch_site", { secFetchSite });
          return;
        }
        const originCheck = hasAllowedRequestOrigin(req);
        if (!originCheck.ok) {
          reject(403, "forbidden_origin", { origin: originCheck.origin, referer: originCheck.referer });
          return;
        }
        const auth = getAuthContext(req);
        if (!auth.session) {
          reject(401, "unauthorized");
          return;
        }
        const storageDir = pathModule.resolve(config.storageDir || DEFAULT_STORAGE_DIR);
        await fs.mkdir(storageDir, { recursive: true, mode: 0o750 });
        const rawName = requestUrl.searchParams.get("filename") || req.headers["x-storage-file-name"] || "";
        const destination = await getUniqueStoragePath(storageDir, rawName);
        const contentLength = Number(req.headers["content-length"] || 0);
        if (Number.isFinite(contentLength) && contentLength > config.storageMaxUploadBytes) {
          reject(413, "payload_too_large");
          return;
        }
        let upload;
        try {
          upload = await readRawUploadToFile(req, destination.filePath, config.storageMaxUploadBytes, config.storageUploadTimeoutMs);
        } catch (error) {
          reject(error.message === "payload_too_large" ? 413 : 400, error.message || "upload_failed");
          return;
        }
        const stat = await fs.stat(destination.filePath);
        logger.info("admin_storage_upload", { requestId, clientIp, email: auth.session.email, fileName: destination.safeName, bytes: stat.size });
        sendJson(res, 200, { ok: true, file: { id: encodeURIComponent(destination.safeName), name: destination.safeName, size: stat.size, uploadedBytes: upload.bytes, modifiedAt: stat.mtime.toISOString() } });
        return;
      }

      const adminStorageDeleteMatch = path.match(/^\/api\/admin\/storage\/files\/(.+)$/);
      if (adminStorageDeleteMatch) {
        if (method !== "DELETE") {
          reject(405, "method_not_allowed", {}, { Allow: "DELETE" });
          return;
        }
        const secFetchSite = String(req.headers["sec-fetch-site"] || "");
        if (secFetchSite && !config.allowedSecFetchSite.has(secFetchSite)) {
          reject(403, "forbidden_fetch_site", { secFetchSite });
          return;
        }
        const originCheck = hasAllowedRequestOrigin(req);
        if (!originCheck.ok) {
          reject(403, "forbidden_origin", { origin: originCheck.origin, referer: originCheck.referer });
          return;
        }
        const auth = getAuthContext(req);
        if (!auth.session) {
          reject(401, "unauthorized");
          return;
        }
        const fileName = decodePathToken(adminStorageDeleteMatch[1]);
        const parsed = resolveStoragePath(pathModule.resolve(config.storageDir || DEFAULT_STORAGE_DIR), fileName);
        if (!parsed) {
          reject(400, "invalid_file_name");
          return;
        }
        try {
          await fs.unlink(parsed.filePath);
        } catch (error) {
          if (!error || error.code !== "ENOENT") {
            throw error;
          }
          reject(404, "not_found");
          return;
        }
        logger.info("admin_storage_delete", { requestId, clientIp, email: auth.session.email, fileName: parsed.safeName });
        sendJson(res, 200, { ok: true, fileName: parsed.safeName });
        return;
      }

      if (path === "/api/admin/logout") {
        if (method !== "POST") {
          reject(405, "method_not_allowed", {}, { Allow: "POST" });
          return;
        }

        const secFetchSite = String(req.headers["sec-fetch-site"] || "");
        if (secFetchSite && !config.allowedSecFetchSite.has(secFetchSite)) {
          reject(403, "forbidden_fetch_site", { secFetchSite });
          return;
        }

        const originCheck = hasAllowedRequestOrigin(req);
        if (!originCheck.ok) {
          reject(403, "forbidden_origin", {
            origin: originCheck.origin,
            referer: originCheck.referer,
          });
          return;
        }

        const auth = getAuthContext(req);
        if (auth.token) {
          activeSessionStore.destroy(auth.token);
        }
        sendJson(
          res,
          200,
          { ok: true },
          {
            "Set-Cookie": buildClearSessionCookie({
              cookieName: config.adminCookieName,
              secure: config.adminCookieSecure,
            }),
          }
        );
        return;
      }

      if (path === "/api/admin/login") {
        if (method !== "POST") {
          reject(405, "method_not_allowed", {}, { Allow: "POST" });
          return;
        }

        const secFetchSite = String(req.headers["sec-fetch-site"] || "");
        if (secFetchSite && !config.allowedSecFetchSite.has(secFetchSite)) {
          reject(403, "forbidden_fetch_site", { secFetchSite });
          return;
        }

        const originCheck = hasAllowedRequestOrigin(req);
        if (!originCheck.ok) {
          reject(403, "forbidden_origin", {
            origin: originCheck.origin,
            referer: originCheck.referer,
          });
          return;
        }

        const rateStatus = adminLoginRateLimiter.hit(clientIp);
        if (rateStatus.blocked) {
          reject(
            429,
            "rate_limited",
            { retryAfter: rateStatus.retryAfter },
            { "Retry-After": String(rateStatus.retryAfter) }
          );
          return;
        }

        const contentType = String(req.headers["content-type"] || "").toLowerCase();
        if (!contentType.includes("application/json")) {
          reject(415, "unsupported_media_type", { contentType });
          return;
        }

        let body;
        try {
          body = await readJsonBody(req, MAX_ADMIN_LOGIN_BODY_BYTES);
        } catch (error) {
          reject(400, "invalid_request", { reason: error.message });
          return;
        }

        const payloadValidation = validateAdminLoginPayload(body);
        if (!payloadValidation.ok) {
          reject(401, "invalid_credentials");
          return;
        }

        const credentialsMatch = credentialsMatchAdmin({
          email: payloadValidation.payload.email,
          password: payloadValidation.payload.password,
          config,
        });

        if (!credentialsMatch) {
          logger.warn("admin_login_failed", {
            requestId,
            clientIp,
            email: payloadValidation.payload.email,
          });
          reject(401, "invalid_credentials");
          return;
        }

        const mfaChallenge = createPendingMfaChallenge({
          email: config.adminEmail,
          clientIp,
        });
        sendJson(res, 200, {
          ok: true,
          mfaRequired: true,
          challengeToken: mfaChallenge.token,
          expiresInSeconds: mfaChallenge.expiresInSeconds,
        });
        return;
      }

      if (path === "/api/admin/login/mfa") {
        if (method !== "POST") {
          reject(405, "method_not_allowed", {}, { Allow: "POST" });
          return;
        }

        const secFetchSite = String(req.headers["sec-fetch-site"] || "");
        if (secFetchSite && !config.allowedSecFetchSite.has(secFetchSite)) {
          reject(403, "forbidden_fetch_site", { secFetchSite });
          return;
        }

        const originCheck = hasAllowedRequestOrigin(req);
        if (!originCheck.ok) {
          reject(403, "forbidden_origin", {
            origin: originCheck.origin,
            referer: originCheck.referer,
          });
          return;
        }

        const rateStatus = adminLoginRateLimiter.hit(clientIp);
        if (rateStatus.blocked) {
          reject(
            429,
            "rate_limited",
            { retryAfter: rateStatus.retryAfter },
            { "Retry-After": String(rateStatus.retryAfter) }
          );
          return;
        }

        const contentType = String(req.headers["content-type"] || "").toLowerCase();
        if (!contentType.includes("application/json")) {
          reject(415, "unsupported_media_type", { contentType });
          return;
        }

        let body;
        try {
          body = await readJsonBody(req, MAX_ADMIN_LOGIN_BODY_BYTES);
        } catch (error) {
          reject(400, "invalid_request", { reason: error.message });
          return;
        }

        const payloadValidation = validateAdminMfaPayload(body);
        if (!payloadValidation.ok) {
          reject(401, payloadValidation.code === "invalid_totp" ? "invalid_totp" : "invalid_request");
          return;
        }

        if (!adminTotpSecretBytes) {
          reject(400, "mfa_not_configured");
          return;
        }

        const pendingChallenge = getPendingMfaChallenge(payloadValidation.payload.challengeToken);
        if (
          !pendingChallenge ||
          pendingChallenge.email !== String(config.adminEmail || "").trim().toLowerCase() ||
          pendingChallenge.clientIp !== String(clientIp || "").trim()
        ) {
          reject(401, "mfa_challenge_invalid");
          return;
        }

        const validTotp = verifyTotpCode({
          secretBytes: adminTotpSecretBytes,
          totpCode: payloadValidation.payload.totpCode,
          nowMs: nowFn(),
        });
        if (!validTotp) {
          pendingChallenge.attempts += 1;
          if (pendingChallenge.attempts >= adminMfaChallengeMaxAttempts) {
            pendingMfaChallenges.delete(pendingChallenge.token);
          } else {
            pendingMfaChallenges.set(pendingChallenge.token, pendingChallenge);
          }
          logger.warn("admin_mfa_failed", {
            requestId,
            clientIp,
            email: pendingChallenge.email,
          });
          reject(401, "invalid_totp");
          return;
        }

        pendingMfaChallenges.delete(pendingChallenge.token);

        const sessionToken = activeSessionStore.create({
          email: config.adminEmail,
          clientIp,
        });
        logger.info("admin_login_success", {
          requestId,
          clientIp,
          email: config.adminEmail,
        });
        sendJson(
          res,
          200,
          { ok: true },
          {
            "Set-Cookie": buildSessionCookie({
              cookieName: config.adminCookieName,
              token: sessionToken,
              maxAgeSeconds: adminSessionTtlSec,
              secure: config.adminCookieSecure,
            }),
          }
        );
        return;
      }

      if (path === "/api/admin/leads") {
        if (method !== "GET") {
          reject(405, "method_not_allowed", {}, { Allow: "GET" });
          return;
        }

        const secFetchSite = String(req.headers["sec-fetch-site"] || "");
        if (secFetchSite && !config.allowedSecFetchSite.has(secFetchSite)) {
          reject(403, "forbidden_fetch_site", { secFetchSite });
          return;
        }

        const auth = getAuthContext(req);
        if (!auth.session) {
          reject(401, "unauthorized");
          return;
        }

        const filters = parseAdminLeadFilters(requestUrl.searchParams);
        const limitRaw = Number(requestUrl.searchParams.get("limit"));
        const limit = Number.isFinite(limitRaw)
          ? Math.min(Math.max(Math.floor(limitRaw), 1), maxAdminLeads)
          : maxAdminLeads;
        const leads = await activeLeadStore.listRecent({ limit, filters });
        sendJson(res, 200, { ok: true, leads, filters });
        return;
      }

      if (path === "/api/admin/leads/export.csv") {
        if (method !== "GET") {
          reject(405, "method_not_allowed", {}, { Allow: "GET" });
          return;
        }

        const secFetchSite = String(req.headers["sec-fetch-site"] || "");
        if (secFetchSite && !config.allowedSecFetchSite.has(secFetchSite)) {
          reject(403, "forbidden_fetch_site", { secFetchSite });
          return;
        }

        const auth = getAuthContext(req);
        if (!auth.session) {
          reject(401, "unauthorized");
          return;
        }

        const filters = parseAdminLeadFilters(requestUrl.searchParams);
        const limitRaw = Number(requestUrl.searchParams.get("limit"));
        const limit = Number.isFinite(limitRaw)
          ? Math.min(Math.max(Math.floor(limitRaw), 1), maxAdminLeads)
          : maxAdminLeads;
        const leads = await activeLeadStore.listRecent({ limit, filters });
        const csv = leadsToCsv(leads);
        const stamp = new Date(nowFn()).toISOString().slice(0, 10).replace(/-/g, "");
        sendBytes(res, 200, Buffer.from(csv, "utf8"), "text/csv; charset=utf-8", {
          "Content-Disposition": `attachment; filename="leads-${stamp}.csv"`,
        });
        return;
      }

      const processMatch = path.match(/^\/api\/admin\/leads\/([^/]+)\/process$/);
      if (processMatch) {
        if (method !== "POST") {
          reject(405, "method_not_allowed", {}, { Allow: "POST" });
          return;
        }

        const secFetchSite = String(req.headers["sec-fetch-site"] || "");
        if (secFetchSite && !config.allowedSecFetchSite.has(secFetchSite)) {
          reject(403, "forbidden_fetch_site", { secFetchSite });
          return;
        }

        const originCheck = hasAllowedRequestOrigin(req);
        if (!originCheck.ok) {
          reject(403, "forbidden_origin", {
            origin: originCheck.origin,
            referer: originCheck.referer,
          });
          return;
        }

        const auth = getAuthContext(req);
        if (!auth.session) {
          reject(401, "unauthorized");
          return;
        }

        const leadId = decodePathToken(processMatch[1]);
        if (!leadId) {
          reject(400, "invalid_request");
          return;
        }

        let body = {};
        const contentType = String(req.headers["content-type"] || "").toLowerCase();
        if (contentType && !contentType.includes("application/json")) {
          reject(415, "unsupported_media_type", { contentType });
          return;
        }
        if (contentType.includes("application/json")) {
          try {
            body = await readJsonBody(req, MAX_ADMIN_LOGIN_BODY_BYTES);
          } catch (error) {
            reject(400, "invalid_request", { reason: error.message });
            return;
          }
        }

        const processed = body && typeof body.processed === "boolean" ? body.processed : true;
        if (typeof activeLeadStore.updateStatus !== "function") {
          reject(500, "internal_error");
          return;
        }
        const lead = await activeLeadStore.updateStatus({ leadId, processed });
        if (!lead) {
          reject(404, "not_found");
          return;
        }
        sendJson(res, 200, { ok: true, lead });
        return;
      }

      const deleteMatch = path.match(/^\/api\/admin\/leads\/([^/]+)$/);
      if (deleteMatch) {
        if (method !== "DELETE") {
          reject(405, "method_not_allowed", {}, { Allow: "DELETE" });
          return;
        }

        const secFetchSite = String(req.headers["sec-fetch-site"] || "");
        if (secFetchSite && !config.allowedSecFetchSite.has(secFetchSite)) {
          reject(403, "forbidden_fetch_site", { secFetchSite });
          return;
        }

        const originCheck = hasAllowedRequestOrigin(req);
        if (!originCheck.ok) {
          reject(403, "forbidden_origin", {
            origin: originCheck.origin,
            referer: originCheck.referer,
          });
          return;
        }

        const auth = getAuthContext(req);
        if (!auth.session) {
          reject(401, "unauthorized");
          return;
        }

        const leadId = decodePathToken(deleteMatch[1]);
        if (!leadId) {
          reject(400, "invalid_request");
          return;
        }

        if (typeof activeLeadStore.deleteById !== "function") {
          reject(500, "internal_error");
          return;
        }
        const removed = await activeLeadStore.deleteById(leadId);
        if (!removed) {
          reject(404, "not_found");
          return;
        }
        sendJson(res, 200, { ok: true, leadId });
        return;
      }

      if (path !== "/api/lead") {
        sendJson(res, 404, { ok: false, code: "not_found" });
        return;
      }

      if (method !== "POST") {
        reject(405, "method_not_allowed", {}, { Allow: "POST" });
        return;
      }

      const secFetchSite = String(req.headers["sec-fetch-site"] || "");
      if (secFetchSite && !config.allowedSecFetchSite.has(secFetchSite)) {
        reject(403, "forbidden_fetch_site", { secFetchSite });
        return;
      }

      if (config.blockedIps.has(clientIp)) {
        reject(403, "forbidden");
        return;
      }

      const rateStatus = leadRateLimiter.hit(clientIp);
      if (rateStatus.blocked) {
        reject(
          429,
          "rate_limited",
          { retryAfter: rateStatus.retryAfter },
          { "Retry-After": String(rateStatus.retryAfter) }
        );
        return;
      }

      const contentType = String(req.headers["content-type"] || "").toLowerCase();
      if (!contentType.includes("application/json")) {
        reject(415, "unsupported_media_type", { contentType });
        return;
      }

      const origin = String(req.headers.origin || "");
      const referer = String(req.headers.referer || "");
      const sameOriginRequest = isSameOriginRequest(req, origin, referer);
      const hasAllowedOrigin = allowedOrigin(origin, config.allowedOrigins);
      const hasAllowedReferer = allowedReferer(referer, config.allowedOrigins);
      if (!sameOriginRequest && !hasAllowedOrigin && !hasAllowedReferer) {
        reject(403, "forbidden_origin", { origin, referer });
        return;
      }

      let body;
      try {
        body = await readJsonBody(req, config.maxBodyBytes);
      } catch (error) {
        if (error.message === "payload_too_large") {
          reject(413, "payload_too_large");
          return;
        }
        reject(400, "invalid_request", { reason: error.message });
        return;
      }

      const validation = validateLeadPayload(body, {
        expectedKeys: config.expectedJsonKeys,
        allowedOrigins: config.allowedOrigins,
        maxSourceUrlLength: config.maxSourceUrlLength,
      });
      if (!validation.ok) {
        reject(400, validation.code);
        return;
      }

      let persisted = false;
      try {
        await activeLeadStore.append({
          requestId,
          clientIp,
          name: validation.payload.name,
          email: validation.payload.email,
          phone: validation.payload.phone || "",
          message: validation.payload.message,
          language: validation.payload.language,
          sourceUrl: validation.payload.sourceUrl,
        });
        persisted = true;
      } catch (storageError) {
        logger.error("lead_persist_failed", {
          requestId,
          clientIp,
          error: storageError,
        });
      }

      if (!persisted) {
        reject(500, "lead_store_failed");
        return;
      }

      const forwarded = await runForwardLead({
        lead: validation.payload,
        requestId,
      });
      if (!forwarded) {
        logger.warn("lead_forward_failed_but_saved", {
          requestId,
          clientIp,
          email: validation.payload.email,
          language: validation.payload.language,
        });
      }

      logger.info("lead_accepted", {
        requestId,
        clientIp,
        email: validation.payload.email,
        language: validation.payload.language,
        forwarded,
      });
      sendJson(res, 200, { ok: true, requestId, forwarded });
    } catch (error) {
      logger.error("unhandled_request_error", {
        requestId,
        method,
        path,
        clientIp,
        error,
      });
      if (!res.headersSent) {
        sendJson(res, 500, { ok: false, code: "internal_error" });
      }
    }
  });

  server.on("clientError", (error, socket) => {
    logger.warn("client_error", { error });
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
  });

  server.requestTimeout = requestTimeoutMs;
  server.keepAliveTimeout = keepAliveTimeoutMs;
  server.headersTimeout = headersTimeoutMs;
  server.maxConnections = maxConnections;
  server.setTimeout(requestTimeoutMs);

  return server;
};

const startServer = (options = {}) => {
  const config = options.config || buildConfig(options.env || process.env);
  const logger = options.logger || createAuditLogger({ service: "lead-api" });
  const validation = validateConfig(config);
  if (!validation.ok) {
    const error = new Error(`invalid_runtime_config: ${validation.errors.join(" | ")}`);
    logger.error("invalid_runtime_config", {
      strictStartup: validation.strictStartup,
      errors: validation.errors,
      warnings: validation.warnings,
    });
    throw error;
  }
  if (validation.warnings.length > 0) {
    logger.warn("runtime_config_warnings", {
      strictStartup: validation.strictStartup,
      warnings: validation.warnings,
    });
  }
  const server = createLeadServer({
    ...options,
    config,
    logger,
  });

  if (config.socketPath) {
    try {
      const socketStat = fsSync.statSync(config.socketPath);
      if (!socketStat.isSocket()) {
        throw new Error(`socket_path_exists_and_is_not_socket: `);
      }
      fsSync.unlinkSync(config.socketPath);
    } catch (error) {
      if (error && error.code !== "ENOENT") {
        throw error;
      }
    }

    server.listen(config.socketPath, () => {
      try {
        fsSync.chmodSync(config.socketPath, 0o660);
      } catch (error) {
        logger.warn("socket_permission_adjust_failed", {
          socketPath: config.socketPath,
          error,
        });
      }

      logger.info("server_started", {
        socketPath: config.socketPath,
      });
    });

    server.on("close", () => {
      try {
        if (fsSync.existsSync(config.socketPath)) {
          fsSync.unlinkSync(config.socketPath);
        }
      } catch (_error) {
        // best effort cleanup
      }
    });

    return server;
  }

  server.listen(config.port, config.bindAddress, () => {
    logger.info("server_started", {
      bindAddress: config.bindAddress,
      port: config.port,
    });
  });

  return server;
};

if (require.main === module) {
  startServer();
}

module.exports = {
  securityHeaders,
  buildConfig,
  validateConfig,
  normalizeIp,
  getClientIp,
  readJsonBody,
  forwardLead,
  createLeadServer,
  startServer,
};


