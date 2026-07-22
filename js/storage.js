export function loadAuthSession(storage, key) {
  const saved = readJson(storage, key, null);

  if (!saved?.user || (!saved?.session?.token && saved?.session?.authMode !== "cookie")) {
    return null;
  }

  return {
    user: saved.user,
    token: saved.session.token,
    authMode: saved.session.authMode || (saved.session.token ? "bearer" : ""),
    expiresAt: saved.session.expiresAt,
    lastSyncedAt: typeof saved.lastSyncedAt === "string" ? saved.lastSyncedAt : ""
  };
}

export function saveAuthSession(storage, key, authSession) {
  if (!authSession) {
    storage.removeItem(key);
    return null;
  }

  const normalized = {
    user: authSession.user,
    token: authSession.token || authSession.session?.token,
    authMode: authSession.authMode || authSession.session?.authMode
      || (authSession.token || authSession.session?.token ? "bearer" : ""),
    expiresAt: authSession.expiresAt || authSession.session?.expiresAt,
    lastSyncedAt: authSession.lastSyncedAt || ""
  };

  storage.setItem(key, JSON.stringify({
    user: normalized.user,
    lastSyncedAt: normalized.lastSyncedAt,
    session: {
      token: normalized.token,
      authMode: normalized.authMode,
      expiresAt: normalized.expiresAt
    }
  }));
  return normalized;
}

export function loadSessionFlag(storage, key) {
  try {
    return storage.getItem(key) === "true";
  } catch (error) {
    return false;
  }
}

export function saveSessionFlag(storage, key, enabled) {
  try {
    if (enabled) {
      storage.setItem(key, "true");
    } else {
      storage.removeItem(key);
    }
  } catch (error) {
    // Storage can be unavailable in strict privacy modes.
  }
}

export function loadDailyPlans(storage, key, normalizeTask) {
  const saved = readJson(storage, key, {});

  if (!saved || typeof saved !== "object" || Array.isArray(saved)) {
    return {};
  }

  return Object.fromEntries(Object.entries(saved).map(([date, tasks]) => [
    date,
    Array.isArray(tasks) ? tasks.map(normalizeTask).filter(Boolean) : []
  ]));
}

export function loadStudyGoals(storage, key, normalizeGoal, sortGoals) {
  const saved = readJson(storage, key, []);
  return Array.isArray(saved)
    ? saved.map(normalizeGoal).filter(Boolean).sort(sortGoals)
    : [];
}

export function loadStringSet(storage, key) {
  const saved = readJson(storage, key, []);
  return new Set(Array.isArray(saved) ? saved.filter((value) => typeof value === "string" && value) : []);
}

export function saveJson(storage, key, value) {
  storage.setItem(key, JSON.stringify(value));
}

function readJson(storage, key, fallback) {
  try {
    const value = JSON.parse(storage.getItem(key));
    return value ?? fallback;
  } catch (error) {
    return fallback;
  }
}
