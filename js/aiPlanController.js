import { getAiTomorrowSuggestions } from "./aiReview.js";

export function createAiPlanController({
  getAiState,
  getTodayTasks,
  getTasks,
  getTodayKey,
  getTomorrowKey,
  addTaskToDate,
  savePlans,
  renderAi,
  renderReview,
  showToast,
  runCloudSync,
  uploadTasks,
  createTask,
  applyCreatedTask,
}) {
  function adoptAiSuggestions() {
    const aiState = getAiState();
    const suggestions = getAiTomorrowSuggestions(aiState.data);
    if (suggestions.length === 0) {
      showToast("AI 还没有给出可采纳的明日建议。");
      return 0;
    }

    const tomorrowKey = getTomorrowKey();
    let addedCount = 0;
    for (const suggestion of suggestions) {
      const task = addTaskToDate(tomorrowKey, suggestion, {
        source: "ai",
        sourceDateKey: getTodayKey(),
        sourceLabel: "AI 明日建议",
        aiGeneratedAt: aiState.generatedAt || new Date().toISOString(),
        suggestedForDate: tomorrowKey,
      });
      if (task) addedCount += 1;
    }

    savePlans();
    renderAi();
    if (addedCount === 0) {
      showToast("明日任务里已经有这些建议了。");
      return 0;
    }
    showToast(`已采纳 ${addedCount} 条 AI 建议，明天首页会自动出现。`);
    runCloudSync(uploadTasks);
    return addedCount;
  }

  function getReviewSuggestion() {
    return getTodayTasks().find((task) => !task.completed) || null;
  }

  function adoptReviewSuggestion() {
    const suggestion = getReviewSuggestion();
    if (!suggestion) {
      showToast("暂无可采纳的明日任务，先完成一轮专注再复盘。");
      return null;
    }

    const tomorrowKey = getTomorrowKey();
    const tomorrowTask = addTaskToDate(tomorrowKey, suggestion.title, {
      source: "review",
      sourceDateKey: getTodayKey(),
      sourceLabel: "复盘建议",
      carriedFromId: suggestion.id,
    });
    if (!tomorrowTask) {
      showToast("明日任务里已经有这件事了。");
      return null;
    }

    savePlans();
    renderReview();
    showToast("已加入明日任务。");
    runCloudSync(async () => {
      const created = await createTask(tomorrowTask, tomorrowKey);
      applyCreatedTask(tomorrowTask, created.task);
      savePlans();
      renderReview();
    });
    return tomorrowTask;
  }

  function getAdoptionTasks() {
    return getTasks(getTomorrowKey());
  }

  return { adoptAiSuggestions, adoptReviewSuggestion, getReviewSuggestion, getAdoptionTasks };
}
