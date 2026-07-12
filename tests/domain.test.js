import assert from "node:assert/strict";
import test from "node:test";
import {
  addPetExperience,
  createPetProgressFromTotalXP,
  getNextStageProgress,
  normalizePetProgress,
  removePetExperience
} from "../js/pet.js";
import {
  loadAuthSession,
  loadDailyPlans,
  saveAuthSession
} from "../js/storage.js";
import {
  createClientId,
  escapeHtml,
  getDateKey,
  getRelativeDateKey,
  normalizeFocusDuration,
  normalizeGoal
} from "../js/utils.js";
import { normalizeStudyGoal, sortStudyGoals } from "../js/goals.js";
import { normalizeFocusRecord } from "../js/focusRecords.js";
import {
  addUniqueTask,
  carryOverUnfinishedTasks,
  delayTask,
  normalizeTask,
  renameTask,
  setTaskCompleted,
  sortExecutableTasks
} from "../js/tasks.js";
import { createTaskStore } from "../js/taskStore.js";
import { mergeCloudTasks, mergeTodayFocusRecords } from "../js/sync.js";
import { getAiTomorrowAdoptionState, getAiTomorrowSuggestions } from "../js/aiReview.js";
import { buildReviewModel, inferSubject } from "../js/pages/review.js";

class MemoryStorage {
  values = new Map();

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

test("pet XP keeps cumulative experience while consuming current level XP", () => {
  const initial = createPetProgressFromTotalXP(90, "penguin");
  const { progress, reward } = addPetExperience(initial, 20, 2);

  assert.equal(reward.totalXP, 21);
  assert.equal(progress.level, 2);
  assert.equal(progress.currentXP, 11);
  assert.equal(progress.totalXP, 111);

  const reverted = removePetExperience(progress, reward.totalXP);
  assert.equal(reverted.level, 1);
  assert.equal(reverted.currentXP, 90);
  assert.equal(reverted.totalXP, 90);
});

test("pet normalization repairs inconsistent legacy totals", () => {
  const normalized = normalizePetProgress({
    petId: "penguin",
    level: 3,
    currentXP: 25,
    totalXP: 10
  });

  assert.equal(normalized.level, 3);
  assert.equal(normalized.currentXP, 25);
  assert.equal(normalized.totalXP, 275);
  assert.deepEqual(getNextStageProgress(normalized, 50), { xp: 425, tomatoes: 9 });
});

test("auth and daily-plan storage retain the existing serialized contract", () => {
  const storage = new MemoryStorage();
  const normalized = saveAuthSession(storage, "auth", {
    user: { id: "user-1" },
    session: { token: "token-1", expiresAt: "tomorrow" },
    lastSyncedAt: "today"
  });

  assert.equal(normalized.token, "token-1");
  assert.deepEqual(loadAuthSession(storage, "auth"), normalized);

  storage.setItem("plans", JSON.stringify({
    "2026-07-11": [{ title: "数学" }, null]
  }));
  const plans = loadDailyPlans(storage, "plans", (task) => task?.title ? task : null);
  assert.deepEqual(plans["2026-07-11"], [{ title: "数学" }]);
});

test("task store owns daily plans and deletion tombstones without changing storage keys", () => {
  const storage = new MemoryStorage();
  storage.setItem("plans", JSON.stringify({
    "2026-07-12": [{ id: "legacy", title: "数学真题", completed: false }]
  }));
  const store = createTaskStore({ storage, plansKey: "plans", deletedKey: "deleted" });

  assert.equal(store.getTasks("2026-07-12")[0].title, "数学真题");
  store.addTask("2026-07-13", { id: "tomorrow", title: "英语阅读" });
  store.removeTask("2026-07-12", "legacy");
  store.rememberDeleted("cloud-1");
  store.savePlans();

  assert.deepEqual(JSON.parse(storage.getItem("plans")), {
    "2026-07-12": [],
    "2026-07-13": [{ id: "tomorrow", title: "英语阅读" }]
  });
  assert.deepEqual(JSON.parse(storage.getItem("deleted")), ["cloud-1"]);
});

test("task domain rules own dedupe, carry-over, delay, completion, and rename", () => {
  const storage = new MemoryStorage();
  const store = createTaskStore({ storage, plansKey: "plans", deletedKey: "deleted" });
  const created = addUniqueTask({
    store,
    dateKey: "2026-07-12",
    title: " 数学真题 ",
    id: "task-1",
    now: new Date("2026-07-12T08:00:00Z")
  });
  assert.equal(created.title, "数学真题");
  assert.equal(addUniqueTask({ store, dateKey: "2026-07-12", title: "数学真题" }), null);
  assert.equal(renameTask(created, "数学错题").title, "数学错题");
  assert.equal(setTaskCompleted(created, true, new Date("2026-07-12T09:00:00Z")).completed, true);

  store.addTask("2026-07-11", normalizeTask({ id: "old-1", title: "英语阅读" }));
  const carried = carryOverUnfinishedTasks({
    store,
    fromDateKey: "2026-07-11",
    toDateKey: "2026-07-12",
    createId: () => "carry-1"
  });
  assert.equal(carried[0].carriedFromId, "old-1");
  const delayed = delayTask({
    store,
    fromDateKey: "2026-07-12",
    toDateKey: "2026-07-13",
    taskId: "carry-1",
    createId: () => "delay-1"
  });
  assert.equal(delayed.delayedTask.id, "delay-1");
  assert.equal(store.getTasks("2026-07-12").some((task) => task.id === "carry-1"), false);
});

test("shared utilities normalize dates, settings, ids, and HTML", () => {
  const date = new Date(2026, 6, 11, 23, 30);
  assert.equal(getDateKey(date), "2026-07-11");
  assert.equal(getRelativeDateKey(1, date), "2026-07-12");
  assert.equal(normalizeGoal(100), 24);
  assert.equal(normalizeFocusDuration(-1), 50);
  assert.equal(createClientId("task", 10, 0.5), "task-10-8");
  assert.equal(escapeHtml('<a title="x">&</a>'), "&lt;a title=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
});

test("task, goal, and focus-record modules preserve domain metadata", () => {
  const manual = normalizeTask({ id: "manual", title: " 数学错题 ", createdAt: "2026-07-11T09:00:00Z" });
  const ai = normalizeTask({
    id: "ai",
    title: "英语阅读",
    source: "ai",
    sourceLabel: "AI 明日建议",
    createdAt: "2026-07-11T10:00:00Z"
  });
  assert.equal(ai.sourceLabel, "AI 明日建议");
  assert.deepEqual(sortExecutableTasks([manual, ai], "manual").map((task) => task.id), ["manual", "ai"]);

  const goal = normalizeStudyGoal({ id: "goal-1", title: " 政治背诵 ", targetMinutes: 120 });
  assert.equal(goal.title, "政治背诵");
  assert.equal(sortStudyGoals(goal, { ...goal, completed: true }), -1);

  const record = normalizeFocusRecord({ task: "数学错题", minutes: 50, endedAt: "2026-07-11T10:00:00Z" });
  assert.equal(record.dateKey, "2026-07-11");
  assert.equal(record.xpEarned, 50);
});

test("cloud merge keeps local metadata, unsynced work, and tombstones", () => {
  const localPlans = {
    "2026-07-11": [
      normalizeTask({ id: "local-ai", title: "数学", source: "ai", xpEarned: 10 }),
      normalizeTask({ id: "local-only", title: "政治" })
    ]
  };
  const plans = mergeCloudTasks({
    cloudTasks: [
      { id: "cloud-1", clientId: "local-ai", title: "数学", dateKey: "2026-07-11" },
      { id: "deleted", title: "已删除", dateKey: "2026-07-11" }
    ],
    dailyPlans: localPlans,
    deletedTaskIds: new Set(["deleted"]),
    todayKey: "2026-07-11"
  });

  assert.equal(plans["2026-07-11"].length, 2);
  assert.equal(plans["2026-07-11"][0].source, "ai");
  assert.equal(plans["2026-07-11"][0].xpEarned, 10);
  assert.equal(plans["2026-07-11"][1].id, "local-only");
});

test("focus-session merge derives today's trusted counters", () => {
  const merged = mergeTodayFocusRecords([
    {
      id: "server-1",
      clientId: "focus-1",
      mode: "focus",
      taskTitle: "数学",
      minutes: 50,
      streak: 2,
      endedAt: "2026-07-11T10:00:00Z",
      dateKey: "2026-07-11"
    }
  ], [], "2026-07-11");

  assert.equal(merged.completedCount, 1);
  assert.equal(merged.focusMinutes, 50);
  assert.equal(merged.streak, 2);
});

test("AI suggestions are normalized and cannot be adopted twice", () => {
  const suggestions = getAiTomorrowSuggestions({
    tomorrowPlan: [" 数学错题 ", "", "英语阅读"]
  });
  const adoption = getAiTomorrowAdoptionState(suggestions, [{ title: "数学错题" }]);

  assert.deepEqual(suggestions, ["数学错题", "英语阅读"]);
  assert.deepEqual(adoption, { total: 2, remaining: 1 });
});

test("review page derives useful copy from tasks and focus records", () => {
  const model = buildReviewModel({
    tasks: [
      { title: "数学：真题", completed: true },
      { title: "英语：阅读", completed: false }
    ],
    records: [
      { task: "数学：真题", minutes: 50 },
      { task: "英语：阅读", minutes: 20 }
    ],
    completedCount: 1,
    nextTask: { title: "英语：阅读" },
    date: new Date(2026, 6, 11)
  });

  assert.equal(inferSubject("数学：真题"), "数学");
  assert.equal(model.topSubjectText, "数学，累计 50 分钟");
  assert.equal(model.tomorrowText, "优先处理：英语：阅读");
  assert.equal(model.canAdopt, true);
});
