export function taskToRow(task) {
  return {
    id: task.id,
    client_id: task.clientId,
    date_key: task.dateKey,
    title: task.title,
    study_goal_id: task.studyGoalId,
    completed: task.completed,
    created_at: task.createdAt,
    completed_at: task.completedAt,
    carried_from_id: task.carriedFromId,
    source: task.source,
    source_label: task.sourceLabel,
    source_date_key: task.sourceDateKey,
    suggested_for_date: task.suggestedForDate,
    ai_generated_at: task.aiGeneratedAt,
    xp_earned: task.xpEarned,
    updated_at: task.updatedAt,
  };
}

export function studyGoalToRow(goal) {
  return {
    id: goal.id,
    client_id: goal.clientId,
    title: goal.title,
    description: goal.description,
    target_minutes: goal.targetMinutes,
    weekly_target_minutes: goal.weeklyTargetMinutes,
    target_date: goal.targetDate,
    is_primary: goal.isPrimary,
    completed: goal.completed,
    created_at: goal.createdAt,
    completed_at: goal.completedAt,
    updated_at: goal.updatedAt,
  };
}
