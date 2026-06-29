import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

process.env.DATABASE_PATH = join(mkdtempSync(join(tmpdir(), "tomato-api-")), "test.sqlite");

const { app } = await import("../server/index.js");

function listen() {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => resolve(server));
    server.on("error", reject);
  });
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    if (options.expectedStatus === response.status) {
      return body;
    }

    throw new Error(body?.error || response.statusText);
  }

  if (options.expectedStatus && options.expectedStatus !== response.status) {
    throw new Error(`Expected ${options.expectedStatus}, received ${response.status}`);
  }

  return body;
}

test("core study management API supports auth, sync, stats, and idempotent offline uploads", async (t) => {
  const server = await listen();
  t.after(() => server.close());

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const health = await request(baseUrl, "/api/health");
  const readiness = await request(baseUrl, "/api/ready");

  assert.equal(health.ok, true);
  assert.equal(health.service, "kaoyan-pomodoro-api");
  assert.equal(readiness.ok, true);

  const stamp = Date.now();
  const email = `student-${stamp}@example.com`;
  const registered = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: {
      email,
      password: "password123",
      displayName: "考研同学"
    }
  });
  const token = registered.session.token;

  assert.equal(registered.user.email, email);

  const taskClientId = `task-${stamp}`;
  const firstTask = await request(baseUrl, "/api/tasks", {
    method: "POST",
    token,
    body: {
      clientId: taskClientId,
      title: "数学强化错题整理",
      dateKey: "2026-06-27",
      completed: true
    }
  });
  const duplicateTask = await request(baseUrl, "/api/tasks", {
    method: "POST",
    token,
    body: {
      clientId: taskClientId,
      title: "数学强化错题整理",
      dateKey: "2026-06-27",
      completed: true
    }
  });

  assert.equal(firstTask.task.id, duplicateTask.task.id);
  assert.equal(firstTask.task.clientId, taskClientId);
  assert.equal(firstTask.task.completed, true);

  const goalClientId = `goal-${stamp}`;
  const firstGoal = await request(baseUrl, "/api/study-goals", {
    method: "POST",
    token,
    body: {
      clientId: goalClientId,
      title: "英语真题二刷",
      targetMinutes: 3600,
      targetDate: "2026-09-01"
    }
  });
  const duplicateGoal = await request(baseUrl, "/api/study-goals", {
    method: "POST",
    token,
    body: {
      clientId: goalClientId,
      title: "英语真题二刷",
      targetMinutes: 3600,
      targetDate: "2026-09-01"
    }
  });
  const completedGoal = await request(baseUrl, `/api/study-goals/${firstGoal.studyGoal.id}`, {
    method: "PATCH",
    token,
    body: { completed: true }
  });

  assert.equal(firstGoal.studyGoal.id, duplicateGoal.studyGoal.id);
  assert.equal(completedGoal.studyGoal.completed, true);

  const focusClientId = `focus-${stamp}`;
  const endedAt = new Date().toISOString();
  const firstFocus = await request(baseUrl, "/api/focus-sessions", {
    method: "POST",
    token,
    body: {
      clientId: focusClientId,
      taskId: firstTask.task.id,
      studyGoalId: firstGoal.studyGoal.id,
      taskTitle: firstTask.task.title,
      minutes: 50,
      endedAt,
      streak: 1,
      xpEarned: 55
    }
  });
  const duplicateFocus = await request(baseUrl, "/api/focus-sessions", {
    method: "POST",
    token,
    body: {
      clientId: focusClientId,
      taskId: firstTask.task.id,
      studyGoalId: firstGoal.studyGoal.id,
      taskTitle: firstTask.task.title,
      minutes: 50,
      endedAt,
      streak: 1,
      xpEarned: 55
    }
  });

  assert.equal(firstFocus.focusSession.id, duplicateFocus.focusSession.id);
  assert.equal(firstFocus.focusSession.clientId, focusClientId);

  const yesterdayEndedAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await request(baseUrl, "/api/focus-sessions", {
    method: "POST",
    token,
    body: {
      clientId: `focus-yesterday-${stamp}`,
      studyGoalId: firstGoal.studyGoal.id,
      taskTitle: "英语阅读复盘",
      minutes: 30,
      endedAt: yesterdayEndedAt,
      streak: 2,
      xpEarned: 33
    }
  });

  await request(baseUrl, "/api/settings", {
    method: "PUT",
    token,
    body: {
      focusDuration: 45,
      dailyGoal: 6,
      theme: "dark",
      nextRestType: "long",
      currentTaskId: firstTask.task.id,
      currentStudyGoalId: firstGoal.studyGoal.id
    }
  });
  await request(baseUrl, "/api/pet", {
    method: "PUT",
    token,
    body: {
      petId: "greenDino",
      level: 3,
      currentXP: 40,
      totalXP: 240
    }
  });

  const stats = await request(baseUrl, "/api/stats?range=week", { token });
  assert.equal(stats.days.length, 7);
  assert.equal(stats.totals.completedCount, 2);
  assert.equal(stats.totals.focusMinutes, 80);
  assert.equal(stats.totals.xpEarned, 88);
  assert.equal(stats.summary.activeDays, 2);
  assert.equal(stats.summary.averageActiveDayMinutes, 40);
  assert.equal(stats.summary.currentStreakDays, 2);
  assert.equal(stats.summary.bestDay.focusMinutes, 50);

  const monthStats = await request(baseUrl, "/api/stats?range=month", { token });
  assert.equal(monthStats.days.length, 30);
  assert.equal(monthStats.summary.activeDays, 2);
  assert.equal(monthStats.totals.focusMinutes, 80);

  const missingAiConfig = await request(baseUrl, "/api/ai/daily-summary", {
    method: "POST",
    token,
    expectedStatus: 503,
    body: { dateKey: new Date().toISOString().slice(0, 10) }
  });
  assert.equal(missingAiConfig.code, "AI_NOT_CONFIGURED");

  const sync = await request(baseUrl, "/api/sync", { token });
  assert.equal(sync.settings.focusDuration, 45);
  assert.equal(sync.settings.dailyGoal, 6);
  assert.equal(sync.settings.currentStudyGoalId, firstGoal.studyGoal.id);
  assert.equal(sync.pet.petId, "greenDino");
  assert.equal(sync.tasks.filter((task) => task.clientId === taskClientId).length, 1);
  const syncedGoal = sync.studyGoals.find((goal) => goal.clientId === goalClientId);
  assert.equal(Boolean(syncedGoal), true);
  assert.equal(syncedGoal.focusMinutes, 80);
  assert.equal(syncedGoal.progressPercent, 2);
  const syncedFocus = sync.focusSessions.find((session) => session.clientId === focusClientId);
  assert.equal(Boolean(syncedFocus), true);
  assert.equal(syncedFocus.studyGoalId, firstGoal.studyGoal.id);
});
