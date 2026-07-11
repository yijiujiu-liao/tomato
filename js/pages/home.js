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
  const selectedTask = tasks.find((task) => task.id === todayData.currentTaskId && !task.completed);

  elements.homeDateText.textContent = formatPlanDate(new Date());
  elements.homeTaskProgress.textContent = `${completedTasks.length} / ${tasks.length}`;
  elements.homeFocusMinutes.textContent = String(todayData.focusMinutes || 0);
  elements.homeGoalProgress.textContent = `${todayData.completedCount} / ${todayData.dailyGoal}`;
  elements.homeStreakText.textContent = `连续 ${todayData.streak || 0}`;
  elements.homePetChip.textContent = `${petName} Lv.${petLevel}`;
  elements.homeQuickTask.hidden = tasks.length > 0;

  if (selectedTask) {
    elements.homeNextTaskTitle.textContent = selectedTask.title;
    elements.homeNextTaskHint.textContent = selectedTask.source === "ai"
      ? "来自 AI 明日建议，已经准备好开始。"
      : "已选为当前专注任务，可以开始番茄钟。";
    return;
  }

  if (nextTask) {
    elements.homeNextTaskTitle.textContent = nextTask.title;
    elements.homeNextTaskHint.textContent = nextTask.source === "ai"
      ? "这是 AI 帮你承接的任务，点击选择后开始。"
      : "点击任务卡片选择它，再开始番茄钟。";
    return;
  }

  if (tasks.length > 0) {
    elements.homeNextTaskTitle.textContent = "今天的任务都完成了";
    elements.homeNextTaskHint.textContent = "可以去复盘页整理今天的节奏。";
    return;
  }

  elements.homeNextTaskTitle.textContent = "先写下今天要完成的一件事";
  elements.homeNextTaskHint.textContent = "添加或选择任务后，才能开始番茄钟。";
}
