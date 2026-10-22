"use strict";

const crypto = require("node:crypto");

const DEFAULT_MAX_SESSIONS = 1000;

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

const constantTimeEquals = (left, right) => {
  const a = Buffer.from(String(left || ""), "utf8");
  const b = Buffer.from(String(right || ""), "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
};

const createSessionStore = ({
  ttlMs = 8 * 60 * 60 * 1000,
  maxSessions = DEFAULT_MAX_SESSIONS,
  nowFn = Date.now,
} = {}) => {
  const sessions = new Map();
  const maxSessionCount = toPositiveInt(maxSessions, DEFAULT_MAX_SESSIONS);
  const sessionTtlMs = toPositiveInt(ttlMs, 8 * 60 * 60 * 1000);

  const prune = () => {
    const current = nowFn();
    for (const [sessionId, session] of sessions.entries()) {
      if (!session || session.expiresAt <= current) {
        sessions.delete(sessionId);
      }
    }
  };

  const create = ({ email, clientIp }) => {
    prune();

    if (sessions.size >= maxSessionCount) {
      const oldest = sessions.keys().next();
      if (!oldest.done) {
        sessions.delete(oldest.value);
      }
    }

    const now = nowFn();
    const sessionId = crypto.randomBytes(32).toString("base64url");
    sessions.set(sessionId, {
      email: String(email || "").toLowerCase(),
      clientIp: String(clientIp || ""),
      createdAt: now,
      expiresAt: now + sessionTtlMs,
    });
    return sessionId;
  };

  const get = (sessionId) => {
    if (!sessionId) {
      return null;
    }
    const session = sessions.get(sessionId);
    if (!session) {
      return null;
    }
    const current = nowFn();
    if (session.expiresAt <= current) {
      sessions.delete(sessionId);
      return null;
    }
    return {
      ...session,
    };
  };

  const destroy = (sessionId) => {
    if (!sessionId) {
      return;
    }
    sessions.delete(sessionId);
  };

  return {
    create,
    get,
    destroy,
    prune,
  };
};

module.exports = {
  constantTimeEquals,
  createSessionStore,
};
