import assert from "node:assert/strict";
import test from "node:test";
import {
  buildExecutionSignals,
  createAiCoachUserPrompt,
  normalizeDailySummary,
} from "../server/aiSummary.js";
import { renderAiDiagnosis } from "../js/components/aiSummary.js";
import { createAiSummaryService } from "../server/aiService.js";

test("AI execution signals expose evidence from today and the recent seven-day rhythm", () => {
  const signals = buildExecutionSignals({
    dateKey: "2026-07-13",
    dailyGoal: 4,
    tasks: [
      { title: "数学：整理错题", completed: true, source: "ai" },
      { title: "英语：精读阅读", completed: false, source: "ai" },
    ],
    focusSessions: [
      { taskTitle: "数学：整理错题", minutes: 50 },
      { taskTitle: "数学：真题复盘", minutes: 40 },
    ],
    recentFocusRows: [
      { dateKey: "2026-07-12", focusSessions: 1, focusMinutes: 30 },
      { dateKey: "2026-07-13", focusSessions: 2, focusMinutes: 90 },
    ],
    recentTaskRows: [
      { dateKey: "2026-07-12", plannedTasks: 2, completedTasks: 1, aiSuggestedTasks: 1, aiCompletedTasks: 0 },
      { dateKey: "2026-07-13", plannedTasks: 2, completedTasks: 1, aiSuggestedTasks: 2, aiCompletedTasks: 1 },
    ],
  });

  assert.equal(signals.today.taskCompletionRate, 50);
  assert.equal(signals.today.focusGoalRate, 50);
  assert.deepEqual(signals.today.unfinishedTasks, ["英语：精读阅读"]);
  assert.deepEqual(signals.today.subjectFocus[0], { subject: "数学", minutes: 90 });
  assert.equal(signals.recentRhythm.days.length, 7);
  assert.equal(signals.recentRhythm.activeDays, 2);
  assert.equal(signals.recentRhythm.averageDailyFocusMinutes, 17);
  assert.equal(signals.recentRhythm.taskCompletionRate, 50);
  assert.equal(signals.today.aiFollowThrough.completionRate, 50);
  assert.equal(signals.recentRhythm.aiFollowThrough.completionRate, 33);
});

test("legacy AI summaries gain a diagnosis and tomorrow plans stay task-sized", () => {
  const summary = normalizeDailySummary({
    title: "今日复盘",
    todaySummary: "完成两轮。",
    risks: ["英语投入不足"],
    tomorrowPlan: ["英语：精读 1 篇阅读", "数学：复盘 10 道错题", "政治：背诵一章", "多余任务"],
    encouragement: "继续。",
  });

  assert.equal(summary.diagnosis.headline, "英语投入不足");
  assert.equal(summary.diagnosis.nextAction, "英语：精读 1 篇阅读");
  assert.equal(summary.tomorrowPlan.length, 3);
  assert.match(createAiCoachUserPrompt({ executionSignals: {} }), /1 到 3 个/);
  assert.match(renderAiDiagnosis(summary.diagnosis), /AI 执行判断/);
});

test("AI service sends structured execution coaching prompts and normalizes model output", async () => {
  let requestBody;
  const service = createAiSummaryService({
    db: {},
    petFromRow: (value) => value,
    config: {
      aiProvider: "deepseek",
      deepseekApiKey: "test-key",
      deepseekModel: "test-model",
      deepseekBaseUrl: "https://example.test",
    },
    fetchImpl: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                title: "执行复盘",
                todaySummary: "完成两轮专注。",
                diagnosis: {
                  headline: "计划多于执行",
                  evidence: "4 项任务只完成 1 项。",
                  nextAction: "数学：复盘 10 道错题",
                },
                highlights: ["完成两轮"],
                risks: ["任务完成率偏低"],
                tomorrowPlan: [{
                  title: "数学：复盘 10 道错题",
                  studyGoalId: "goal-math",
                  goalTitle: "数学强化二轮",
                  reason: "补齐近期错题复盘投入。",
                }],
                encouragement: "先完成第一件。",
              }),
            },
          }],
        }),
      };
    },
  });

  const summary = await service.generateDailySummary({ executionSignals: { today: {} } });
  assert.equal(summary.diagnosis.headline, "计划多于执行");
  assert.equal(summary.tomorrowPlan.length, 1);
  assert.equal(summary.tomorrowPlan[0].studyGoalId, "goal-math");
  assert.match(requestBody.messages[1].content, /完成率低时应减少明日建议数量/);
  assert.match(requestBody.messages[1].content, /长期目标/);
});
