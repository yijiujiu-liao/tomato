const MAX_RETRY_DELAY_MS = 60_000;

export function createSyncOutbox({ storage, key, now = () => Date.now(), createId = defaultId }) {
  let entries = loadEntries(storage, key);

  function persist() {
    storage.setItem(key, JSON.stringify(entries));
  }

  function enqueue({ type, dedupeKey, payload = {} }) {
    if (!type || !dedupeKey) throw new Error("Outbox entry requires type and dedupeKey.");
    const existing = entries.find((entry) => entry.dedupeKey === dedupeKey);
    const timestamp = now();

    if (existing) {
      existing.type = type;
      existing.payload = clonePayload(payload);
      existing.updatedAt = timestamp;
      existing.attempts = 0;
      existing.nextAttemptAt = 0;
      existing.lastError = "";
      persist();
      return { ...existing, payload: clonePayload(existing.payload) };
    }

    const entry = {
      id: createId(),
      type,
      dedupeKey,
      payload: clonePayload(payload),
      createdAt: timestamp,
      updatedAt: timestamp,
      attempts: 0,
      nextAttemptAt: 0,
      lastError: "",
    };
    entries.push(entry);
    persist();
    return { ...entry, payload: clonePayload(entry.payload) };
  }

  function remove(entryId) {
    const previousLength = entries.length;
    entries = entries.filter((entry) => entry.id !== entryId);
    if (entries.length !== previousLength) persist();
  }

  function cancel(dedupeKey) {
    const previousLength = entries.length;
    entries = entries.filter((entry) => entry.dedupeKey !== dedupeKey);
    if (entries.length !== previousLength) persist();
  }

  function markFailed(entryId, error) {
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) return;
    entry.attempts += 1;
    entry.updatedAt = now();
    entry.nextAttemptAt = entry.updatedAt + getRetryDelay(entry.attempts);
    entry.lastError = String(error?.message || error || "同步失败").slice(0, 240);
    persist();
  }

  function getReady({ force = false } = {}) {
    const timestamp = now();
    return entries
      .filter((entry) => force || entry.nextAttemptAt <= timestamp)
      .sort((first, second) => first.createdAt - second.createdAt)
      .map((entry) => ({ ...entry, payload: clonePayload(entry.payload) }));
  }

  function getEntries() {
    return entries.map((entry) => ({ ...entry, payload: clonePayload(entry.payload) }));
  }

  function clear() {
    entries = [];
    persist();
  }

  return { enqueue, remove, cancel, markFailed, getReady, getEntries, clear };
}

export function getRetryDelay(attempts) {
  return Math.min(MAX_RETRY_DELAY_MS, 1000 * (2 ** Math.max(0, attempts - 1)));
}

function loadEntries(storage, key) {
  try {
    const parsed = JSON.parse(storage.getItem(key) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidEntry).map((entry) => ({
      ...entry,
      payload: clonePayload(entry.payload),
      attempts: Math.max(0, Number(entry.attempts) || 0),
      nextAttemptAt: Math.max(0, Number(entry.nextAttemptAt) || 0),
      lastError: typeof entry.lastError === "string" ? entry.lastError : "",
    }));
  } catch {
    return [];
  }
}

function isValidEntry(entry) {
  return entry
    && typeof entry.id === "string"
    && typeof entry.type === "string"
    && typeof entry.dedupeKey === "string"
    && entry.payload
    && typeof entry.payload === "object";
}

function clonePayload(payload) {
  return JSON.parse(JSON.stringify(payload || {}));
}

function defaultId() {
  return globalThis.crypto?.randomUUID?.() || `outbox-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
