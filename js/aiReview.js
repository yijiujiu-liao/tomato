export function createAiSummaryState(overrides = {}) {
  return {
    status: "idle",
    data: null,
    error: "",
    generatedAt: "",
    ...overrides
  };
}

export function getAiTomorrowSuggestions(summaryData) {
  return Array.isArray(summaryData?.tomorrowPlan)
    ? summaryData.tomorrowPlan.map(normalizeAiSuggestion).filter(Boolean)
    : [];
}

export function getAiTomorrowAdoptionState(suggestions, tomorrowTasks) {
  const tasks = Array.isArray(tomorrowTasks) ? tomorrowTasks : [];
  const existingTitles = new Set(tasks.map((task) => task.title.trim().toLowerCase()));
  const remaining = suggestions.filter((suggestion) => (
    !existingTitles.has(suggestion.title.slice(0, 60).toLowerCase())
  )).length;

  return { total: suggestions.length, remaining };
}

export function normalizeAiSuggestion(item) {
  if (typeof item === "string") {
    const title = item.trim();
    return title ? { title, studyGoalId: "", goalTitle: "", reason: "" } : null;
  }
  if (!item || typeof item !== "object") return null;
  const title = String(item.title || "").trim();
  return title ? {
    title,
    studyGoalId: String(item.studyGoalId || ""),
    goalTitle: String(item.goalTitle || ""),
    reason: String(item.reason || ""),
  } : null;
}
