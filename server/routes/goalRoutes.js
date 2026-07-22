import {
  clampInteger,
  normalizeOptionalDateKey,
  normalizeOptionalString,
  normalizeRequiredTitle,
} from "../validation.js";
import { studyGoalToRow } from "../data/rowMappers.js";

export function registerGoalRoutes(app, {
  createId,
  db,
  goalFromRow,
  nowIso,
  requireAuth,
}) {
  app.get("/api/study-goals", requireAuth, (req, res) => {
    const rows = db.prepare(`
      SELECT study_goals.*,
        COALESCE(SUM(CASE WHEN focus_sessions.mode = 'focus' THEN focus_sessions.minutes ELSE 0 END), 0) AS focus_minutes,
        COALESCE(SUM(CASE
          WHEN focus_sessions.mode = 'focus' AND focus_sessions.date_key >= date('now', '-6 days')
          THEN focus_sessions.minutes ELSE 0 END), 0) AS recent_focus_minutes
      FROM study_goals
      LEFT JOIN focus_sessions
        ON focus_sessions.study_goal_id = study_goals.id
        AND focus_sessions.user_id = study_goals.user_id
      WHERE study_goals.user_id = ?
      GROUP BY study_goals.id
      ORDER BY completed, updated_at DESC
    `).all(req.auth.user.id);
    res.json({ studyGoals: rows.map(goalFromRow) });
  });

  app.post("/api/study-goals", requireAuth, (req, res) => {
    const userId = req.auth.user.id;
    const title = normalizeRequiredTitle(req.body?.title, 80);
    if (!title) {
      res.status(400).json({ error: "Study goal cannot be empty." });
      return;
    }
    const clientId = normalizeOptionalString(req.body?.clientId, 120);
    if (clientId) {
      const existing = db.prepare(
        "SELECT * FROM study_goals WHERE user_id = ? AND client_id = ?",
      ).get(userId, clientId);
      if (existing) {
        res.json({ studyGoal: goalFromRow(existing) });
        return;
      }
    }
    const isPrimary = req.body?.isPrimary === true || !db.prepare(
      "SELECT id FROM study_goals WHERE user_id = ? AND completed = 0 LIMIT 1",
    ).get(userId);
    const completed = Number(Boolean(req.body?.completed));
    const goal = {
      id: createId(),
      clientId,
      title,
      description: normalizeOptionalString(req.body?.description, 240) || "",
      targetMinutes: clampInteger(req.body?.targetMinutes, 0, 0, 99999),
      weeklyTargetMinutes: clampInteger(
        req.body?.weeklyTargetMinutes,
        0,
        0,
        10080,
      ),
      targetDate: normalizeOptionalDateKey(req.body?.targetDate),
      isPrimary: Number(isPrimary),
      completed,
      createdAt: nowIso(),
      completedAt: completed ? nowIso() : null,
      updatedAt: nowIso(),
    };
    if (goal.isPrimary) {
      db.prepare(
        "UPDATE study_goals SET is_primary = 0 WHERE user_id = ?",
      ).run(userId);
    }
    db.prepare(`
      INSERT INTO study_goals (
        id, user_id, client_id, title, description, target_minutes,
        weekly_target_minutes, target_date, is_primary, completed,
        created_at, completed_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      goal.id,
      userId,
      goal.clientId,
      goal.title,
      goal.description,
      goal.targetMinutes,
      goal.weeklyTargetMinutes,
      goal.targetDate,
      goal.isPrimary,
      goal.completed,
      goal.createdAt,
      goal.completedAt,
      goal.updatedAt,
    );
    db.prepare(`
      UPDATE user_settings
      SET long_goal_onboarding_completed = 1,
          current_study_goal_id = ?,
          updated_at = ?
      WHERE user_id = ?
    `).run(goal.id, nowIso(), userId);
    res.status(201).json({
      studyGoal: goalFromRow(studyGoalToRow(goal)),
    });
  });

  app.patch("/api/study-goals/:goalId", requireAuth, (req, res) => {
    const userId = req.auth.user.id;
    const current = db.prepare(
      "SELECT * FROM study_goals WHERE id = ? AND user_id = ?",
    ).get(req.params.goalId, userId);
    if (!current) {
      res.status(404).json({ error: "Study goal not found." });
      return;
    }
    const expectedUpdatedAt = normalizeOptionalString(req.body?.expectedUpdatedAt, 40);
    if (expectedUpdatedAt && expectedUpdatedAt !== current.updated_at) {
      res.status(409).json({
        error: "Study goal changed on another device. Replaying the local change is required.",
        code: "GOAL_VERSION_CONFLICT",
        studyGoal: goalFromRow(current),
      });
      return;
    }
    const title = typeof req.body?.title === "string"
      ? normalizeRequiredTitle(req.body.title, 80) || current.title
      : current.title;
    const description = req.body?.description === undefined
      ? current.description
      : normalizeOptionalString(req.body.description, 240) || "";
    const targetMinutes = req.body?.targetMinutes === undefined
      ? current.target_minutes
      : clampInteger(req.body.targetMinutes, current.target_minutes, 0, 99999);
    const weeklyTargetMinutes = req.body?.weeklyTargetMinutes === undefined
      ? current.weekly_target_minutes
      : clampInteger(
          req.body.weeklyTargetMinutes,
          current.weekly_target_minutes,
          0,
          10080,
        );
    const targetDate = req.body?.targetDate === undefined
      ? current.target_date
      : normalizeOptionalDateKey(req.body.targetDate);
    const isPrimary = req.body?.isPrimary === undefined
      ? current.is_primary
      : Number(Boolean(req.body.isPrimary));
    const completed = typeof req.body?.completed === "boolean"
      ? Number(req.body.completed)
      : current.completed;
    const completedAt = completed
      ? current.completed_at || nowIso()
      : null;
    if (isPrimary) {
      db.prepare(
        "UPDATE study_goals SET is_primary = 0 WHERE user_id = ?",
      ).run(userId);
    }
    db.prepare(`
      UPDATE study_goals
      SET title = ?, description = ?, target_minutes = ?,
          weekly_target_minutes = ?, target_date = ?, is_primary = ?,
          completed = ?, completed_at = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(
      title,
      description,
      targetMinutes,
      weeklyTargetMinutes,
      targetDate,
      isPrimary,
      completed,
      completedAt,
      nowIso(),
      req.params.goalId,
      userId,
    );
    const goal = db.prepare("SELECT * FROM study_goals WHERE id = ?").get(
      req.params.goalId,
    );
    res.json({ studyGoal: goalFromRow(goal) });
  });

  app.delete("/api/study-goals/:goalId", requireAuth, (req, res) => {
    const result = db.prepare(
      "DELETE FROM study_goals WHERE id = ? AND user_id = ?",
    ).run(req.params.goalId, req.auth.user.id);
    if (!result.changes) {
      res.status(404).json({ error: "Study goal not found." });
      return;
    }
    res.status(204).end();
  });
}
