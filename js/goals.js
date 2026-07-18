import { createClientId, normalizeNonNegativeInteger } from "./utils.js";

export function normalizeStudyGoal(goal) {
  if (!goal || typeof goal !== "object" || typeof goal.title !== "string" || !goal.title.trim()) {
    return null;
  }

  const syncedGoalId = typeof goal.syncedGoalId === "string" && goal.syncedGoalId
    ? goal.syncedGoalId
    : (typeof goal.id === "string" && goal.clientId ? goal.id : "");
  const clientId = typeof goal.clientId === "string" && goal.clientId
    ? goal.clientId
    : (syncedGoalId ? "" : (typeof goal.id === "string" ? goal.id : createClientId("goal")));

  return {
    id: syncedGoalId || clientId || createClientId("goal"),
    clientId,
    syncedGoalId,
    title: goal.title.trim().slice(0, 80),
    description: typeof goal.description === "string" ? goal.description.trim().slice(0, 240) : "",
    targetMinutes: normalizeNonNegativeInteger(goal.targetMinutes),
    weeklyTargetMinutes: normalizeNonNegativeInteger(goal.weeklyTargetMinutes),
    focusMinutes: normalizeNonNegativeInteger(goal.focusMinutes),
    recentFocusMinutes: normalizeNonNegativeInteger(goal.recentFocusMinutes),
    progressPercent: normalizeNonNegativeInteger(goal.progressPercent),
    targetDate: /^\d{4}-\d{2}-\d{2}$/.test(goal.targetDate || "") ? goal.targetDate : null,
    isPrimary: Boolean(goal.isPrimary),
    completed: Boolean(goal.completed),
    createdAt: typeof goal.createdAt === "string" ? goal.createdAt : new Date().toISOString(),
    completedAt: goal.completed && typeof goal.completedAt === "string" ? goal.completedAt : null,
    updatedAt: typeof goal.updatedAt === "string" ? goal.updatedAt : new Date().toISOString()
  };
}

export function sortStudyGoals(first, second) {
  if (first.completed !== second.completed) {
    return Number(first.completed) - Number(second.completed);
  }

  if (first.isPrimary !== second.isPrimary) {
    return Number(second.isPrimary) - Number(first.isPrimary);
  }

  return new Date(second.updatedAt) - new Date(first.updatedAt);
}

export function getPrimaryStudyGoal(goals = []) {
  const active = goals.filter((goal) => goal && !goal.completed);
  return active.find((goal) => goal.isPrimary) || active[0] || null;
}
