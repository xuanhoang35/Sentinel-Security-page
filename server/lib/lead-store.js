"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_MAX_LIST = 100;

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
};

const toIsoDate = (value, fallback = Date.now()) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(fallback).toISOString();
  }
  return parsed.toISOString();
};

const normalizeStatus = (value) => (value === "processed" ? "processed" : "new");

const toFiniteDateMs = (value) => {
  if (value === null || value === undefined || value === "") {
    return Number.NaN;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const fallbackLeadId = (lead, index) => {
  const seed = JSON.stringify({
    requestId: lead.requestId || "",
    createdAt: lead.createdAt || "",
    email: lead.email || "",
    sourceUrl: lead.sourceUrl || "",
    message: lead.message || "",
    index,
  });
  return `legacy_${crypto.createHash("sha256").update(seed).digest("hex").slice(0, 20)}`;
};

const normalizeLead = (lead, index = 0) => {
  const base = lead && typeof lead === "object" ? { ...lead } : {};
  const status = normalizeStatus(base.status);
  const leadId = String(base.leadId || "").trim() || fallbackLeadId(base, index);
  const createdAt = toIsoDate(base.createdAt, Date.now());
  const processedAt =
    status === "processed" ? toIsoDate(base.processedAt, Date.now()) : null;

  return {
    ...base,
    leadId,
    createdAt,
    status,
    processedAt,
  };
};

const ensureUniqueLeadIds = (items) => {
  const seenLeadIds = new Set();
  return items.map((item, index) => {
    let nextLeadId = String(item.leadId || "").trim();
    if (!nextLeadId || seenLeadIds.has(nextLeadId)) {
      const fallbackBase = fallbackLeadId(item, index);
      nextLeadId = fallbackBase;
      let suffix = 1;
      while (seenLeadIds.has(nextLeadId)) {
        nextLeadId = `${fallbackBase}_${suffix}`;
        suffix += 1;
      }
    }
    seenLeadIds.add(nextLeadId);
    return {
      ...item,
      leadId: nextLeadId,
    };
  });
};

const matchesFilters = (lead, filters = {}) => {
  const filterEmail = String(filters.email || "").trim().toLowerCase();
  const filterPhone = String(filters.phone || "").trim().toLowerCase();
  const filterLanguage = String(filters.language || "").trim().toLowerCase();
  const filterStatus = String(filters.status || "").trim().toLowerCase();
  const dateFromMs = toFiniteDateMs(filters.dateFromMs);
  const dateToMs = toFiniteDateMs(filters.dateToMs);

  if (filterEmail && !String(lead.email || "").toLowerCase().includes(filterEmail)) {
    return false;
  }
  if (filterPhone && !String(lead.phone || "").toLowerCase().includes(filterPhone)) {
    return false;
  }
  if (filterLanguage && filterLanguage !== "all" && String(lead.language || "").toLowerCase() !== filterLanguage) {
    return false;
  }
  if (filterStatus && filterStatus !== "all" && String(lead.status || "").toLowerCase() !== filterStatus) {
    return false;
  }

  const createdAtMs = new Date(lead.createdAt).getTime();
  if (Number.isFinite(dateFromMs) && createdAtMs < dateFromMs) {
    return false;
  }
  if (Number.isFinite(dateToMs) && createdAtMs > dateToMs) {
    return false;
  }
  return true;
};

const createFileLeadStore = ({ filePath, maxList = DEFAULT_MAX_LIST } = {}) => {
  const resolvedPath = path.resolve(String(filePath || "./data/leads.ndjson"));
  const maxLeadList = toPositiveInt(maxList, DEFAULT_MAX_LIST);

  const readEntries = async () => {
    try {
      const raw = await fs.readFile(resolvedPath, "utf8");
      const normalized = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => safeJsonParse(line))
        .filter((item) => item && typeof item === "object")
        .map((item, index) => normalizeLead(item, index));
      return ensureUniqueLeadIds(normalized);
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  };

  const writeEntries = async (entries) => {
    await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
    const normalized = ensureUniqueLeadIds(entries.map((item, index) => normalizeLead(item, index)));
    const content =
      normalized.length === 0
        ? ""
        : `${normalized.map((item) => JSON.stringify(item)).join("\n")}\n`;
    await fs.writeFile(resolvedPath, content, "utf8");
  };

  const append = async (lead) => {
    const entry = normalizeLead(
      {
        leadId: String(lead && lead.leadId ? lead.leadId : crypto.randomUUID()).trim(),
        createdAt: new Date().toISOString(),
        status: "new",
        ...lead,
      },
      0
    );
    await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
    await fs.appendFile(resolvedPath, `${JSON.stringify(entry)}\n`, "utf8");
    return entry;
  };

  const listRecent = async ({ limit = maxLeadList, filters = {} } = {}) => {
    const safeLimit = toPositiveInt(limit, maxLeadList);
    const items = await readEntries();
    return items
      .filter((item) => matchesFilters(item, filters))
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, safeLimit);
  };

  const updateStatus = async ({ leadId, processed = true } = {}) => {
    const normalizedId = String(leadId || "").trim();
    if (!normalizedId) {
      return null;
    }

    const items = await readEntries();
    let updated = null;
    const next = items.map((item, index) => {
      if (item.leadId !== normalizedId) {
        return item;
      }
      const status = processed ? "processed" : "new";
      updated = normalizeLead(
        {
          ...item,
          status,
          processedAt: processed ? new Date().toISOString() : null,
        },
        index
      );
      return updated;
    });

    if (!updated) {
      return null;
    }

    await writeEntries(next);
    return updated;
  };

  const deleteById = async (leadId) => {
    const normalizedId = String(leadId || "").trim();
    if (!normalizedId) {
      return false;
    }

    const items = await readEntries();
    const next = items.filter((item) => item.leadId !== normalizedId);
    if (next.length === items.length) {
      return false;
    }
    await writeEntries(next);
    return true;
  };

  return {
    append,
    listRecent,
    updateStatus,
    deleteById,
    path: resolvedPath,
  };
};

module.exports = {
  createFileLeadStore,
};
