"use strict";

const { URL } = require("node:url");

const DEFAULT_EXPECTED_KEYS = new Set([
  "name",
  "email",
  "phone",
  "message",
  "website",
  "turnstileToken",
  "language",
  "sourceUrl",
]);
const DEFAULT_MAX_SOURCE_URL_LENGTH = 512;

const cleanText = (value) =>
  String(value || "")
    .replace(/[<>"'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
const normalizePhone = (value) => cleanText(value).replace(/[^\d+]/g, "");
const isValidPhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
};

const normalizeOriginValue = (value) => {
  try {
    const parsed = new URL(String(value || "").trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }
    return parsed.origin;
  } catch (_error) {
    return "";
  }
};

const allowedOrigin = (origin, allowedOrigins) => {
  if (!origin) {
    return false;
  }
  const normalizedOrigin = normalizeOriginValue(origin);
  if (!normalizedOrigin) {
    return false;
  }

  const allowedSet =
    allowedOrigins instanceof Set
      ? new Set(Array.from(allowedOrigins).map((item) => normalizeOriginValue(item)).filter(Boolean))
      : new Set(
          (Array.isArray(allowedOrigins) ? allowedOrigins : [])
            .map((item) => normalizeOriginValue(item))
            .filter(Boolean)
        );

  return allowedSet.has(normalizedOrigin);
};

const allowedReferer = (referer, allowedOrigins) => {
  if (!referer) {
    return false;
  }
  return allowedOrigin(referer, allowedOrigins);
};

const hasUnexpectedJsonKeys = (body, expectedKeys = DEFAULT_EXPECTED_KEYS) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return true;
  }
  return Object.keys(body).some((key) => !expectedKeys.has(key));
};

const sourceUrlIsAllowed = (sourceUrl, allowedOrigins) => {
  try {
    const parsed = new URL(sourceUrl);
    return allowedOrigin(parsed.origin, allowedOrigins);
  } catch (_error) {
    return false;
  }
};

const validateLeadPayload = (body, options = {}) => {
  const expectedKeys = options.expectedKeys || DEFAULT_EXPECTED_KEYS;
  const allowedOrigins = options.allowedOrigins || [];
  const maxSourceUrlLength = Number.isFinite(options.maxSourceUrlLength)
    ? options.maxSourceUrlLength
    : DEFAULT_MAX_SOURCE_URL_LENGTH;

  if (hasUnexpectedJsonKeys(body, expectedKeys)) {
    return { ok: false, code: "invalid_payload_shape" };
  }

  const name = cleanText(body.name);
  const email = cleanText(body.email).toLowerCase();
  const phone = normalizePhone(body.phone);
  const message = cleanText(body.message);
  const website = cleanText(body.website);
  const language = body.language === "en" ? "en" : "vi";
  const sourceUrl = cleanText(body.sourceUrl);

  if (website !== "") {
    return { ok: false, code: "bot_detected" };
  }
  if (name.length < 2 || name.length > 80) {
    return { ok: false, code: "invalid_name" };
  }
  if (!isValidEmail(email) || email.length > 254) {
    return { ok: false, code: "invalid_email" };
  }
  if (phone && !isValidPhone(phone)) {
    return { ok: false, code: "invalid_phone" };
  }
  if (message.length < 20 || message.length > 2000) {
    return { ok: false, code: "invalid_message" };
  }
  if (sourceUrl.length > maxSourceUrlLength || !sourceUrlIsAllowed(sourceUrl, allowedOrigins)) {
    return { ok: false, code: "invalid_source" };
  }

  return {
    ok: true,
    payload: {
      name,
      email,
      phone,
      message,
      language,
      sourceUrl,
    },
  };
};

module.exports = {
  DEFAULT_EXPECTED_KEYS,
  DEFAULT_MAX_SOURCE_URL_LENGTH,
  cleanText,
  isValidEmail,
  normalizePhone,
  isValidPhone,
  allowedOrigin,
  allowedReferer,
  hasUnexpectedJsonKeys,
  sourceUrlIsAllowed,
  validateLeadPayload,
};
