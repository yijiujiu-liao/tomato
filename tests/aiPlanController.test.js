import assert from "node:assert/strict";
import test from "node:test";
import { createAiPlanController } from "../js/aiPlanController.js";

test("AI plan adoption writes unique suggestions to tomorrow and syncs once", () => {
  const added = [];
  const messages = [];
  let syncCalls = 0;
  const controller = createAiPlanController({
    getAiState: () => ({ data: { tomorrowPlan: ["数学真题", "英语阅读"] }, generatedAt: "now" }),
    getTodayTasks: () => [],
    getTasks: () => added,
    getTodayKey: () => "2026-07-12",
    getTomorrowKey: () => "2026-07-13",
    addTaskToDate: (dateKey, title, metadata) => {
      if (added.some((task) => task.title === title)) return null;
      const task = { title, dateKey, ...metadata };
      added.push(task);
      return task;
    },
    savePlans: () => {},
    renderAi: () => {},
    renderReview: () => {},
    showToast: (message) => messages.push(message),
    runCloudSync: () => { syncCalls += 1; },
    uploadTasks: () => {},
    createTask: async () => ({}),
    applyCreatedTask: () => {},
    getStudyGoals: () => [{ id: "goal-math", title: "考研总目标", isPrimary: true, completed: false }],
  });

  assert.equal(controller.adoptAiSuggestions(), 2);
  assert.equal(added.length, 2);
  assert.equal(added[0].source, "ai");
  assert.equal(added[0].studyGoalId, "goal-math");
  assert.equal(syncCalls, 1);
  assert.match(messages.at(-1), /已采纳 2 条/);
  assert.equal(controller.adoptAiSuggestions(), 0);
  assert.match(messages.at(-1), /已经有/);
});

test("review adoption uses the first unfinished task", () => {
  const added = [];
  const controller = createAiPlanController({
    getAiState: () => ({ data: null }),
    getTodayTasks: () => [{ id: "done", title: "已完成", completed: true }, { id: "next", title: "政治错题", completed: false }],
    getTasks: () => added,
    getTodayKey: () => "2026-07-12",
    getTomorrowKey: () => "2026-07-13",
    addTaskToDate: (_dateKey, title, metadata) => {
      const task = { id: "tomorrow", title, ...metadata };
      added.push(task);
      return task;
    },
    savePlans: () => {},
    renderAi: () => {},
    renderReview: () => {},
    showToast: () => {},
    runCloudSync: () => {},
    uploadTasks: () => {},
    createTask: async () => ({ task: { id: "server" } }),
    applyCreatedTask: () => {},
    getStudyGoals: () => [{ id: "goal-politics", title: "政治强化", isPrimary: true, completed: false }],
  });
  const task = controller.adoptReviewSuggestion();
  assert.equal(task.title, "政治错题");
  assert.equal(task.source, "review");
});
