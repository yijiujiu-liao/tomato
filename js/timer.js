export function createTimerDeadline(remainingSeconds, now = Date.now()) {
  const seconds = Math.max(0, Math.floor(Number(remainingSeconds) || 0));
  return now + seconds * 1000;
}

export function getRemainingSeconds(deadline, now = Date.now()) {
  const deadlineMs = Number(deadline);

  if (!Number.isFinite(deadlineMs)) {
    return 0;
  }

  return Math.max(0, Math.ceil((deadlineMs - now) / 1000));
}

export function normalizeActiveTimer(value) {
  const endsAt = new Date(value?.endsAt).getTime();

  if (!Number.isFinite(endsAt) || !["focus", "rest"].includes(value?.mode)) {
    return null;
  }

  return {
    date: typeof value.date === "string" ? value.date : "",
    mode: value.mode,
    endsAt: new Date(endsAt).toISOString()
  };
}

export function createActiveTimerSnapshot({ date, mode, endsAt }) {
  return normalizeActiveTimer({
    date,
    mode,
    endsAt: new Date(endsAt).toISOString()
  });
}

export function restoreActiveTimerSnapshot(value, { todayKey, now = Date.now(), getDateKey }) {
  const activeTimer = normalizeActiveTimer(value);

  if (!activeTimer) {
    return { status: "invalid" };
  }

  const endsAt = new Date(activeTimer.endsAt).getTime();
  if (getDateKey(new Date(endsAt)) !== todayKey) {
    return { status: "outdated" };
  }

  const remainingSeconds = getRemainingSeconds(endsAt, now);
  return {
    status: remainingSeconds > 0 ? "running" : "expired",
    mode: activeTimer.mode,
    endsAt,
    remainingSeconds
  };
}
