import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStudyDiagnosticItems,
  getPrimaryStudyDiagnostic,
} from "../js/components/diagnostics.js";

function createContext(overrides = {}) {
  return {
    todayData: {
      completedCount: 0,
      dailyGoal: 8,
      records: [],
      ...overrides.todayData,
    },
    todayTasks: overrides.todayTasks || [],
    recentPlans: overrides.recentPlans || [],
    studyGoals: overrides.studyGoals || [],
    inferSubject: (title) => String(title).split("：")[0],
  };
}

test("study diagnostics put the most actionable problem first", () => {
  const items = buildStudyDiagnosticItems(createContext({
    todayTasks: [
      { title: "数学：整理错题", completed: false },
      { title: "英语：精读真题", completed: false },
    ],
    recentPlans: [
      { focusMinutes: 0, completedTasks: 0, totalTasks: 2 },
    ],
  }));
  const primary = getPrimaryStudyDiagnostic(items);

  assert.equal(items.length, 4);
  assert.equal(primary.level, "bad");
  assert.match(primary.text, /先完成当前这一轮|建议砍到前三件/);
});

test("study diagnostics recognize a completed daily rhythm", () => {
  const items = buildStudyDiagnosticItems(createContext({
    todayData: {
      completedCount: 8,
      dailyGoal: 8,
      records: [{ task: "数学：真题", minutes: 50 }],
    },
    todayTasks: [{ title: "数学：真题", completed: true }],
    recentPlans: Array.from({ length: 6 }, () => ({
      focusMinutes: 50,
      completedTasks: 1,
      totalTasks: 1,
    })),
  }));

  assert.equal(items[0].level, "good");
  assert.equal(items[1].level, "good");
  assert.equal(items[2].level, "good");
  assert.equal(getPrimaryStudyDiagnostic(items).level, "good");
});
