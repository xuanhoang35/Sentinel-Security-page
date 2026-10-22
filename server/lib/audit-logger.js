"use strict";

const crypto = require("node:crypto");

const DEFAULT_SERVICE = "lead-api";
const REDACTED = "[redacted]";
const DEFAULT_HASH_LENGTH = 12;

const EMAIL_FIELDS = new Set(["email", "contactEmail", "replyTo"]);
const SENSITIVE_FIELDS = new Set(["name", "message", "website"]);

const hashValue = (value, salt = "") =>
  crypto
    .createHash("sha256")
    .update(String(salt))
    .update(":")
    .update(String(value))
    .digest("hex")
    .slice(0, DEFAULT_HASH_LENGTH);

const redactIp = (ip, salt = "") => {
  const normalized = String(ip || "").trim();
  if (!normalized) {
    return "unknown";
  }
  return `ip_${hashValue(normalized, salt)}`;
};

const redactEmail = (email, salt = "") => {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) {
    return "email_unknown";
  }
  return `email_${hashValue(normalized, salt)}`;
};

const truncate = (value, maxLength = 256) => {
  const text = String(value || "");
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
};

const serializeError = (error) => {
  if (!error || typeof error !== "object") {
    return truncate(error, 160);
  }
  return {
    name: truncate(error.name || "Error", 80),
    message: truncate(error.message || "", 180),
  };
};

const sanitizeMeta = (value, options, fieldName = "") => {
  if (value === null || value === undefined) {
    return value;
  }
  if (value instanceof Error) {
    return serializeError(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeMeta(item, options, fieldName));
  }
  if (typeof value === "object") {
    const output = {};
    for (const [key, childValue] of Object.entries(value)) {
      output[key] = sanitizeMeta(childValue, options, key);
    }
    return output;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  const normalizedField = String(fieldName || "");
  if (normalizedField === "clientIp" || normalizedField === "ip") {
    return redactIp(value, options.salt);
  }
  if (EMAIL_FIELDS.has(normalizedField)) {
    return redactEmail(value, options.salt);
  }
  if (SENSITIVE_FIELDS.has(normalizedField)) {
    if (normalizedField === "message") {
      return `message_len_${String(value).length}`;
    }
    return REDACTED;
  }
  return truncate(value, options.maxStringLength);
};

const createAuditLogger = ({
  service = DEFAULT_SERVICE,
  salt = process.env.AUDIT_LOG_SALT || "",
  writer = process.stdout,
  maxStringLength = 256,
} = {}) => {
  const options = {
    service,
    salt,
    writer,
    maxStringLength,
  };

  const write = (level, event, meta = {}) => {
    const payload = {
      ts: new Date().toISOString(),
      service: options.service,
      level,
      event,
      meta: sanitizeMeta(meta, options),
    };
    const line = `${JSON.stringify(payload)}\n`;
    try {
      if (options.writer && typeof options.writer.write === "function") {
        options.writer.write(line);
      } else {
        console.log(line.trim());
      }
    } catch (_error) {
      // Logging should never crash request processing.
    }
  };

  return {
    info: (event, meta) => write("info", event, meta),
    warn: (event, meta) => write("warn", event, meta),
    error: (event, meta) => write("error", event, meta),
  };
};

module.exports = {
  createAuditLogger,
  hashValue,
  redactIp,
  redactEmail,
};
