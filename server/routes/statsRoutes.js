export function registerStatsRoutes(app, {
  db,
  requireAuth,
  statsService,
}) {
  app.get("/api/stats", requireAuth, (req, res) => {
    const range = ["day", "week", "month"].includes(req.query.range)
      ? req.query.range
      : "day";
    const result = statsService.getStats(req.auth.user.id, range);
    const goalBreakdown = db.prepare(`
      SELECT study_goals.id, study_goals.title,
        study_goals.is_primary AS isPrimary,
        COALESCE(SUM(focus_sessions.minutes), 0) AS focusMinutes,
        COUNT(focus_sessions.id) AS completedCount
      FROM study_goals
      LEFT JOIN focus_sessions
        ON focus_sessions.study_goal_id = study_goals.id
        AND focus_sessions.user_id = study_goals.user_id
        AND focus_sessions.mode = 'focus'
        AND focus_sessions.date_key >= ?
      WHERE study_goals.user_id = ?
      GROUP BY study_goals.id
      ORDER BY isPrimary DESC, focusMinutes DESC
    `).all(
      statsService.formatDateKey(result.startDate),
      req.auth.user.id,
    ).map((goal) => ({
      id: goal.id,
      title: goal.title,
      isPrimary: Boolean(goal.isPrimary),
      focusMinutes: Number(goal.focusMinutes) || 0,
      completedCount: Number(goal.completedCount) || 0,
    }));
    res.json({
      range,
      startAt: result.startDate.toISOString(),
      endAt: result.endDate.toISOString(),
      totals: result.totals,
      summary: {
        activeDays: result.summary.activeDays,
        averageDailyMinutes: result.summary.averageDailyMinutes,
        averageActiveDayMinutes: result.summary.averageActiveDayMinutes,
        currentStreakDays: result.summary.currentStreakDays,
        bestDay: result.summary.bestDay,
      },
      days: result.days,
      goalBreakdown,
    });
  });
}
