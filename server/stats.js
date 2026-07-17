export function countCurrentStreakDays(days) {
  if (!Array.isArray(days) || days.length === 0) return 0;

  let index = days.length - 1;
  if ((Number(days[index]?.focusMinutes) || 0) <= 0) {
    index -= 1;
  }

  let streak = 0;
  for (; index >= 0; index -= 1) {
    if ((Number(days[index]?.focusMinutes) || 0) <= 0) break;
    streak += 1;
  }
  return streak;
}
