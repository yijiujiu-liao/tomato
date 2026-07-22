export function createCloudRepository(request) {
  return {
    authenticate(mode, credentials) {
      return request(`/api/auth/${mode === "register" ? "register" : "login"}`, {
        method: "POST",
        body: credentials,
        skipAuth: true,
      });
    },
    logout() {
      return request("/api/auth/logout", { method: "POST" });
    },
    getSession() {
      return request("/api/auth/session");
    },
    pullState() {
      return request("/api/sync");
    },
    fetchStats(range) {
      return request(`/api/stats?range=${encodeURIComponent(range)}`);
    },
    getDailySummary(dateKey) {
      return request(`/api/ai/daily-summary?dateKey=${encodeURIComponent(dateKey)}`);
    },
    generateDailySummary(dateKey, force = false) {
      return request("/api/ai/daily-summary", {
        method: "POST",
        body: { dateKey, force },
      });
    },
    createFocusSession(record) {
      return request("/api/focus-sessions", {
        method: "POST",
        body: record,
      });
    },
    createStudyGoal(goal) {
      return request("/api/study-goals", {
        method: "POST",
        body: {
          clientId: goal.clientId || goal.id,
          title: goal.title,
          description: goal.description,
          targetMinutes: goal.targetMinutes,
          weeklyTargetMinutes: goal.weeklyTargetMinutes,
          targetDate: goal.targetDate,
          isPrimary: goal.isPrimary,
          completed: goal.completed,
        },
      });
    },
    updateStudyGoal(goalId, patch) {
      return request(`/api/study-goals/${goalId}`, { method: "PATCH", body: patch });
    },
    deleteStudyGoal(goalId) {
      return request(`/api/study-goals/${goalId}`, { method: "DELETE" });
    },
    updateSettings(settings) {
      return request("/api/settings", { method: "PUT", body: settings });
    },
    getSettings() {
      return request("/api/settings");
    },
    updatePet(pet) {
      return request("/api/pet", { method: "PUT", body: pet });
    },
    getPet() {
      return request("/api/pet");
    },
    createTask(task, dateKey) {
      return request("/api/tasks", {
        method: "POST",
        body: {
          clientId: task.clientId || task.id,
          title: task.title,
          studyGoalId: task.studyGoalId || null,
          dateKey,
          completed: task.completed,
          carriedFromId: task.carriedFromId || null,
          source: task.source || "",
          sourceLabel: task.sourceLabel || "",
          sourceDateKey: task.sourceDateKey || "",
          suggestedForDate: task.suggestedForDate || "",
          aiGeneratedAt: task.aiGeneratedAt || "",
          xpEarned: task.xpEarned || 0,
        },
      });
    },
    updateTask(taskId, patch) {
      return request(`/api/tasks/${taskId}`, { method: "PATCH", body: patch });
    },
    deleteTask(taskId) {
      return request(`/api/tasks/${taskId}`, { method: "DELETE" });
    },
  };
}
