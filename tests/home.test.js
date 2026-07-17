import assert from "node:assert/strict";
import test from "node:test";
import { addTaskAndStartFocus, getHomeReviewState } from "../js/pages/home.js";

test("home quick task immediately starts an immersive focus session", () => {
  const calls = [];
  const result = addTaskAndStartFocus({
    title: "  数学：整理 10 道错题  ",
    addTask: (title) => {
      calls.push(["add", title]);
      return true;
    },
    startFocus: () => {
      calls.push(["start"]);
      return true;
    },
  });

  assert.deepEqual(result, { added: true, started: true });
  assert.deepEqual(calls, [["add", "数学：整理 10 道错题"], ["start"]]);
});

test("home quick task does not start focus when the title is invalid", () => {
  let started = false;
  const result = addTaskAndStartFocus({
    title: "   ",
    addTask: () => false,
    startFocus: () => {
      started = true;
      return true;
    },
  });

  assert.deepEqual(result, { added: false, started: false });
  assert.equal(started, false);
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
