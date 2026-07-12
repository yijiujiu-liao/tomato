import assert from "node:assert/strict";
import test from "node:test";
import { clearTodaySessionData, completeFocusSession } from "../js/focusSession.js";
import { createPetProgress } from "../js/pet.js";

test("focus completion updates counters, record, pet XP, and fourth-round rest atomically", () => {
  const data = {
    completedCount: 3,
    focusMinutes: 150,
    streak: 3,
    currentTaskId: "task-1",
    currentTask: "数学真题",
    currentStudyGoalId: "goal-1",
    records: [],
    todayPetXP: 150,
    petProgress: createPetProgress("penguin"),
  };
  data.petProgress.totalXP = 150;
  const result = completeFocusSession({
    data,
    minutes: 50,
    recordId: "focus-4",
    dateKey: "2026-07-12",
    now: new Date("2026-07-12T10:00:00.000Z"),
  });

  assert.equal(data.completedCount, 4);
  assert.equal(data.focusMinutes, 200);
  assert.equal(data.streak, 4);
  assert.equal(result.record.taskId, "task-1");
  assert.equal(result.record.studyGoalId, "goal-1");
  assert.equal(result.record.xpEarned, result.reward.totalXP);
  assert.equal(result.nextRestType, "long");
  assert.equal(data.petProgress.totalXP, 150 + result.reward.totalXP);
  assert.equal(data.todayPetXP, 150 + result.reward.totalXP);
});

test("clearing today sessions preserves cumulative pet progress", () => {
  const data = {
    completedCount: 2,
    focusMinutes: 100,
    streak: 2,
    records: [{ id: "focus" }],
    todayPetXP: 100,
    nextRestType: "long",
    petProgress: { totalXP: 500 },
  };
  clearTodaySessionData(data);
  assert.equal(data.completedCount, 0);
  assert.deepEqual(data.records, []);
  assert.equal(data.petProgress.totalXP, 500);
  assert.equal(data.nextRestType, "short");
});
