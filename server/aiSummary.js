export const DAILY_SUMMARY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "todaySummary",
    "diagnosis",
    "highlights",
    "risks",
    "tomorrowPlan",
    "encouragement",
  ],
  properties: {
    title: { type: "string" },
    todaySummary: { type: "string" },
    diagnosis: {
      type: "object",
      additionalProperties: false,
      required: ["headline", "evidence", "nextAction"],
      properties: {
        headline: { type: "string" },
        evidence: { type: "string" },
        nextAction: { type: "string" },
      },
    },
    highlights: {
      type: "array",
      items: { type: "string" },
    },
    risks: {
      type: "array",
      items: { type: "string" },
    },
    tomorrowPlan: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "studyGoalId", "goalTitle", "reason"],
        properties: {
          title: { type: "string" },
          studyGoalId: { type: "string" },
          goalTitle: { type: "string" },
          reason: { type: "string" },
        },
      },
      maxItems: 3,
    },
    encouragement: { type: "string" },
  },
};

export function createAiCoachSystemPrompt() {
  return [
    "你是一位直接、克制、擅长考研执行管理的 AI 学习教练。",
    "你只根据提供的数据判断，不编造科目、任务、时长或学习成果。",
    "你的价值不是安慰用户，而是找出计划与执行之间最重要的偏差，并给出明天能立即执行的动作。",
    "如果数据不足，必须明确说明证据不足，不要假装得出结论。",
  ].join("");
}

export function createAiCoachUserPrompt(context, { strictJson = false } = {}) {
  const outputRule = strictJson
    ? "只输出 JSON 对象，不要输出 Markdown 或解释文字。"
    : "输出必须是中文 JSON，并严格符合给定 schema。";

  return [
    "请生成当天学习复盘。",
    "diagnosis.headline 用一句话指出今天最关键的执行问题或优势；diagnosis.evidence 必须引用数据中的任务数、完成率、番茄数、分钟数或近 7 天节奏；diagnosis.nextAction 只写明天第一个应该执行的动作。",
    "如果 executionSignals 中存在 aiFollowThrough，必须评估之前 AI 建议的实际完成情况；完成率低时应减少明日建议数量和范围，而不是继续堆任务。",
    "先判断 active studyGoals 的期限、累计进度、每周目标与近 7 天投入差距，所有诊断和建议都必须服务于这些长期目标。",
    "tomorrowPlan 只能包含 1 到 3 个对象；title 是可直接添加为任务的短标题，不超过 30 个汉字，必须包含对象、动作和明确范围；studyGoalId 必须使用学习数据里仍进行中的真实目标 id；goalTitle 必须与该 id 对应；reason 用一句话解释该任务为什么能推进目标。禁止写‘继续努力’‘保持状态’等空泛建议。",
    "如果存在未归属长期目标的任务，要在 risks 中指出；不要为已完成目标继续安排任务。",
    "todaySummary、highlights、risks 和 encouragement 保持简洁，不重复同一句话。",
    outputRule,
    `学习数据：${JSON.stringify(context)}`,
  ].join("\n");
}

export function normalizeDailySummary(summary) {
  const risks = normalizeSummaryList(summary?.risks, 3);
  const tomorrowPlan = normalizeTomorrowPlan(summary?.tomorrowPlan, 3);
  const diagnosis = normalizeDiagnosis(summary?.diagnosis, { risks, tomorrowPlan });

  return {
    title: normalizeText(summary?.title, "今日学习复盘", 80),
    todaySummary: normalizeText(summary?.todaySummary, "今天的学习记录已同步。", 500),
    diagnosis,
    highlights: normalizeSummaryList(summary?.highlights, 4),
    risks,
    tomorrowPlan,
    encouragement: normalizeText(summary?.encouragement, "稳住节奏，明天继续。", 240),
  };
}

