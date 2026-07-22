import { createHash } from "node:crypto";
import { normalizeDateKey } from "../validation.js";

export function registerAiRoutes(app, {
  aiRateLimit,
  config,
  db,
  nowIso,
  requireAuth,
  service,
}) {
  app.get("/api/ai/daily-summary", requireAuth, (req, res, next) => {
    try {
      const dateKey = normalizeDateKey(req.query.dateKey);
      const summary = service.getStoredSummary(req.auth.user.id, dateKey);
      if (!summary) {
        res.status(404).json({
          code: "AI_SUMMARY_NOT_FOUND",
          error: "No summary exists for this date.",
        });
        return;
      }
      res.json(summary);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/ai/daily-summary", requireAuth, async (req, res, next) => {
    try {
      const userId = req.auth.user.id;
      const dateKey = normalizeDateKey(req.body?.dateKey);
      const context = service.buildContext(userId, dateKey);
      const sourceFingerprint = createHash("sha256")
        .update(JSON.stringify(context))
        .digest("hex");
      const stored = service.getStoredSummary(userId, dateKey);
      if (stored && !req.body?.force && stored.sourceFingerprint === sourceFingerprint) {
        res.json({ ...stored, cached: true });
        return;
      }
      if (!service.isConfigured()) {
        res.status(503).json({
          code: "AI_NOT_CONFIGURED",
          error: "AI 总结尚未配置，请先在服务器设置 API Key。",
        });
        return;
      }
      if (!aiRateLimit.consume(req, res)) {
        return;
      }
      const summary = await service.generate(context);
      const generatedAt = nowIso();
      db.prepare(`
        INSERT INTO ai_daily_summaries (
          user_id, date_key, provider, model, summary_json,
          source_fingerprint, generated_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, date_key) DO UPDATE SET
          provider = excluded.provider,
          model = excluded.model,
          summary_json = excluded.summary_json,
          source_fingerprint = excluded.source_fingerprint,
          generated_at = excluded.generated_at,
          updated_at = excluded.updated_at
      `).run(
        userId,
        dateKey,
        config.aiProvider,
        service.getModel(),
        JSON.stringify(summary),
        sourceFingerprint,
        generatedAt,
        generatedAt,
      );
      res.json({
        dateKey,
        model: service.getModel(),
        source: config.aiProvider,
        sourceFingerprint,
        generatedAt,
        summary,
        cached: false,
      });
    } catch (error) {
      next(error);
    }
  });
}
