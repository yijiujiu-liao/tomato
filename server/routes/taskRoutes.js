import {
  clampInteger,
  normalizeDateKey,
  normalizeOptionalDateKey,
  normalizeOptionalString,
  normalizeTaskSource,
} from "../validation.js";
import { taskToRow } from "../data/rowMappers.js";

export function registerTaskRoutes(app, {
  createId,
  db,
  nowIso,
  relations,
  requireAuth,
  taskFromRow,
}) {
  app.get("/api/tasks", requireAuth, (req, res) => {
    const rows = db.prepare(`
      SELECT * FROM tasks
      WHERE user_id = ? AND date_key = ?
      ORDER BY completed, created_at
    `).all(req.auth.user.id, normalizeDateKey(req.query.date));
    res.json({ tasks: rows.map(taskFromRow) });
  });

  app.post("/api/tasks", requireAuth, (req, res) => {
    const title = String(req.body?.title || "").trim();
    if (!title) {
      res.status(400).json({ error: "Task title is required." });
      return;
    }
    const userId = req.auth.user.id;
    const clientId = normalizeOptionalString(req.body?.clientId, 120);
    const source = normalizeTaskSource(req.body?.source);
    const sourceLabel = source
      ? normalizeOptionalString(req.body?.sourceLabel, 24)
      : null;
    const sourceDateKey = source
      ? normalizeOptionalDateKey(req.body?.sourceDateKey)
      : null;
    const suggestedForDate = source
      ? normalizeOptionalDateKey(req.body?.suggestedForDate)
      : null;
    const aiGeneratedAt = source
      ? normalizeOptionalString(req.body?.aiGeneratedAt, 40)
      : null;
    const studyGoalId = relations.normalizeStudyGoalId(
      userId,
      req.body?.studyGoalId,
    );

    if (clientId) {
      const existing = db.prepare(
        "SELECT * FROM tasks WHERE user_id = ? AND client_id = ?",
      ).get(userId, clientId);
      if (existing) {
        if ((source && !existing.source) || (studyGoalId && !existing.study_goal_id)) {
          db.prepare(`
            UPDATE tasks
            SET source = COALESCE(source, ?),
                source_label = COALESCE(source_label, ?),
                source_date_key = COALESCE(source_date_key, ?),
                suggested_for_date = COALESCE(suggested_for_date, ?),
                ai_generated_at = COALESCE(ai_generated_at, ?),
                study_goal_id = COALESCE(study_goal_id, ?),
                updated_at = ?
            WHERE id = ? AND user_id = ?
          `).run(
            source,
            sourceLabel,
            sourceDateKey,
            suggestedForDate,
            aiGeneratedAt,
            studyGoalId,
            nowIso(),
            existing.id,
            userId,
          );
          const updated = db.prepare(
            "SELECT * FROM tasks WHERE id = ? AND user_id = ?",
          ).get(existing.id, userId);
          res.json({ task: taskFromRow(updated) });
          return;
        }
        res.json({ task: taskFromRow(existing) });
        return;
      }
    }

    const completed = Number(Boolean(req.body?.completed));
    const createdAt = nowIso();
    const task = {
      id: createId(),
      clientId,
      dateKey: normalizeDateKey(req.body?.dateKey),
      title: title.slice(0, 60),
      studyGoalId,
      completed,
      createdAt,
      completedAt: completed ? createdAt : null,
      carriedFromId: normalizeOptionalString(req.body?.carriedFromId, 120),
      source,
      sourceLabel,
      sourceDateKey,
      suggestedForDate,
      aiGeneratedAt,
      xpEarned: clampInteger(req.body?.xpEarned, 0, 0, 1000),
      updatedAt: nowIso(),
    };
    db.prepare(`
      INSERT INTO tasks (
        id, user_id, client_id, date_key, title, completed, created_at,
        completed_at, carried_from_id, source, source_label, source_date_key,
        suggested_for_date, ai_generated_at, xp_earned, study_goal_id, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      task.id,
      userId,
      task.clientId,
      task.dateKey,
      task.title,
      task.completed,
      task.createdAt,
      task.completedAt,
      task.carriedFromId,
      task.source,
      task.sourceLabel,
      task.sourceDateKey,
      task.suggestedForDate,
      task.aiGeneratedAt,
      task.xpEarned,
      task.studyGoalId,
      task.updatedAt,
    );
    res.status(201).json({ task: taskFromRow(taskToRow(task)) });
  });

  app.patch("/api/tasks/:taskId", requireAuth, (req, res) => {
    const userId = req.auth.user.id;
    const current = db.prepare(
      "SELECT * FROM tasks WHERE id = ? AND user_id = ?",
    ).get(req.params.taskId, userId);
    if (!current) {
      res.status(404).json({ error: "Task not found." });
      return;
    }
    const expectedUpdatedAt = normalizeOptionalString(req.body?.expectedUpdatedAt, 40);
    if (expectedUpdatedAt && expectedUpdatedAt !== current.updated_at) {
      res.status(409).json({
        error: "Task changed on another device. Replaying the local change is required.",
        code: "TASK_VERSION_CONFLICT",
        task: taskFromRow(current),
      });
      return;
    }
    const completed = typeof req.body?.completed === "boolean"
      ? Number(req.body.completed)
      : current.completed;
    const completedAt = completed
      ? current.completed_at || nowIso()
      : null;
    const title = typeof req.body?.title === "string" && req.body.title.trim()
      ? req.body.title.trim().slice(0, 60)
      : current.title;
    const xpEarned = Math.max(
      Number(current.xp_earned) || 0,
      clampInteger(req.body?.xpEarned, 0, 0, 1000),
    );
    const studyGoalId = req.body?.studyGoalId === undefined
      ? current.study_goal_id
      : relations.normalizeStudyGoalId(userId, req.body.studyGoalId);
    db.prepare(`
      UPDATE tasks
      SET title = ?, completed = ?, completed_at = ?, xp_earned = ?,
          study_goal_id = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(
      title,
      completed,
      completedAt,
      xpEarned,
      studyGoalId,
      nowIso(),
      req.params.taskId,
      userId,
    );
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(
      req.params.taskId,
    );
    res.json({ task: taskFromRow(task) });
  });

  app.delete("/api/tasks/:taskId", requireAuth, (req, res) => {
    const result = db.prepare(
      "DELETE FROM tasks WHERE id = ? AND user_id = ?",
    ).run(req.params.taskId, req.auth.user.id);
    if (!result.changes) {
      res.status(404).json({ error: "Task not found." });
      return;
    }
    res.status(204).end();
  });
}
