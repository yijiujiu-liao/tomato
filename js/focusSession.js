import { addPetExperience } from "./pet.js";
import { normalizeNonNegativeInteger } from "./utils.js";

export function completeFocusSession({ data, minutes, recordId, dateKey, now = new Date() }) {
  const duration = Math.max(1, normalizeNonNegativeInteger(minutes));
  const endedAt = now.toISOString();
  const startedAt = new Date(now.getTime() - duration * 60 * 1000).toISOString();
  data.completedCount = normalizeNonNegativeInteger(data.completedCount) + 1;
  data.streak = normalizeNonNegativeInteger(data.streak) + 1;
  data.focusMinutes = normalizeNonNegativeInteger(data.focusMinutes) + duration;

  const { progress, reward } = addPetExperience(data.petProgress, duration, data.streak);
  data.petProgress = progress;
  data.todayPetXP = normalizeNonNegativeInteger(data.todayPetXP) + reward.totalXP;
  const record = {
    id: recordId,
    syncedSessionId: "",
    taskId: data.currentTaskId || "",
    studyGoalId: data.currentStudyGoalId || "",
    time: now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
    task: data.currentTask || "未命名学习任务",
    minutes: duration,
    streak: data.streak,
    xpEarned: reward.totalXP,
    startedAt,
    endedAt,
    dateKey,
  };
  data.records.unshift(record);
  data.nextRestType = data.completedCount % 4 === 0 ? "long" : "short";
  return { record, reward, nextRestType: data.nextRestType };
}

export function clearTodaySessionData(data) {
  data.completedCount = 0;
  data.focusMinutes = 0;
  data.streak = 0;
  data.records = [];
  data.todayPetXP = 0;
  data.nextRestType = "short";
  return data;
}
