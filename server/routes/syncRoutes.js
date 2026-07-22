export function registerSyncRoutes(app, {
  db,
  goalFromRow,
  petFromRow,
  requireAuth,
  settingsFromRow,
  taskFromRow,
}) {
  app.get("/api/sync", requireAuth, (req, res) => {
    const userId = req.auth.user.id;
    const settings = db.prepare(
      "SELECT * FROM user_settings WHERE user_id = ?",
    ).get(userId);
    const pet = db.prepare("SELECT * FROM pets WHERE user_id = ?").get(userId);
    const tasks = db.prepare(`
      SELECT * FROM tasks
      WHERE user_id = ?
      ORDER BY date_key DESC, created_at ASC
    `).all(userId).map(taskFromRow);
    const studyGoals = db.prepare(`
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
      ORDER BY completed ASC, updated_at DESC
    `).all(userId).map(goalFromRow);
    const focusSessions = db.prepare(`
      SELECT id, client_id AS clientId, task_id AS taskId,
        study_goal_id AS studyGoalId, task_title AS taskTitle, mode,
        date_key AS dateKey, minutes, started_at AS startedAt,
        ended_at AS endedAt, streak, xp_earned AS xpEarned,
        created_at AS createdAt
      FROM focus_sessions
      WHERE user_id = ?
      ORDER BY ended_at DESC
      LIMIT 200
    `).all(userId);

    res.json({
      user: req.auth.user,
      settings: settingsFromRow(settings),
      pet: petFromRow(pet),
      tasks,
      studyGoals,
      focusSessions,
    });
  });
}
