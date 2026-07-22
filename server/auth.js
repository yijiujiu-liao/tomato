import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { config } from "./config.js";
import { createDefaultUserState, createId, db, nowIso } from "./db.js";
import { clearAuthCookies, readAuthCookies } from "./sessionCookies.js";

const PASSWORD_KEY_LENGTH = 64;
const MAX_PASSWORD_LENGTH = 128;
const MAX_EMAIL_LENGTH = 254;
const MAX_DISPLAY_NAME_LENGTH = 60;

export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString("hex");

  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  const candidate = typeof password === "string" ? password : "";
  if (candidate.length < 8 || candidate.length > MAX_PASSWORD_LENGTH) {
    return false;
  }

  const [salt, hash] = String(storedHash).split(":");

  if (!salt || !hash) {
    return false;
  }

  const derived = scryptSync(candidate, salt, PASSWORD_KEY_LENGTH);
  const expected = Buffer.from(hash, "hex");

  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export function createUser({ email, password, displayName } = {}) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const cleanDisplayName = (
    String(displayName || "").trim()
    || normalizedEmail.split("@")[0]
    || "学习者"
  ).slice(0, MAX_DISPLAY_NAME_LENGTH);

  if (
    normalizedEmail.length > MAX_EMAIL_LENGTH
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    throw Object.assign(new Error("请输入有效邮箱。"), { statusCode: 400 });
  }

  if (String(password || "").length < 8) {
    throw Object.assign(new Error("密码至少需要 8 位。"), { statusCode: 400 });
  }

  if (String(password).length > MAX_PASSWORD_LENGTH) {
    throw Object.assign(new Error("密码不能超过 128 位。"), { statusCode: 400 });
  }

  const userId = createId();
  const createdAt = nowIso();

  try {
    db.prepare(`
      INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, normalizedEmail, cleanDisplayName, hashPassword(password), createdAt, createdAt);
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) {
      throw Object.assign(new Error("这个邮箱已经注册。"), { statusCode: 409 });
    }

    throw error;
  }

  createDefaultUserState(userId);

  return getUserById(userId);
}

export function getUserByEmail(email) {
  return db.prepare(`
    SELECT id, email, display_name, password_hash, created_at, updated_at
    FROM users
    WHERE email = ?
  `).get(String(email || "").trim().toLowerCase());
}

export function getUserById(userId) {
  const user = db.prepare(`
    SELECT id, email, display_name, created_at, updated_at
    FROM users
    WHERE id = ?
  `).get(userId);

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}

export function createSession(userId) {
  pruneExpiredSessions();
  const token = randomBytes(32).toString("base64url");
  const csrfToken = randomBytes(32).toString("base64url");
  const id = createId();
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + config.sessionTtlDays * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, csrf_token_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, userId, hashToken(token), hashToken(csrfToken), expiresAt, createdAt);

  return {
    id,
    token,
    csrfToken,
    expiresAt
  };
}

export function pruneExpiredSessions(currentTime = nowIso()) {
  return db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(currentTime).changes;
}

export function refreshSessionCsrf(sessionId) {
  const csrfToken = randomBytes(32).toString("base64url");
  db.prepare("UPDATE sessions SET csrf_token_hash = ? WHERE id = ?")
    .run(hashToken(csrfToken), sessionId);
  return csrfToken;
}

export function deleteSession(session) {
  if (!session) {
    return;
  }

  if (typeof session === "object" && session.sessionId) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(session.sessionId);
    return;
  }

  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(String(session)));
}

export function requireAuth(req, res, next) {
  const cookies = readAuthCookies(req);
  const header = req.get("authorization") || "";
  const bearerToken = header.startsWith("Bearer ") ? header.slice(7) : "";
  const candidates = [
    ...(cookies.sessionToken ? [{ token: cookies.sessionToken, method: "cookie" }] : []),
    ...(bearerToken ? [{ token: bearerToken, method: "bearer" }] : []),
  ];

  if (!candidates.length) {
    res.status(401).json({ error: "请先登录。" });
    return;
  }

  let authenticated = null;
  for (const candidate of candidates) {
    const session = db.prepare(`
      SELECT sessions.id, sessions.user_id, sessions.csrf_token_hash, sessions.expires_at
      FROM sessions
      WHERE sessions.token_hash = ?
    `).get(hashToken(candidate.token));

    if (session && new Date(session.expires_at).getTime() > Date.now()) {
      authenticated = { ...candidate, session };
      break;
    }
    if (session) db.prepare("DELETE FROM sessions WHERE id = ?").run(session.id);
  }

  if (!authenticated) {
    if (cookies.sessionToken) clearAuthCookies(res);
    res.status(401).json({ error: "登录状态已失效，请重新登录。" });
    return;
  }

  const { method, session, token } = authenticated;

  if (method === "cookie" && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const headerToken = req.get("x-csrf-token") || "";
    const matchingCookie = headerToken && cookies.csrfToken === headerToken;
    const matchingSession = session.csrf_token_hash && safeTokenHashMatch(headerToken, session.csrf_token_hash);
    if (!matchingCookie || !matchingSession) {
      res.status(403).json({
        error: "安全验证失败，请刷新页面后重试。",
        code: "CSRF_VALIDATION_FAILED",
      });
      return;
    }
  }

  const user = getUserById(session.user_id);

  if (!user) {
    if (method === "cookie") clearAuthCookies(res);
    res.status(401).json({ error: "用户不存在。" });
    return;
  }

  req.auth = {
    method,
    sessionId: session.id,
    token,
    expiresAt: session.expires_at,
    csrfValid: safeTokenHashMatch(cookies.csrfToken, session.csrf_token_hash),
    user,
  };
  next();
}

function safeTokenHashMatch(token, expectedHash) {
  if (!token || !expectedHash) return false;
  const candidate = Buffer.from(hashToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
