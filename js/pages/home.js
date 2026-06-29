export function renderHomePageView({
  elements,
  tasks,
  todayData,
  petName,
  petLevel,
  formatPlanDate
}) {
  if (!elements.homeTaskProgress) {
    return;
  }

  const completedTasks = tasks.filter((task) => task.completed);
  const nextTask = tasks.find((task) => !task.completed);

  elements.homeDateText.textContent = formatPlanDate(new Date());
  elements.homeTaskProgress.textContent = `${completedTasks.length} / ${tasks.length}`;
  elements.homeFocusMinutes.textContent = String(todayData.focusMinutes || 0);
  elements.homeGoalProgress.textContent = `${todayData.completedCount} / ${todayData.dailyGoal}`;
  elements.homeStreakText.textContent = `连续 ${todayData.streak || 0}`;
  elements.homePetChip.textContent = `${petName} Lv.${petLevel}`;

  if (nextTask) {
    elements.homeNextTaskTitle.textContent = nextTask.title;
    elements.homeNextTaskHint.textContent = "点击继续专注，会自动使用这个未完成任务。";
    return;
  }

  if (tasks.length > 0) {
    elements.homeNextTaskTitle.textContent = "今天的任务都完成了";
    elements.homeNextTaskHint.textContent = "可以复盘一下，或者给明天留一个轻量计划。";
    return;
  }

  elements.homeNextTaskTitle.textContent = "先添加一个今日任务";
  elements.homeNextTaskHint.textContent = "把任务写下来，再进入专注会更稳。";
}
