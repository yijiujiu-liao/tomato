import { countCurrentStreakDays } from "../stats.js";

export function createStatsService(db) {
  function getRangeStart(range) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    if (range === "week") {
      date.setDate(date.getDate() - 6);
    } else if (range === "month") {
      date.setDate(date.getDate() - 29);
    }
    return date;
  }

  function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function buildDays(startDate, endDate, rows) {
    const valuesByDate = new Map(rows.map((row) => [
      row.date,
      {
        completedCount: Number(row.completedCount) || 0,
        focusMinutes: Number(row.focusMinutes) || 0,
        xpEarned: Number(row.xpEarned) || 0,
      },
    ]));
    const days = [];
    const cursor = new Date(startDate);
    const end = new Date(endDate);
    cursor.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    while (cursor <= end) {
      const dateKey = formatDateKey(cursor);
      days.push({
        date: dateKey,
        ...(valuesByDate.get(dateKey) || {
          completedCount: 0,
          focusMinutes: 0,
          xpEarned: 0,
        }),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }

  function buildSummary(days, totals) {
    const activeDays = days.filter((day) => day.focusMinutes > 0);
    const bestDay = activeDays.reduce(
      (best, day) => (!best || day.focusMinutes > best.focusMinutes ? day : best),
      null,
    );
    return {
      activeDays: activeDays.length,
      averageDailyMinutes: days.length > 0
        ? Math.round(totals.focusMinutes / days.length)
        : 0,
      averageActiveDayMinutes: activeDays.length > 0
        ? Math.round(totals.focusMinutes / activeDays.length)
        : 0,
      currentStreakDays: countCurrentStreakDays(days),
      bestDay: bestDay ? {
        date: bestDay.date,
        focusMinutes: bestDay.focusMinutes,
        completedCount: bestDay.completedCount,
      } : null,
    };
  }

  function getStats(userId, range) {
    const startDate = getRangeStart(range);
    const endDate = new Date();
    const rows = db.prepare(`
      SELECT
        date_key AS date,
        COUNT(*) AS completedCount,
        COALESCE(SUM(minutes), 0) AS focusMinutes,
        COALESCE(SUM(xp_earned), 0) AS xpEarned
      FROM focus_sessions
      WHERE user_id = ? AND mode = 'focus' AND date_key >= ?
      GROUP BY date_key
    `).all(userId, formatDateKey(startDate));
    const days = buildDays(startDate, endDate, rows);
    const totals = days.reduce((result, day) => ({
      completedCount: result.completedCount + day.completedCount,
      focusMinutes: result.focusMinutes + day.focusMinutes,
      xpEarned: result.xpEarned + day.xpEarned,
    }), { completedCount: 0, focusMinutes: 0, xpEarned: 0 });

    return {
      range,
      startDate,
      endDate,
      days,
      totals,
      summary: buildSummary(days, totals),
    };
  }

  return { formatDateKey, getStats };
}
