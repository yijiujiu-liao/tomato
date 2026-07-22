export function registerAuthRoutes(app, {
  authRateLimit,
  createSession,
  createUser,
  deleteSession,
  getUserByEmail,
  requireAuth,
  verifyPassword,
}) {
  app.post("/api/auth/register", authRateLimit, (req, res, next) => {
    try {
      const user = createUser(req.body || {});
      const session = createSession(user.id);
      res.status(201).json({ user, session });
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
      res.json({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        },
        session: createSession(user.id),
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/logout", requireAuth, (req, res) => {
    deleteSession(req.auth.token);
    res.status(204).end();
  });

  app.get("/api/me", requireAuth, (req, res) => {
    res.json({ user: req.auth.user });
  });
}
