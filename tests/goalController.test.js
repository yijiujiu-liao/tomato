import assert from "node:assert/strict";
import test from "node:test";
import { createGoalController } from "../js/goalController.js";

test("goal controller owns local goal lifecycle and cloud identity replacement", () => {
  let goals = [];
  const data = { currentStudyGoalId: "", records: [] };
  let id = 0;
  const controller = createGoalController({
    getGoals: () => goals,
    setGoals: (next) => { goals = next; },
    getData: () => data,
    createGoalId: () => `goal-${++id}`,
    saveGoals: () => {},
    saveData: () => {},
    renderGoals: () => {},
    updateOptions: () => {},
    syncController: {},
    runCloudSync: () => {},
    confirmDelete: () => true,
  });

  const goal = controller.add({ title: "数学一轮", targetMinutes: 1000, targetDate: "2026-09-01" });
  assert.equal(goals.length, 1);
  assert.equal(controller.toggle(goal.id), true);
  assert.equal(goals[0].completed, true);

  data.currentStudyGoalId = goal.id;
  data.records.push({ studyGoalId: goal.id });
  controller.replace(goal.id, { ...goal, id: "goal-cloud", syncedGoalId: "goal-cloud" });
  assert.equal(data.currentStudyGoalId, "goal-cloud");
  assert.equal(data.records[0].studyGoalId, "goal-cloud");
  assert.equal(controller.remove("goal-cloud"), true);
  assert.equal(goals.length, 0);
});
