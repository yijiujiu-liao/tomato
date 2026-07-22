import {
  clearAuthCookies,
  publicSession,
  setAuthCookies,
  setCsrfCookie,
  readAuthCookies,
} from "../sessionCookies.js";

export function registerAuthRoutes(app, {
  authRateLimit,
  createSession,
  createUser,
  deleteSession,
  getUserByEmail,
  refreshSessionCsrf,
  requireAuth,
  verifyPassword,
}) {
  app.post("/api/auth/register", authRateLimit, (req, res, next) => {
    try {
      const user = createUser(req.body || {});
      const session = createSession(user.id);
      setAuthCookies(res, session);
      res.status(201).json({ user, session: publicSession(session) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/login", authRateLimit, (req, res, next) => {
    try {
      const user = getUserByEmail(req.body?.email);
      if (!user || !verifyPassword(req.body?.password, user.password_hash)) {
        res.status(401).json({ error: "邮箱或密码不正确。" });
        return;
      }
      const session = createSession(user.id);
      setAuthCookies(res, session);
      res.json({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        },
        session: publicSession(session),
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/logout", requireAuth, (req, res) => {
    deleteSession(req.auth);
    clearAuthCookies(res);
    res.status(204).end();
  });

  app.get("/api/auth/session", (req, res, next) => {
    const hasCookie = Boolean(readAuthCookies(req).sessionToken);
    const hasBearer = (req.get("authorization") || "").startsWith("Bearer ");
    if (!hasCookie && !hasBearer) {
      res.status(204).end();
      return;
    }
    next();
  }, requireAuth, (req, res) => {
    if (req.auth.method === "bearer") {
      const migratedSession = createSession(req.auth.user.id);
      setAuthCookies(res, migratedSession);
      deleteSession(req.auth);
      res.json({
        user: req.auth.user,
        session: publicSession(migratedSession),
      });
      return;
    }

    if (req.auth.method === "cookie" && !req.auth.csrfValid) {
      const csrfToken = refreshSessionCsrf(req.auth.sessionId);
      setCsrfCookie(res, csrfToken, req.auth.expiresAt);
    }
    res.json({
      user: req.auth.user,
      session: {
        authMode: "cookie",
        expiresAt: req.auth.expiresAt,
      },
    });
  });

  app.get("/api/me", requireAuth, (req, res) => {
    res.json({ user: req.auth.user });
  });
}
