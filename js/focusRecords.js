import { createClientId, getDateKey, normalizeNonNegativeInteger } from "./utils.js";

export function normalizeFocusRecord(record) {
  if (!record || typeof record !== "object") {
    return null;
  }

  const endedAt = Number.isNaN(new Date(record.endedAt).getTime())
    ? new Date().toISOString()
    : record.endedAt;
  const minutes = normalizeNonNegativeInteger(record.minutes);

  return {
    id: typeof record.id === "string" && record.id ? record.id : createClientId("focus"),
    syncedSessionId: typeof record.syncedSessionId === "string" ? record.syncedSessionId : "",
    taskId: typeof record.taskId === "string" ? record.taskId : "",
    studyGoalId: typeof record.studyGoalId === "string" ? record.studyGoalId : "",
    time: typeof record.time === "string" && record.time
      ? record.time
      : new Date(endedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
    task: typeof record.task === "string" && record.task ? record.task : "未命名学习任务",
    minutes,
    streak: normalizeNonNegativeInteger(record.streak),
    xpEarned: normalizeNonNegativeInteger(record.xpEarned || minutes),
    startedAt: Number.isNaN(new Date(record.startedAt).getTime())
      ? new Date(new Date(endedAt).getTime() - minutes * 60 * 1000).toISOString()
      : record.startedAt,
    endedAt,
    dateKey: typeof record.dateKey === "string" && record.dateKey
      ? record.dateKey
      : getDateKey(new Date(endedAt))
  };
}

export function getFocusRecordKey(record) {
  return record.syncedSessionId || record.id || `${record.endedAt}-${record.task}-${record.minutes}`;
}

export function inferTodayPetXP(records) {
  return Array.isArray(records)
    ? records.reduce((total, record) => total + normalizeNonNegativeInteger(record?.xpEarned), 0)
    : 0;
}

export function normalizeTodayPetXP(value, totalXP = 0) {
  return Math.min(normalizeNonNegativeInteger(value), normalizeNonNegativeInteger(totalXP));
}