export function buildExecutionSignals({
  dateKey,
  tasks,
  focusSessions,
  dailyGoal,
  recentFocusRows,
  recentTaskRows,
}) {
  const focusByDate = new Map((recentFocusRows || []).map((row) => [row.dateKey, {
    focusSessions: Number(row.focusSessions) || 0,
    focusMinutes: Number(row.focusMinutes) || 0,
  }]));
  const tasksByDate = new Map((recentTaskRows || []).map((row) => [row.dateKey, {
    plannedTasks: Number(row.plannedTasks) || 0,
    completedTasks: Number(row.completedTasks) || 0,
    aiSuggestedTasks: Number(row.aiSuggestedTasks) || 0,
    aiCompletedTasks: Number(row.aiCompletedTasks) || 0,
  }]));
  const days = createRecentDateKeys(dateKey, 7).map((dayKey) => ({
    dateKey: dayKey,
    focusSessions: focusByDate.get(dayKey)?.focusSessions || 0,
    focusMinutes: focusByDate.get(dayKey)?.focusMinutes || 0,
    plannedTasks: tasksByDate.get(dayKey)?.plannedTasks || 0,
    completedTasks: tasksByDate.get(dayKey)?.completedTasks || 0,
    aiSuggestedTasks: tasksByDate.get(dayKey)?.aiSuggestedTasks || 0,
    aiCompletedTasks: tasksByDate.get(dayKey)?.aiCompletedTasks || 0,
  }));
  const completedTasks = tasks.filter((task) => task.completed).length;
  const completedFocusSessions = focusSessions.length;
  const safeDailyGoal = Math.max(1, Number(dailyGoal) || 1);
  const subjectMinutes = new Map();

  focusSessions.forEach((session) => {
    const subject = inferSubject(session.taskTitle);
    subjectMinutes.set(subject, (subjectMinutes.get(subject) || 0) + (Number(session.minutes) || 0));
  });

  const activeDays = days.filter((day) => day.focusMinutes > 0).length;
  const recentFocusMinutes = days.reduce((total, day) => total + day.focusMinutes, 0);
  const recentPlannedTasks = days.reduce((total, day) => total + day.plannedTasks, 0);
  const recentCompletedTasks = days.reduce((total, day) => total + day.completedTasks, 0);
  const aiTasks = tasks.filter((task) => task.source === "ai");
  const completedAiTasks = aiTasks.filter((task) => task.completed).length;
  const recentAiTasks = days.reduce((total, day) => total + day.aiSuggestedTasks, 0);
  const recentCompletedAiTasks = days.reduce((total, day) => total + day.aiCompletedTasks, 0);

  return {
    today: {
      plannedTasks: tasks.length,
      completedTasks,
      unfinishedTasks: tasks.filter((task) => !task.completed).map((task) => task.title).slice(0, 5),
      taskCompletionRate: tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0,
      completedFocusSessions,
      dailyFocusGoal: safeDailyGoal,
      focusGoalRate: Math.min(100, Math.round((completedFocusSessions / safeDailyGoal) * 100)),
      subjectFocus: [...subjectMinutes.entries()]
        .map(([subject, minutes]) => ({ subject, minutes }))
        .sort((first, second) => second.minutes - first.minutes),
      aiFollowThrough: {
        suggestedTasks: aiTasks.length,
        completedTasks: completedAiTasks,
        completionRate: aiTasks.length ? Math.round((completedAiTasks / aiTasks.length) * 100) : null,
      },
    },
    recentRhythm: {
      days,
      activeDays,
      focusMinutes: recentFocusMinutes,
      averageDailyFocusMinutes: Math.round(recentFocusMinutes / days.length),
      taskCompletionRate: recentPlannedTasks
        ? Math.round((recentCompletedTasks / recentPlannedTasks) * 100)
        : 0,
      aiFollowThrough: {
        suggestedTasks: recentAiTasks,
        completedTasks: recentCompletedAiTasks,
        completionRate: recentAiTasks
          ? Math.round((recentCompletedAiTasks / recentAiTasks) * 100)
          : null,
      },
    },
  };
}

function normalizeDiagnosis(value, { risks, tomorrowPlan }) {
  const fallbackIssue = risks[0] || "今天已经留下学习记录，但还需要继续观察执行节奏。";
  const fallbackAction = tomorrowPlan[0]?.title || "先完成明天第一轮番茄。";

  return {
    headline: normalizeText(value?.headline, fallbackIssue, 120),
    evidence: normalizeText(value?.evidence, "诊断依据来自今日任务与专注记录。", 240),
    nextAction: normalizeText(value?.nextAction, fallbackAction, 120),
  };
}

function createRecentDateKeys(dateKey, count) {
  const end = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(end.getTime())) return [];
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(end);
    date.setUTCDate(date.getUTCDate() - (count - index - 1));
    return date.toISOString().slice(0, 10);
  });
}

function inferSubject(title) {
  const cleanTitle = String(title || "未命名任务").trim();
  return cleanTitle.split(/[：:·\-—｜|]/)[0].trim().slice(0, 12) || "未命名任务";
}

function normalizeSummaryList(value, maxItems, maxLength = 180) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item || "").trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeTomorrowPlan(value, maxItems) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item === "string") {
      const title = item.trim().slice(0, 60);
      return title ? { title, studyGoalId: "", goalTitle: "", reason: "" } : null;
    }
    if (!item || typeof item !== "object") return null;
    const title = String(item.title || "").trim().slice(0, 60);
    if (!title) return null;
    return {
      title,
      studyGoalId: String(item.studyGoalId || "").trim().slice(0, 120),
      goalTitle: String(item.goalTitle || "").trim().slice(0, 80),
      reason: String(item.reason || "").trim().slice(0, 180),
    };
  }).filter(Boolean).slice(0, maxItems);
}

function normalizeText(value, fallback, maxLength) {
  return String(value || fallback).trim().slice(0, maxLength);
}
