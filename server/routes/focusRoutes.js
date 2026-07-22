import {
  clampInteger,
  normalizeDateKey,
  normalizeOptionalString,
  normalizeTimestamp,
} from "../validation.js";

export function registerFocusRoutes(app, {
  createId,
  db,
  nowIso,
  relations,
  requireAuth,
}) {
  app.post("/api/focus-sessions", requireAuth, (req, res) => {
    const minutes = clampInteger(req.body?.minutes, 50, 1, 180);
    const endedAt = req.body?.endedAt
      ? normalizeTimestamp(req.body.endedAt)
      : nowIso();
    const startedAt = req.body?.startedAt
      ? normalizeTimestamp(req.body.startedAt)
      : new Date(new Date(endedAt).getTime() - minutes * 60000).toISOString();
    if (!endedAt || !startedAt) {
      res.status(400).json({ error: "专注记录时间格式不正确。" });
      return;
    }
    if (new Date(startedAt).getTime() > new Date(endedAt).getTime()) {
      res.status(400).json({ error: "专注开始时间不能晚于结束时间。" });
      return;
    }
    const userId = req.auth.user.id;
    const clientId = normalizeOptionalString(req.body?.clientId, 120);
    if (clientId) {
      const existing = db.prepare(`
        SELECT id, client_id AS clientId, task_id AS taskId,
          study_goal_id AS studyGoalId, task_title AS taskTitle, mode,
          date_key AS dateKey, minutes, started_at AS startedAt,
          ended_at AS endedAt, streak, xp_earned AS xpEarned,
          created_at AS createdAt
        FROM focus_sessions
        WHERE user_id = ? AND client_id = ?
      `).get(userId, clientId);
      if (existing) {
        res.json({ focusSession: existing });
        return;
      }
    }
    const session = {
      id: createId(),
      clientId,
      taskId: relations.normalizeTaskId(userId, req.body?.taskId),
      studyGoalId: relations.normalizeStudyGoalId(
        userId,
        req.body?.studyGoalId,
      ),
      taskTitle: String(req.body?.taskTitle || "Untitled focus")
        .trim()
        .slice(0, 80),
      mode: req.body?.mode === "rest" ? "rest" : "focus",
      dateKey: normalizeDateKey(req.body?.dateKey || endedAt.slice(0, 10)),
      minutes,
      startedAt,
      endedAt,
      streak: clampInteger(req.body?.streak, 0, 0, 999),
      xpEarned: clampInteger(
        req.body?.xpEarned,
        minutes,
        0,
        Math.ceil(minutes * 1.2),
      ),
      createdAt: nowIso(),
    };
    db.prepare(`
      INSERT INTO focus_sessions (
        id, user_id, client_id, task_id, study_goal_id, task_title,
        mode, date_key, minutes, started_at, ended_at, streak,
        xp_earned, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      session.id,
      userId,
      session.clientId,
      session.taskId,
      session.studyGoalId,
      session.taskTitle,
      session.mode,
      session.dateKey,
      session.minutes,
      session.startedAt,
      session.endedAt,
      session.streak,
      session.xpEarned,
      session.createdAt,
    );
    res.status(201).json({ focusSession: session });
  });
}
