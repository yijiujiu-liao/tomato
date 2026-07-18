import {
  buildExecutionSignals,
  createAiCoachSystemPrompt,
  createAiCoachUserPrompt,
  DAILY_SUMMARY_SCHEMA,
  normalizeDailySummary,
} from "./aiSummary.js";

export function createAiSummaryService({ db, config, petFromRow, fetchImpl = fetch }) {
  function getStoredDailySummary(userId, dateKey) {
    const row = db.prepare(`
      SELECT provider, model, summary_json, source_fingerprint, generated_at
      FROM ai_daily_summaries
      WHERE user_id = ? AND date_key = ?
    `).get(userId, dateKey);

    if (!row) return null;

    try {
      return {
        dateKey,
        model: row.model,
        source: row.provider,
        generatedAt: row.generated_at,
        sourceFingerprint: row.source_fingerprint,
        summary: normalizeDailySummary(JSON.parse(row.summary_json)),
      };
    } catch (error) {
      db.prepare("DELETE FROM ai_daily_summaries WHERE user_id = ? AND date_key = ?").run(userId, dateKey);
      return null;
    }
  }

  function buildDailySummaryContext(userId, dateKey) {
    const tasks = db.prepare(`
      SELECT
        id, title, completed, completed_at AS completedAt, created_at AS createdAt,
        source, source_label AS sourceLabel, source_date_key AS sourceDateKey,
        suggested_for_date AS suggestedForDate, study_goal_id AS studyGoalId
      FROM tasks
      WHERE user_id = ? AND date_key = ?
      ORDER BY created_at ASC
    `).all(userId, dateKey).map((task) => ({
      ...task,
      completed: Boolean(task.completed),
      source: task.source || "",
      sourceLabel: task.sourceLabel || "",
      sourceDateKey: task.sourceDateKey || "",
      suggestedForDate: task.suggestedForDate || "",
    }));
    const focusSessions = db.prepare(`
      SELECT
        task_title AS taskTitle, study_goal_id AS studyGoalId, minutes,
        started_at AS startedAt, ended_at AS endedAt, streak, xp_earned AS xpEarned
      FROM focus_sessions
      WHERE user_id = ? AND mode = 'focus' AND date_key = ?
      ORDER BY ended_at ASC
    `).all(userId, dateKey).map((session) => ({
      ...session,
      minutes: Number(session.minutes) || 0,
      streak: Number(session.streak) || 0,
      xpEarned: Number(session.xpEarned) || 0,
    }));
    const recentFocusRows = db.prepare(`
      SELECT date_key AS dateKey, COUNT(*) AS focusSessions,
        COALESCE(SUM(minutes), 0) AS focusMinutes
      FROM focus_sessions
      WHERE user_id = ? AND mode = 'focus'
        AND date_key BETWEEN date(?, '-6 days') AND ?
      GROUP BY date_key
    `).all(userId, dateKey, dateKey);
    const recentTaskRows = db.prepare(`
      SELECT date_key AS dateKey, COUNT(*) AS plannedTasks,
        COALESCE(SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END), 0) AS completedTasks,
        COALESCE(SUM(CASE WHEN source = 'ai' THEN 1 ELSE 0 END), 0) AS aiSuggestedTasks,
        COALESCE(SUM(CASE WHEN source = 'ai' AND completed = 1 THEN 1 ELSE 0 END), 0) AS aiCompletedTasks
      FROM tasks
      WHERE user_id = ? AND date_key BETWEEN date(?, '-6 days') AND ?
      GROUP BY date_key
    `).all(userId, dateKey, dateKey);
    const studyGoals = db.prepare(`
      SELECT study_goals.id, study_goals.title,
        study_goals.description,
        study_goals.target_minutes AS targetMinutes,
        study_goals.weekly_target_minutes AS weeklyTargetMinutes,
        study_goals.target_date AS targetDate, study_goals.is_primary AS isPrimary,
        study_goals.completed,
        COALESCE(SUM(CASE WHEN focus_sessions.mode = 'focus' THEN focus_sessions.minutes ELSE 0 END), 0) AS focusMinutes,
        COALESCE(SUM(CASE
          WHEN focus_sessions.mode = 'focus'
            AND focus_sessions.date_key BETWEEN date(?, '-6 days') AND ?
          THEN focus_sessions.minutes ELSE 0 END), 0) AS recentFocusMinutes
      FROM study_goals
      LEFT JOIN focus_sessions
        ON focus_sessions.study_goal_id = study_goals.id
        AND focus_sessions.user_id = study_goals.user_id
      WHERE study_goals.user_id = ?
      GROUP BY study_goals.id
      ORDER BY study_goals.completed ASC, study_goals.updated_at DESC
      LIMIT 8
    `).all(dateKey, dateKey, userId).map((goal) => {
      const targetMinutes = Number(goal.targetMinutes) || 0;
      const focusMinutes = Number(goal.focusMinutes) || 0;
      return {
        ...goal,
        targetMinutes,
        weeklyTargetMinutes: Number(goal.weeklyTargetMinutes) || 0,
        completed: Boolean(goal.completed),
        isPrimary: Boolean(goal.isPrimary),
        focusMinutes,
        recentFocusMinutes: Number(goal.recentFocusMinutes) || 0,
        progressPercent: targetMinutes > 0 ? Math.min(100, Math.round((focusMinutes / targetMinutes) * 100)) : 0,
      };
    });
    const user = db.prepare("SELECT display_name AS displayName FROM users WHERE id = ?").get(userId);
    const pet = db.prepare("SELECT * FROM pets WHERE user_id = ?").get(userId);
    const settings = db.prepare("SELECT daily_goal AS dailyGoal FROM user_settings WHERE user_id = ?").get(userId);
    const focusMinutes = focusSessions.reduce((total, session) => total + session.minutes, 0);

    return {
      dateKey,
      user: { displayName: user?.displayName || "考研同学" },
      totals: {
        completedFocusSessions: focusSessions.length,
        focusMinutes,
        xpEarned: focusSessions.reduce((total, session) => total + session.xpEarned, 0),
        completedTasks: tasks.filter((task) => task.completed).length,
        plannedTasks: tasks.length,
      },
      tasks,
      focusSessions,
      studyGoals,
      pet: pet ? petFromRow(pet) : null,
      executionSignals: buildExecutionSignals({
        dateKey,
        tasks,
        focusSessions,
        dailyGoal: settings?.dailyGoal,
        recentFocusRows,
        recentTaskRows,
      }),
    };
  }

  async function generateDailySummary(context) {
    return config.aiProvider === "deepseek"
      ? generateDeepSeekDailySummary(context)
      : generateOpenAiDailySummary(context);
  }

  async function generateOpenAiDailySummary(context) {
    const response = await fetchImpl(`${config.openaiBaseUrl.replace(/\/$/, "")}/responses`, {
      method: "POST",
      signal: AbortSignal.timeout(30000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.openaiApiKey}` },
      body: JSON.stringify({
        model: config.openaiModel,
        store: false,
        max_output_tokens: 1000,
        input: [
          { role: "system", content: createAiCoachSystemPrompt() },
          { role: "user", content: createAiCoachUserPrompt(context) },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "daily_study_summary",
            strict: true,
            schema: DAILY_SUMMARY_SCHEMA,
          },
        },
      }),
    });
    return parseAiResponse(response, extractOpenAIText);
  }

  async function generateDeepSeekDailySummary(context) {
    const response = await fetchImpl(`${config.deepseekBaseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      signal: AbortSignal.timeout(30000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.deepseekApiKey}` },
      body: JSON.stringify({
        model: config.deepseekModel,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `${createAiCoachSystemPrompt()}你必须只输出 JSON 对象，不要输出 Markdown。` },
          { role: "user", content: createAiCoachUserPrompt(context, { strictJson: true }) },
        ],
      }),
    });
    return parseAiResponse(response, extractDeepSeekText);
  }

  async function parseAiResponse(response, extractText) {
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(payload?.error?.message || payload?.error || "AI 总结生成失败。");
      error.statusCode = response.status >= 500 ? 502 : response.status;
      throw error;
    }
    try {
      return normalizeDailySummary(JSON.parse(extractText(payload)));
    } catch (error) {
      const parseError = new Error("AI 返回内容无法解析，请稍后重试。");
      parseError.statusCode = 502;
      throw parseError;
    }
  }

  function getAiApiKey() {
    return config.aiProvider === "deepseek" ? config.deepseekApiKey : config.openaiApiKey;
  }

  function getAiModel() {
    return config.aiProvider === "deepseek" ? config.deepseekModel : config.openaiModel;
  }

  function getAiStatus() {
    const configured = Boolean(getAiApiKey());
    return {
      status: configured ? "ready" : "not-configured",
      configured,
      provider: config.aiProvider,
      model: getAiModel(),
    };
  }

  return {
    getStoredDailySummary,
    buildDailySummaryContext,
    generateDailySummary,
    getAiApiKey,
    getAiModel,
    getAiStatus,
  };
}

function extractOpenAIText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text;
  const content = (payload?.output || [])
    .flatMap((item) => item.content || [])
    .find((item) => typeof item.text === "string" && item.text.trim());
  if (content?.text) return content.text;
  throw new Error("OpenAI response did not include text output.");
}

function extractDeepSeekText(payload) {
  const text = payload?.choices?.[0]?.message?.content;
  if (typeof text === "string" && text.trim()) return text;
  throw new Error("DeepSeek response did not include message content.");
}
