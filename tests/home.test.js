import assert from "node:assert/strict";
import test from "node:test";
import { addHomeTask, getHomeReviewState } from "../js/pages/home.js";

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
