export function registerSystemRoutes(app, {
  db,
  environment,
  getAiStatus,
  storageStatus,
}) {
  app.get("/api/health", (req, res) => {
    res.json({
      ok: true,
      service: "kaoyan-pomodoro-api",
      environment,
      uptimeSeconds: Math.round(process.uptime()),
      database: "sqlite",
      storage: storageStatus,
      ai: getAiStatus(),
    });
  });

  app.get("/api/ready", (req, res, next) => {
    try {
      db.prepare("SELECT 1 AS ok").get();
      res.json({
        ok: true,
        database: "ready",
        storage: storageStatus.status,
        ai: getAiStatus(),
      });
    } catch (error) {
      next(error);
    }
  });
}
