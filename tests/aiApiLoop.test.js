import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { resolveExecutableTaskSelection } from "../js/tasks.js";

process.env.DATABASE_PATH = join(mkdtempSync(join(tmpdir(), "tomato-ai-api-")), "test.sqlite");
process.env.AI_PROVIDER = "deepseek";
process.env.DEEPSEEK_API_KEY = "test-key";
process.env.DEEPSEEK_MODEL = "test-model";
process.env.DEEPSEEK_BASE_URL = "https://mock-ai.local";

const nativeFetch = globalThis.fetch;
let providerCalls = 0;
let lastProviderRequest = null;
globalThis.fetch = async (input, options) => {
  const url = String(input);
  if (!url.startsWith("https://mock-ai.local")) {
    return nativeFetch(input, options);
  }

  providerCalls += 1;
  lastProviderRequest = JSON.parse(options.body);
  return new Response(JSON.stringify({
    choices: [{
      message: {
        content: JSON.stringify({
          title: "今日执行复盘",
          todaySummary: "完成了数学错题专注，但英语任务尚未推进。",
          diagnosis: {
            headline: "数学投入明确，英语承接不足",
            evidence: "今日完成 1 轮专注，2 项任务只完成 1 项。",
            nextAction: "英语：精读 1 篇阅读",
          },
          highlights: ["完成数学错题整理"],
          risks: ["英语任务未完成"],
          tomorrowPlan: ["英语：精读 1 篇阅读", "数学：复盘 10 道错题"],
          encouragement: "先完成第一件，再增加计划。",
        }),
      },
    }],
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

const { app } = await import("../server/index.js");

function listen() {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => resolve(server));
    server.on("error", reject);
  });
}

async function request(baseUrl, path, { method = "GET", token, body } = {}) {
  const response = await nativeFetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  assert.equal(response.ok, true, payload.error || `${method} ${path} failed`);
  return payload;
}

test("AI HTTP loop generates, caches, refreshes, and restores an execution review", async (t) => {
  const server = await listen();
  t.after(() => {
    server.close();
    globalThis.fetch = nativeFetch;
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const dateKey = "2026-07-13";
  const registered = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    body: {
      email: `ai-loop-${Date.now()}@example.com`,
      password: "password123",
      displayName: "AI 闭环测试",
    },
  });
  const token = registered.session.token;

  const mathTask = await request(baseUrl, "/api/tasks", {
    method: "POST",
    token,
    body: { clientId: "math-task", title: "数学：整理 10 道错题", dateKey, completed: true },
  });
  await request(baseUrl, "/api/tasks", {
    method: "POST",
    token,
    body: { clientId: "english-task", title: "英语：精读 1 篇阅读", dateKey },
  });
  await request(baseUrl, "/api/focus-sessions", {
    method: "POST",
    token,
    body: {
      clientId: "focus-session",
      taskId: mathTask.task.id,
      taskTitle: mathTask.task.title,
      minutes: 50,
      dateKey,
      endedAt: "2026-07-13T10:00:00.000Z",
      streak: 1,
      xpEarned: 50,
    },
  });

  const generated = await request(baseUrl, "/api/ai/daily-summary", {
    method: "POST",
    token,
    body: { dateKey },
  });
  assert.equal(generated.cached, false);
  assert.equal(generated.source, "deepseek");
  assert.equal(generated.summary.diagnosis.nextAction, "英语：精读 1 篇阅读");
  assert.deepEqual(generated.summary.tomorrowPlan, ["英语：精读 1 篇阅读", "数学：复盘 10 道错题"]);
  assert.equal(providerCalls, 1);
  assert.match(lastProviderRequest.messages[1].content, /数学：整理 10 道错题/);
  assert.match(lastProviderRequest.messages[1].content, /taskCompletionRate/);

  const cached = await request(baseUrl, "/api/ai/daily-summary", {
    method: "POST",
    token,
    body: { dateKey },
  });
  assert.equal(cached.cached, true);
  assert.equal(providerCalls, 1);
  for (let index = 0; index < 30; index += 1) {
    const repeatedCache = await request(baseUrl, "/api/ai/daily-summary", {
      method: "POST",
      token,
      body: { dateKey },
    });
    assert.equal(repeatedCache.cached, true);
  }
  assert.equal(providerCalls, 1);

  await request(baseUrl, "/api/tasks", {
    method: "POST",
    token,
    body: { clientId: "politics-task", title: "政治：背诵一节", dateKey },
  });
  const changed = await request(baseUrl, "/api/ai/daily-summary", {
    method: "POST",
    token,
    body: { dateKey },
  });
  assert.equal(changed.cached, false);
  assert.equal(providerCalls, 2);

  const refreshed = await request(baseUrl, "/api/ai/daily-summary", {
    method: "POST",
    token,
    body: { dateKey, force: true },
  });
  assert.equal(refreshed.cached, false);
  assert.equal(providerCalls, 3);

  const restored = await request(baseUrl, `/api/ai/daily-summary?dateKey=${dateKey}`, { token });
  assert.equal(restored.summary.diagnosis.headline, "数学投入明确，英语承接不足");
  assert.equal(restored.sourceFingerprint, refreshed.sourceFingerprint);

  const tomorrowKey = "2026-07-14";
  await request(baseUrl, "/api/tasks", {
    method: "POST",
    token,
    body: { clientId: "manual-tomorrow", title: "政治：背诵一节", dateKey: tomorrowKey },
  });
  for (const [index, title] of restored.summary.tomorrowPlan.entries()) {
    await request(baseUrl, "/api/tasks", {
      method: "POST",
      token,
      body: {
        clientId: `ai-tomorrow-${index}`,
        title,
        dateKey: tomorrowKey,
        source: "ai",
        sourceLabel: "AI 明日建议",
        sourceDateKey: dateKey,
        suggestedForDate: tomorrowKey,
        aiGeneratedAt: restored.generatedAt,
      },
    });
  }

  const tomorrowTasks = await request(baseUrl, `/api/tasks?date=${tomorrowKey}`, { token });
  const nextSelection = resolveExecutableTaskSelection(tomorrowTasks.tasks);
  assert.equal(tomorrowTasks.tasks.filter((task) => task.source === "ai").length, 2);
  assert.equal(nextSelection.task.title, "英语：精读 1 篇阅读");
  assert.equal(nextSelection.task.sourceLabel, "AI 明日建议");
});
