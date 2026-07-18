import assert from "node:assert/strict";
import test from "node:test";
import {
  addHomeTask,
  getHomePetCompanionState,
  getHomeReviewState,
} from "../js/pages/home.js";

test("home quick task only adds the task", () => {
  const calls = [];
  const result = addHomeTask({
    title: "  数学：整理 10 道错题  ",
    addTask: (title) => {
      calls.push(["add", title]);
      return true;
    },
  });

  assert.deepEqual(result, { added: true });
  assert.deepEqual(calls, [["add", "数学：整理 10 道错题"]]);
});

test("home quick task rejects an invalid title", () => {
  const result = addHomeTask({
    title: "   ",
    addTask: () => false,
  });

  assert.deepEqual(result, { added: false });
});

test("home review CTA appears only when today is ready to close", () => {
  assert.deepEqual(getHomeReviewState({
    tasks: [{ completed: false }],
    completedCount: 1,
    dailyGoal: 4,
  }), { visible: false, label: "" });

  assert.match(getHomeReviewState({
    tasks: [{ completed: true }],
    completedCount: 1,
    dailyGoal: 4,
  }).label, /生成明日计划/);

  assert.match(getHomeReviewState({
    tasks: [{ completed: false }],
    completedCount: 4,
    dailyGoal: 4,
  }).label, /进入复盘/);
});

test("home pet companion guides empty days and celebrates completed plans", () => {
  assert.deepEqual(getHomePetCompanionState({
    tasks: [],
    todayData: { completedCount: 0, dailyGoal: 4 },
  }), {
    mood: "waiting",
    message: "先写下一件今天要做的事，我会在这里等你。",
  });

  const completed = getHomePetCompanionState({
    tasks: [{ completed: true }],
    todayData: { completedCount: 1, dailyGoal: 4 },
  });
  assert.equal(completed.mood, "celebrate");
  assert.match(completed.message, /今天已经很棒/);
});

test("home pet companion rotates encouragement without owning animation timing", () => {
  const base = {
    tasks: [{ completed: false }],
    todayData: { completedCount: 0, dailyGoal: 4 },
  };
  const first = getHomePetCompanionState({ ...base, messageIndex: 0 });
  const second = getHomePetCompanionState({ ...base, messageIndex: 1 });

  assert.notEqual(first.message, second.message);
  assert.equal(first.mood, "ready");
});
