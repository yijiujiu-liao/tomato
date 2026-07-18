import { getFocusRecordKey } from "./focusRecords.js";
import { normalizeStudyGoal, sortStudyGoals } from "./goals.js";
import { normalizeTask } from "./tasks.js";
import { getDateKey } from "./utils.js";

export function mergeCloudTasks({ cloudTasks, dailyPlans, deletedTaskIds, todayKey }) {
  if (!Array.isArray(cloudTasks)) {
    return dailyPlans;
  }

  const localMetadata = buildLocalTaskMetadataIndex(dailyPlans);
  const cloudPlans = cloudTasks
    .filter((task) => !deletedTaskIds.has(task.id))
    .reduce((plans, task) => {
      const dateKey = task.dateKey || todayKey;
      const metadata = findLocalTaskMetadata(localMetadata, dateKey, task);

      if (!plans[dateKey]) {
        plans[dateKey] = [];
      }

      plans[dateKey].push(normalizeTask({
        id: task.id,
        clientId: task.clientId,
        syncedTaskId: task.id,
        title: task.title,
        studyGoalId: task.studyGoalId || metadata?.studyGoalId || "",
        completed: task.completed,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
        carriedFromId: task.carriedFromId ?? metadata?.carriedFromId,
        xpEarned: metadata?.xpEarned,
        source: task.source || metadata?.source,
        sourceLabel: task.sourceLabel || metadata?.sourceLabel,
        sourceDateKey: task.sourceDateKey || metadata?.sourceDateKey,
        suggestedForDate: task.suggestedForDate || metadata?.suggestedForDate,
        aiGeneratedAt: task.aiGeneratedAt || metadata?.aiGeneratedAt
      }));

      return plans;
    }, {});
  const cloudKeys = new Set(cloudTasks.map((task) => task.clientId || task.id));

  Object.entries(dailyPlans).forEach(([dateKey, localTasks]) => {
    const unsyncedTasks = localTasks.filter((task) => (
      !task.syncedTaskId && !cloudKeys.has(task.clientId || task.id)
    ));

    if (unsyncedTasks.length > 0) {
      cloudPlans[dateKey] ||= [];
      cloudPlans[dateKey].push(...unsyncedTasks);
    }
  });

  return cloudPlans;
}

export function buildLocalTaskMetadataIndex(dailyPlans) {
  const index = new Map();

  Object.entries(dailyPlans).forEach(([dateKey, tasks]) => {
    tasks.forEach((task) => {
      const keys = [
        task.syncedTaskId,
        task.clientId,
        task.id,
        `${dateKey}:${task.title.trim().toLowerCase()}`
      ].filter(Boolean);
      keys.forEach((key) => index.set(key, task));
    });
  });

  return index;
}

export function findLocalTaskMetadata(index, dateKey, task) {
  return index.get(task.id)
    || index.get(task.clientId)
    || index.get(`${dateKey}:${String(task.title || "").trim().toLowerCase()}`)
    || null;
}

export function mergeCloudStudyGoals(cloudGoals, localGoals) {
  if (!Array.isArray(cloudGoals)) {
    return localGoals;
  }

  const localUnsynced = localGoals.filter((goal) => !goal.syncedGoalId);
  const normalizedCloud = cloudGoals.map(normalizeStudyGoal).filter(Boolean);
  const cloudKeys = new Set(normalizedCloud.map((goal) => goal.clientId || goal.id));
  return [
    ...normalizedCloud,
    ...localUnsynced.filter((goal) => !cloudKeys.has(goal.clientId || goal.id))
  ].sort(sortStudyGoals);
}

export function mergeTodayFocusRecords(focusSessions, localRecords, todayKey) {
  if (!Array.isArray(focusSessions)) {
    return null;
  }

  const cloudRecords = focusSessions
    .filter((session) => session.mode === "focus" && getSessionDateKey(session) === todayKey)
    .map(focusSessionToRecord);
  const cloudKeys = new Set(cloudRecords.map(getFocusRecordKey));
  const localUnsynced = localRecords
    .filter((record) => !record.syncedSessionId && getRecordDateKey(record) === todayKey)
    .filter((record) => !cloudKeys.has(getFocusRecordKey(record)));
  const records = [...cloudRecords, ...localUnsynced]
    .filter(Boolean)
    .sort((first, second) => new Date(second.endedAt) - new Date(first.endedAt));

  return {
    records,
    completedCount: records.length,
    focusMinutes: records.reduce((total, record) => total + (Number(record.minutes) || 0), 0),
    streak: records.reduce((maxStreak, record) => Math.max(maxStreak, Number(record.streak) || 0), 0)
  };
}

export function focusSessionToRecord(session) {
  const endedAt = session.endedAt || new Date().toISOString();
  const endedDate = new Date(endedAt);

  return {
    id: session.clientId || session.id,
    syncedSessionId: session.id,
    taskId: session.taskId || "",
    studyGoalId: session.studyGoalId || "",
    time: Number.isNaN(endedDate.getTime())
      ? ""
      : endedDate.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
    task: session.taskTitle || "未命名学习任务",
    minutes: Number(session.minutes) || 0,
    streak: Number(session.streak) || 0,
    xpEarned: Number(session.xpEarned) || 0,
    startedAt: session.startedAt || "",
    endedAt,
    dateKey: session.dateKey || getDateKey(endedDate)
  };
}

function getSessionDateKey(session) {
  return session.dateKey || getDateKey(new Date(session.endedAt));
}

function getRecordDateKey(record) {
  return record.dateKey || getDateKey(new Date(record.endedAt));
}
