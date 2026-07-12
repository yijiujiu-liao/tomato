import assert from "node:assert/strict";
import test from "node:test";
import { createCloudRepository } from "../js/cloudRepository.js";
import { performCloudSync, runCloudAction } from "../js/cloudSync.js";

test("cloud repository owns endpoint paths and request payloads", async () => {
  const calls = [];
  const repository = createCloudRepository(async (path, options = {}) => {
    calls.push({ path, options });
    return { ok: true };
  });

  await repository.authenticate("register", {
    email: "student@example.com",
    password: "password123",
    displayName: "Student",
  });
  await repository.createTask({ id: "local-1", title: "数学真题", completed: false }, "2026-07-12");
  await repository.updateSettings({ focusDuration: 50, dailyGoal: 8 });
  await repository.generateDailySummary("2026-07-12", true);

  assert.deepEqual(calls[0], {
    path: "/api/auth/register",
    options: {
      method: "POST",
      body: {
        email: "student@example.com",
        password: "password123",
        displayName: "Student",
      },
      skipAuth: true,
    },
  });
  assert.equal(calls[1].path, "/api/tasks");
  assert.equal(calls[1].options.body.clientId, "local-1");
  assert.equal(calls[1].options.body.dateKey, "2026-07-12");
  assert.deepEqual(calls[2], {
    path: "/api/settings",
    options: { method: "PUT", body: { focusDuration: 50, dailyGoal: 8 } },
  });
  assert.deepEqual(calls[3], {
    path: "/api/ai/daily-summary",
    options: { method: "POST", body: { dateKey: "2026-07-12", force: true } },
  });
});

test("cloud sync preserves cloud-first and local-first ordering", async () => {
  const cloudFirst = [];
  await performCloudSync({
    enabled: true,
    message: "sync",
    cloudFirst: true,
    setBusy: (value) => cloudFirst.push(`busy:${value}`),
    setStatus: (value) => cloudFirst.push(`status:${value}`),
    pull: async () => cloudFirst.push("pull"),
    push: async () => cloudFirst.push("push"),
    refreshStats: async () => cloudFirst.push("stats"),
    loadAi: async () => cloudFirst.push("ai"),
    onSynced: () => cloudFirst.push("synced"),
    onRefresh: () => cloudFirst.push("refresh"),
  });
  assert.deepEqual(cloudFirst, [
    "busy:true", "status:sync", "pull", "push", "pull", "stats", "ai",
    "synced", "refresh", "status:同步完成", "busy:false",
  ]);

  const localFirst = [];
  await performCloudSync({
    enabled: true,
    pull: async () => localFirst.push("pull"),
    push: async () => localFirst.push("push"),
  });
  assert.deepEqual(localFirst, ["push", "pull"]);
});

test("background cloud actions report failures without leaking rejections", async () => {
  let errorMessage = "";
  const result = await runCloudAction({
    enabled: true,
    action: async () => { throw new Error("offline"); },
    onError: (error) => { errorMessage = error.message; },
  });
  assert.equal(result, false);
  assert.equal(errorMessage, "offline");
});
