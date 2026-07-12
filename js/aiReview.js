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
    ? summaryData.tomorrowPlan.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

export function getAiTomorrowAdoptionState(suggestions, tomorrowTasks) {
  const tasks = Array.isArray(tomorrowTasks) ? tomorrowTasks : [];
  const existingTitles = new Set(tasks.map((task) => task.title.trim().toLowerCase()));
  const remaining = suggestions.filter((suggestion) => (
    !existingTitles.has(suggestion.slice(0, 60).toLowerCase())
  )).length;

  return { total: suggestions.length, remaining };
}
