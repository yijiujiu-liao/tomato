import { normalizeOptionalString } from "../validation.js";

export function createRelationResolver(db) {
  function normalizeStudyGoalId(userId, value) {
    const goalId = normalizeOptionalString(value, 120);
    if (!goalId) {
      return null;
    }

    const goal = db.prepare(
      "SELECT id FROM study_goals WHERE id = ? AND user_id = ?",
    ).get(goalId, userId);
    return goal ? goal.id : null;
  }

  function normalizeTaskId(userId, value) {
    const taskId = normalizeOptionalString(value, 120);
    if (!taskId) {
      return null;
    }

    const task = db.prepare(
      "SELECT id FROM tasks WHERE id = ? AND user_id = ?",
    ).get(taskId, userId);
    return task ? task.id : null;
  }

  return {
    normalizeStudyGoalId,
    normalizeTaskId,
  };
}
