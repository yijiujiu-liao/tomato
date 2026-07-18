import express from "express";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { config } from "./config.js";
import {
  createId,
  db,
  goalFromRow,
  nowIso,
  petFromRow,
  settingsFromRow,
  taskFromRow
} from "./db.js";
import {
  createSession,
  createUser,
  deleteSession,
  getUserByEmail,
  requireAuth,
  verifyPassword
} from "./auth.js";
import { createAiSummaryService } from "./aiService.js";
import { getStorageStatus } from "./deployment.js";
import { countCurrentStreakDays } from "./stats.js";
import {
  createApiNotFoundHandler,
  createErrorHandler,
  createHttpsGuard,
  createRateLimit,
  createSecurityHeaders,
} from "./http.js";
import {
  clampInteger,
  getCumulativeXPForLevel,
  getEvolutionStage,
  getNextLevelXP,
  getPetProgressFromTotalXP,
  normalizeDateKey,
  normalizeOptionalDateKey,
  normalizeOptionalString,
  normalizePetId,
  normalizeRequiredTitle,
  normalizeTaskSource,
  normalizeTimestamp,
} from "./validation.js";

export const app = express();
const port = config.port;
const publicDir = config.publicDir;
const storageStatus = getStorageStatus(config);
const {
  getStoredDailySummary,
  buildDailySummaryContext,
  generateDailySummary,
  getAiApiKey,
  getAiModel,
  getAiStatus,
} = createAiSummaryService({ db, config, petFromRow });
const authRateLimit = createRateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const aiRateLimit = createRateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 24,
  key: (req) => req.auth?.user?.id || req.ip
});

app.disable("x-powered-by");
app.set("trust proxy", config.trustProxy);
app.use(createHttpsGuard({ enabled: config.enforceHttps }));
app.use(createSecurityHeaders());
app.use(express.json({ limit: "1mb" }));
const staticOptions = {
  extensions: ["html"],
  setHeaders(res, filePath) {
    if (filePath.endsWith("sw.js")) {
      res.setHeader("Cache-Control", "no-cache");
    }
  }
};

app.use("/js", express.static(join(publicDir, "js"), staticOptions));
app.use("/css", express.static(join(publicDir, "css"), staticOptions));
app.use("/assets", express.static(join(publicDir, "assets"), staticOptions));

for (const asset of ["style.css", "script.js", "sw.js", "manifest.json", "icon-192.png", "icon-512.png", "icon.svg"]) {
  app.get(`/${asset}`, (req, res) => res.sendFile(join(publicDir, asset)));
}

app.get(["/", "/index.html"], (req, res) => res.sendFile(join(publicDir, "index.html")));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "kaoyan-pomodoro-api",
    environment: config.nodeEnv,
    uptimeSeconds: Math.round(process.uptime()),
    database: "sqlite",
    storage: storageStatus,
    ai: getAiStatus(),
  });
});

app.get("/api/ready", (req, res, next) => {
  try {
    db.prepare("SELECT 1 AS ok").get();
    res.json({
      ok: true,
      database: "ready",
      storage: storageStatus.status,
      ai: getAiStatus(),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/register", authRateLimit, (req, res, next) => {
  try {
    const user = createUser(req.body || {});
    const session = createSession(user.id);

    res.status(201).json({ user, session });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", authRateLimit, (req, res, next) => {
  try {
    const userWithPassword = getUserByEmail(req.body?.email);

    if (!userWithPassword || !verifyPassword(req.body?.password, userWithPassword.password_hash)) {
      res.status(401).json({ error: "邮箱或密码不正确。" });
      return;
    }

    const session = createSession(userWithPassword.id);

    res.json({
      user: {
        id: userWithPassword.id,
        email: userWithPassword.email,
        displayName: userWithPassword.display_name,
        createdAt: userWithPassword.created_at,
        updatedAt: userWithPassword.updated_at
      },
      session
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/logout", requireAuth, (req, res) => {
  deleteSession(req.auth.token);
  res.status(204).end();
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: req.auth.user });
});

app.get("/api/sync", requireAuth, (req, res) => {
  const userId = req.auth.user.id;
  const settings = db.prepare("SELECT * FROM user_settings WHERE user_id = ?").get(userId);
  const pet = db.prepare("SELECT * FROM pets WHERE user_id = ?").get(userId);
  const tasks = db.prepare(`
    SELECT * FROM tasks
    WHERE user_id = ?
    ORDER BY date_key DESC, created_at ASC
  `).all(userId).map(taskFromRow);
  const studyGoals = db.prepare(`
    SELECT
      study_goals.*,
      COALESCE(SUM(CASE WHEN focus_sessions.mode = 'focus' THEN focus_sessions.minutes ELSE 0 END), 0) AS focus_minutes,
      COALESCE(SUM(CASE
        WHEN focus_sessions.mode = 'focus' AND focus_sessions.date_key >= date('now', '-6 days')
        THEN focus_sessions.minutes ELSE 0 END), 0) AS recent_focus_minutes
    FROM study_goals
    LEFT JOIN focus_sessions
      ON focus_sessions.study_goal_id = study_goals.id
      AND focus_sessions.user_id = study_goals.user_id
    WHERE study_goals.user_id = ?
    GROUP BY study_goals.id
    ORDER BY completed ASC, updated_at DESC
  `).all(userId).map(goalFromRow);
  const focusSessions = db.prepare(`
    SELECT
      id,
      client_id AS clientId,
      task_id AS taskId,
      study_goal_id AS studyGoalId,
      task_title AS taskTitle,
      mode,
      date_key AS dateKey,
      minutes,
      started_at AS startedAt,
      ended_at AS endedAt,
      streak,
      xp_earned AS xpEarned,
      created_at AS createdAt
    FROM focus_sessions
    WHERE user_id = ?
    ORDER BY ended_at DESC
    LIMIT 200
  `).all(userId);

  res.json({
    user: req.auth.user,
    settings: settingsFromRow(settings),
    pet: petFromRow(pet),
    tasks,
    studyGoals,
    focusSessions
  });
});

app.get("/api/settings", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM user_settings WHERE user_id = ?").get(req.auth.user.id);
  res.json({ settings: settingsFromRow(row) });
});

app.put("/api/settings", requireAuth, (req, res) => {
  const userId = req.auth.user.id;
  const current = db.prepare("SELECT * FROM user_settings WHERE user_id = ?").get(userId);
  const next = {
    focusDuration: clampInteger(req.body?.focusDuration, current.focus_duration, 1, 180),
    dailyGoal: clampInteger(req.body?.dailyGoal, current.daily_goal, 1, 24),
    theme: req.body?.theme === "dark" ? "dark" : "light",
    nextRestType: req.body?.nextRestType === "long" ? "long" : "short",
    currentTaskId: normalizeOwnedTaskId(userId, req.body?.currentTaskId),
    currentStudyGoalId: normalizeOwnedStudyGoalId(userId, req.body?.currentStudyGoalId),
    longGoalOnboardingCompleted: req.body?.longGoalOnboardingCompleted === undefined
      ? Boolean(current.long_goal_onboarding_completed)
      : Boolean(req.body.longGoalOnboardingCompleted),
    updatedAt: nowIso()
  };

  db.prepare(`
    UPDATE user_settings
    SET focus_duration = ?,
        daily_goal = ?,
        theme = ?,
        next_rest_type = ?,
        current_task_id = ?,
        current_study_goal_id = ?,
        long_goal_onboarding_completed = ?,
        updated_at = ?
    WHERE user_id = ?
  `).run(
    next.focusDuration,
    next.dailyGoal,
    next.theme,
    next.nextRestType,
    next.currentTaskId,
    next.currentStudyGoalId,
    Number(next.longGoalOnboardingCompleted),
    next.updatedAt,
    userId
  );

  res.json({ settings: next });
});

app.get("/api/pet", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM pets WHERE user_id = ?").get(req.auth.user.id);
  res.json({ pet: petFromRow(row) });
});

app.put("/api/pet", requireAuth, (req, res) => {
  const userId = req.auth.user.id;
  const current = db.prepare("SELECT * FROM pets WHERE user_id = ?").get(userId);
  const expectedUpdatedAt = normalizeOptionalString(req.body?.updatedAt, 40);

  if (expectedUpdatedAt && expectedUpdatedAt !== current.updated_at) {
    res.status(409).json({
      error: "宠物进度已在其他设备更新，请同步后重试。",
      code: "PET_VERSION_CONFLICT",
    });
    return;
  }

  const requestedLevel = clampInteger(req.body?.level, current.level, 1, 999);
  const requestedCurrentXP = clampInteger(
    req.body?.currentXP,
    current.current_xp,
    0,
    getNextLevelXP(requestedLevel) - 1,
  );
  const requestedTotalXP = clampInteger(
    req.body?.totalXP,
    current.total_xp,
    0,
    getCumulativeXPForLevel(1000) - 1,
  );
  const progress = getPetProgressFromTotalXP(Math.max(
    current.total_xp,
    requestedTotalXP,
    getCumulativeXPForLevel(requestedLevel) + requestedCurrentXP,
  ));
  const next = {
    petId: normalizePetId(req.body?.petId || current.pet_id),
    ...progress,
    evolutionStage: getEvolutionStage(progress.level),
    updatedAt: nowIso()
  };

  db.prepare(`
    UPDATE pets
    SET pet_id = ?,
        level = ?,
        current_xp = ?,
        next_level_xp = ?,
        total_xp = ?,
        evolution_stage = ?,
        updated_at = ?
    WHERE user_id = ?
  `).run(
    next.petId,
    next.level,
    next.currentXP,
    next.nextLevelXP,
    next.totalXP,
    next.evolutionStage,
    next.updatedAt,
    userId
  );

  res.json({ pet: next });
});

app.get("/api/tasks", requireAuth, (req, res) => {
  const dateKey = normalizeDateKey(req.query.date);
  const rows = db.prepare(`
    SELECT * FROM tasks
    WHERE user_id = ? AND date_key = ?
    ORDER BY completed ASC, created_at ASC
  `).all(req.auth.user.id, dateKey);

  res.json({ tasks: rows.map(taskFromRow) });
});

app.post("/api/tasks", requireAuth, (req, res) => {
  const title = String(req.body?.title || "").trim();

  if (!title) {
    res.status(400).json({ error: "任务标题不能为空。" });
    return;
  }

  const clientId = normalizeOptionalString(req.body?.clientId, 120);
  const source = normalizeTaskSource(req.body?.source);
  const sourceLabel = source ? normalizeOptionalString(req.body?.sourceLabel, 24) : null;
  const sourceDateKey = source ? normalizeOptionalDateKey(req.body?.sourceDateKey) : null;
  const suggestedForDate = source ? normalizeOptionalDateKey(req.body?.suggestedForDate) : null;
  const aiGeneratedAt = source ? normalizeOptionalString(req.body?.aiGeneratedAt, 40) : null;
  const xpEarned = clampInteger(req.body?.xpEarned, 0, 0, 1000);
  const studyGoalId = normalizeOwnedStudyGoalId(req.auth.user.id, req.body?.studyGoalId);

  if (clientId) {
    const existing = db.prepare(`
      SELECT * FROM tasks
      WHERE user_id = ? AND client_id = ?
    `).get(req.auth.user.id, clientId);

    if (existing) {
      if ((source && !existing.source) || (studyGoalId && !existing.study_goal_id)) {
        db.prepare(`
          UPDATE tasks
          SET source = COALESCE(source, ?),
              source_label = COALESCE(source_label, ?),
              source_date_key = COALESCE(source_date_key, ?),
              suggested_for_date = COALESCE(suggested_for_date, ?),
              ai_generated_at = COALESCE(ai_generated_at, ?),
              study_goal_id = COALESCE(study_goal_id, ?),
              updated_at = ?
          WHERE id = ? AND user_id = ?
        `).run(
          source,
          sourceLabel,
          sourceDateKey,
          suggestedForDate,
          aiGeneratedAt,
          studyGoalId,
          nowIso(),
          existing.id,
          req.auth.user.id
        );
        const updatedTask = db.prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?").get(existing.id, req.auth.user.id);
        res.json({ task: taskFromRow(updatedTask) });
        return;
      }

      res.json({ task: taskFromRow(existing) });
      return;
    }
  }

  const completed = typeof req.body?.completed === "boolean" ? Number(req.body.completed) : 0;
  const createdAt = nowIso();
  const task = {
    id: createId(),
    userId: req.auth.user.id,
    clientId,
    dateKey: normalizeDateKey(req.body?.dateKey),
    title: title.slice(0, 60),
    completed,
    createdAt,
    completedAt: completed ? createdAt : null,
    carriedFromId: req.body?.carriedFromId || null,
    source,
    sourceLabel,
    sourceDateKey,
    suggestedForDate,
    aiGeneratedAt,
    xpEarned,
    studyGoalId,
    updatedAt: nowIso()
  };

  db.prepare(`
    INSERT INTO tasks (
      id,
      user_id,
      client_id,
      date_key,
      title,
      completed,
      created_at,
      completed_at,
      carried_from_id,
      source,
      source_label,
      source_date_key,
      suggested_for_date,
      ai_generated_at,
      xp_earned,
      study_goal_id,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    task.id,
    task.userId,
    task.clientId,
    task.dateKey,
    task.title,
    task.completed,
    task.createdAt,
    task.completedAt,
    task.carriedFromId,
    task.source,
    task.sourceLabel,
    task.sourceDateKey,
    task.suggestedForDate,
    task.aiGeneratedAt,
    task.xpEarned,
    task.studyGoalId,
    task.updatedAt
  );

  res.status(201).json({ task: taskFromRow(toTaskRow(task)) });
});

app.patch("/api/tasks/:taskId", requireAuth, (req, res) => {
  const current = db.prepare(`
    SELECT * FROM tasks
    WHERE id = ? AND user_id = ?
  `).get(req.params.taskId, req.auth.user.id);

  if (!current) {
    res.status(404).json({ error: "任务不存在。" });
    return;
  }

  const completed = typeof req.body?.completed === "boolean" ? Number(req.body.completed) : current.completed;
  const completedAt = completed && !current.completed_at ? nowIso() : (completed ? current.completed_at : null);
  const title = typeof req.body?.title === "string" && req.body.title.trim()
    ? req.body.title.trim().slice(0, 60)
    : current.title;
  const xpEarned = Math.max(
    Number(current.xp_earned) || 0,
    clampInteger(req.body?.xpEarned, 0, 0, 1000),
  );
  const updatedAt = nowIso();
  const studyGoalId = req.body?.studyGoalId === undefined
    ? current.study_goal_id
    : normalizeOwnedStudyGoalId(req.auth.user.id, req.body.studyGoalId);

  db.prepare(`
    UPDATE tasks
    SET title = ?,
        completed = ?,
        completed_at = ?,
        xp_earned = ?,
        study_goal_id = ?,
        updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(title, completed, completedAt, xpEarned, studyGoalId, updatedAt, req.params.taskId, req.auth.user.id);

  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.taskId);
  res.json({ task: taskFromRow(task) });
});

app.delete("/api/tasks/:taskId", requireAuth, (req, res) => {
  const result = db.prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?").run(req.params.taskId, req.auth.user.id);

  if (!result.changes) {
    res.status(404).json({ error: "任务不存在。" });
    return;
  }

  res.status(204).end();
});

app.get("/api/study-goals", requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT
      study_goals.*,
      COALESCE(SUM(CASE WHEN focus_sessions.mode = 'focus' THEN focus_sessions.minutes ELSE 0 END), 0) AS focus_minutes,
      COALESCE(SUM(CASE
        WHEN focus_sessions.mode = 'focus' AND focus_sessions.date_key >= date('now', '-6 days')
        THEN focus_sessions.minutes ELSE 0 END), 0) AS recent_focus_minutes
    FROM study_goals
    LEFT JOIN focus_sessions
      ON focus_sessions.study_goal_id = study_goals.id
      AND focus_sessions.user_id = study_goals.user_id
    WHERE study_goals.user_id = ?
    GROUP BY study_goals.id
    ORDER BY completed ASC, updated_at DESC
  `).all(req.auth.user.id);

  res.json({ studyGoals: rows.map(goalFromRow) });
});

app.post("/api/study-goals", requireAuth, (req, res) => {
  const title = normalizeRequiredTitle(req.body?.title, 80);

  if (!title) {
    res.status(400).json({ error: "学习目标不能为空。" });
    return;
  }

  const clientId = normalizeOptionalString(req.body?.clientId, 120);
  const isPrimary = req.body?.isPrimary === true || !db.prepare(`
    SELECT id FROM study_goals WHERE user_id = ? AND completed = 0 LIMIT 1
  `).get(req.auth.user.id);

  if (clientId) {
    const existing = db.prepare(`
      SELECT * FROM study_goals
      WHERE user_id = ? AND client_id = ?
    `).get(req.auth.user.id, clientId);

    if (existing) {
      res.json({ studyGoal: goalFromRow(existing) });
      return;
    }
  }

  const goal = {
    id: createId(),
    userId: req.auth.user.id,
    clientId,
    title,
    description: normalizeOptionalString(req.body?.description, 240) || "",
    targetMinutes: clampInteger(req.body?.targetMinutes, 0, 0, 99999),
    weeklyTargetMinutes: clampInteger(req.body?.weeklyTargetMinutes, 0, 0, 10080),
    targetDate: normalizeOptionalDateKey(req.body?.targetDate),
    isPrimary: Number(isPrimary),
    completed: typeof req.body?.completed === "boolean" ? Number(req.body.completed) : 0,
    createdAt: nowIso(),
    completedAt: req.body?.completed === true ? nowIso() : null,
    updatedAt: nowIso()
  };

  if (goal.isPrimary) {
    db.prepare("UPDATE study_goals SET is_primary = 0 WHERE user_id = ?").run(goal.userId);
  }

  db.prepare(`
    INSERT INTO study_goals (
      id,
      user_id,
      client_id,
      title,
      description,
      target_minutes,
      weekly_target_minutes,
      target_date,
      is_primary,
      completed,
      created_at,
      completed_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    goal.id,
    goal.userId,
    goal.clientId,
    goal.title,
    goal.description,
    goal.targetMinutes,
    goal.weeklyTargetMinutes,
    goal.targetDate,
    goal.isPrimary,
    goal.completed,
    goal.createdAt,
    goal.completedAt,
    goal.updatedAt
  );

  db.prepare(`
    UPDATE user_settings
    SET long_goal_onboarding_completed = 1, current_study_goal_id = ?, updated_at = ?
    WHERE user_id = ?
  `).run(goal.id, nowIso(), goal.userId);

  res.status(201).json({ studyGoal: goalFromRow(toStudyGoalRow(goal)) });
});

app.patch("/api/study-goals/:goalId", requireAuth, (req, res) => {
  const current = db.prepare(`
    SELECT * FROM study_goals
    WHERE id = ? AND user_id = ?
  `).get(req.params.goalId, req.auth.user.id);

  if (!current) {
    res.status(404).json({ error: "学习目标不存在。" });
    return;
  }

  const title = typeof req.body?.title === "string" && req.body.title.trim()
    ? normalizeRequiredTitle(req.body.title, 80)
    : current.title;
  const targetMinutes = req.body?.targetMinutes === undefined
    ? current.target_minutes
    : clampInteger(req.body.targetMinutes, current.target_minutes, 0, 99999);
  const targetDate = req.body?.targetDate === undefined
    ? current.target_date
    : normalizeOptionalDateKey(req.body.targetDate);
  const description = req.body?.description === undefined
    ? current.description
    : (normalizeOptionalString(req.body.description, 240) || "");
  const weeklyTargetMinutes = req.body?.weeklyTargetMinutes === undefined
    ? current.weekly_target_minutes
    : clampInteger(req.body.weeklyTargetMinutes, current.weekly_target_minutes, 0, 10080);
  const isPrimary = req.body?.isPrimary === undefined ? current.is_primary : Number(Boolean(req.body.isPrimary));
  const completed = typeof req.body?.completed === "boolean" ? Number(req.body.completed) : current.completed;
  const completedAt = completed && !current.completed_at ? nowIso() : (completed ? current.completed_at : null);
  const updatedAt = nowIso();

  if (isPrimary) {
    db.prepare("UPDATE study_goals SET is_primary = 0 WHERE user_id = ?").run(req.auth.user.id);
  }

  db.prepare(`
    UPDATE study_goals
    SET title = ?,
        description = ?,
        target_minutes = ?,
        weekly_target_minutes = ?,
        target_date = ?,
        is_primary = ?,
        completed = ?,
        completed_at = ?,
        updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(
    title,
    description,
    targetMinutes,
    weeklyTargetMinutes,
    targetDate,
    isPrimary,
    completed,
    completedAt,
    updatedAt,
    req.params.goalId,
    req.auth.user.id
  );

  const goal = db.prepare("SELECT * FROM study_goals WHERE id = ?").get(req.params.goalId);
  res.json({ studyGoal: goalFromRow(goal) });
});

app.delete("/api/study-goals/:goalId", requireAuth, (req, res) => {
  const result = db.prepare("DELETE FROM study_goals WHERE id = ? AND user_id = ?").run(req.params.goalId, req.auth.user.id);

  if (!result.changes) {
    res.status(404).json({ error: "学习目标不存在。" });
    return;
  }

  res.status(204).end();
});

app.post("/api/focus-sessions", requireAuth, (req, res) => {
  const minutes = clampInteger(req.body?.minutes, 50, 1, 180);
  const endedAt = req.body?.endedAt ? normalizeTimestamp(req.body.endedAt) : nowIso();
  const startedAt = req.body?.startedAt
    ? normalizeTimestamp(req.body.startedAt)
    : new Date(new Date(endedAt).getTime() - minutes * 60 * 1000).toISOString();

  if (!endedAt || !startedAt) {
    res.status(400).json({ error: "专注记录时间格式不正确。" });
    return;
  }

  if (new Date(startedAt).getTime() > new Date(endedAt).getTime()) {
    res.status(400).json({ error: "专注开始时间不能晚于结束时间。" });
    return;
  }

  const taskId = normalizeOwnedTaskId(req.auth.user.id, req.body?.taskId);
  const studyGoalId = normalizeOwnedStudyGoalId(req.auth.user.id, req.body?.studyGoalId);
  const taskTitle = String(req.body?.taskTitle || "未命名学习任务").trim().slice(0, 80);
  const streak = clampInteger(req.body?.streak, 0, 0, 999);
  const xpEarned = clampInteger(req.body?.xpEarned, minutes, 0, Math.ceil(minutes * 1.2));
  const clientId = normalizeOptionalString(req.body?.clientId, 120);
  const dateKey = normalizeDateKey(req.body?.dateKey || endedAt.slice(0, 10));

  if (clientId) {
    const existing = db.prepare(`
      SELECT
        id,
        client_id AS clientId,
        task_id AS taskId,
        study_goal_id AS studyGoalId,
        task_title AS taskTitle,
        mode,
        date_key AS dateKey,
        minutes,
        started_at AS startedAt,
        ended_at AS endedAt,
        streak,
        xp_earned AS xpEarned,
        created_at AS createdAt
      FROM focus_sessions
      WHERE user_id = ? AND client_id = ?
    `).get(req.auth.user.id, clientId);

    if (existing) {
      res.json({ focusSession: existing });
      return;
    }
  }

  const session = {
    id: createId(),
    userId: req.auth.user.id,
    clientId,
    taskId,
    studyGoalId,
    taskTitle,
    mode: req.body?.mode === "rest" ? "rest" : "focus",
    dateKey,
    minutes,
    startedAt,
    endedAt,
    streak,
    xpEarned,
    createdAt: nowIso()
  };

  db.prepare(`
    INSERT INTO focus_sessions (
      id,
      user_id,
      client_id,
      task_id,
      study_goal_id,
      task_title,
      mode,
      date_key,
      minutes,
      started_at,
      ended_at,
      streak,
      xp_earned,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    session.id,
    session.userId,
    session.clientId,
    session.taskId,
    session.studyGoalId,
    session.taskTitle,
    session.mode,
    session.dateKey,
    session.minutes,
    session.startedAt,
    session.endedAt,
    session.streak,
    session.xpEarned,
    session.createdAt
  );

  res.status(201).json({
    focusSession: {
      id: session.id,
      clientId: session.clientId,
      taskId: session.taskId,
      studyGoalId: session.studyGoalId,
      taskTitle: session.taskTitle,
      mode: session.mode,
      dateKey: session.dateKey,
      minutes: session.minutes,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      streak: session.streak,
      xpEarned: session.xpEarned,
      createdAt: session.createdAt
    }
  });
});

app.get("/api/stats", requireAuth, (req, res) => {
  const range = ["day", "week", "month"].includes(req.query.range) ? req.query.range : "day";
  const startDate = getRangeStart(range);
  const endDate = new Date();
  const rows = db.prepare(`
    SELECT
      date_key AS date,
      COUNT(*) AS completedCount,
      COALESCE(SUM(minutes), 0) AS focusMinutes,
      COALESCE(SUM(xp_earned), 0) AS xpEarned
    FROM focus_sessions
    WHERE user_id = ? AND mode = 'focus' AND date_key >= ?
    GROUP BY date_key
    ORDER BY date ASC
  `).all(req.auth.user.id, formatDateKey(startDate));
  const days = buildStatsDays(startDate, endDate, rows);
  const totals = days.reduce((summary, row) => {
    summary.completedCount += row.completedCount;
    summary.focusMinutes += row.focusMinutes;
    summary.xpEarned += row.xpEarned;
    return summary;
  }, { completedCount: 0, focusMinutes: 0, xpEarned: 0 });
  const summary = buildStatsSummary(days, totals);
  const goalBreakdown = db.prepare(`
    SELECT
      study_goals.id,
      study_goals.title,
      study_goals.is_primary AS isPrimary,
      COALESCE(SUM(focus_sessions.minutes), 0) AS focusMinutes,
      COUNT(focus_sessions.id) AS completedCount
    FROM study_goals
    LEFT JOIN focus_sessions
      ON focus_sessions.study_goal_id = study_goals.id
      AND focus_sessions.user_id = study_goals.user_id
      AND focus_sessions.mode = 'focus'
      AND focus_sessions.date_key >= ?
    WHERE study_goals.user_id = ?
    GROUP BY study_goals.id
    ORDER BY isPrimary DESC, focusMinutes DESC
  `).all(formatDateKey(startDate), req.auth.user.id).map((goal) => ({
    id: goal.id,
    title: goal.title,
    isPrimary: Boolean(goal.isPrimary),
    focusMinutes: Number(goal.focusMinutes) || 0,
    completedCount: Number(goal.completedCount) || 0,
  }));

  res.json({
    range,
    startAt: startDate.toISOString(),
    endAt: endDate.toISOString(),
    totals,
    summary,
    days,
    goalBreakdown
  });
});

app.get("/api/ai/daily-summary", requireAuth, (req, res, next) => {
  try {
    const dateKey = normalizeDateKey(req.query.dateKey);
    const stored = getStoredDailySummary(req.auth.user.id, dateKey);

    if (!stored) {
      res.status(404).json({ code: "AI_SUMMARY_NOT_FOUND", error: "这一天还没有生成 AI 复盘。" });
      return;
    }

    res.json(stored);
  } catch (error) {
    next(error);
  }
});

app.post("/api/ai/daily-summary", requireAuth, async (req, res, next) => {
  try {
    const dateKey = normalizeDateKey(req.body?.dateKey);
    const context = buildDailySummaryContext(req.auth.user.id, dateKey);
    const sourceFingerprint = createHash("sha256").update(JSON.stringify(context)).digest("hex");
    const stored = getStoredDailySummary(req.auth.user.id, dateKey);
    const force = req.body?.force === true;

    if (stored && !force && stored.sourceFingerprint === sourceFingerprint) {
      res.json({ ...stored, cached: true });
      return;
    }

    if (!getAiApiKey()) {
      res.status(503).json({
        code: "AI_NOT_CONFIGURED",
        error: "AI 总结尚未配置密钥。请在服务器环境变量中添加 OPENAI_API_KEY 或 DEEPSEEK_API_KEY 后重试。"
      });
      return;
    }

    if (!aiRateLimit.consume(req, res)) {
      return;
    }

    const summary = await generateDailySummary(context);
    const generatedAt = nowIso();
    const provider = config.aiProvider;
    const model = getAiModel();

    db.prepare(`
      INSERT INTO ai_daily_summaries (
        user_id, date_key, provider, model, summary_json, source_fingerprint, generated_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, date_key) DO UPDATE SET
        provider = excluded.provider,
        model = excluded.model,
        summary_json = excluded.summary_json,
        source_fingerprint = excluded.source_fingerprint,
        generated_at = excluded.generated_at,
        updated_at = excluded.updated_at
    `).run(
      req.auth.user.id,
      dateKey,
      provider,
      model,
      JSON.stringify(summary),
      sourceFingerprint,
      generatedAt,
      generatedAt
    );

    res.json({
      dateKey,
      model,
      source: provider,
      generatedAt,
      sourceFingerprint,
      summary,
      cached: false
    });
  } catch (error) {
    next(error);
  }
});

app.use(createApiNotFoundHandler());
app.use(createErrorHandler({ production: config.nodeEnv === "production" }));

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  app.listen(port, () => {
    console.log(`考研番茄钟 API 已启动：http://localhost:${port}`);
    if (storageStatus.status === "ephemeral-risk") {
      console.warn(`[数据持久化警告] ${storageStatus.message}`);
    }
  });
}

function normalizeOwnedStudyGoalId(userId, value) {
  const studyGoalId = normalizeOptionalString(value, 120);

  if (!studyGoalId) {
    return null;
  }

  const goal = db.prepare("SELECT id FROM study_goals WHERE id = ? AND user_id = ?").get(studyGoalId, userId);
  return goal ? goal.id : null;
}

function normalizeOwnedTaskId(userId, value) {
  const taskId = normalizeOptionalString(value, 120);

  if (!taskId) {
    return null;
  }

  const task = db.prepare("SELECT id FROM tasks WHERE id = ? AND user_id = ?").get(taskId, userId);
  return task ? task.id : null;
}

function getRangeStart(range) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);

  if (range === "week") {
    date.setDate(date.getDate() - 6);
  }

  if (range === "month") {
    date.setDate(date.getDate() - 29);
  }

  return date;
}

function buildStatsDays(startDate, endDate, rows) {
  const rowsByDate = new Map(rows.map((row) => [
    row.date,
    {
      completedCount: Number(row.completedCount) || 0,
      focusMinutes: Number(row.focusMinutes) || 0,
      xpEarned: Number(row.xpEarned) || 0
    }
  ]));
  const days = [];
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    const dateKey = formatDateKey(cursor);
    const row = rowsByDate.get(dateKey) || {
      completedCount: 0,
      focusMinutes: 0,
      xpEarned: 0
    };

    days.push({
      date: dateKey,
      ...row
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function buildStatsSummary(days, totals) {
  const activeDays = days.filter((day) => day.focusMinutes > 0);
  const bestDay = activeDays.reduce((best, day) => {
    if (!best || day.focusMinutes > best.focusMinutes) {
      return day;
    }

    return best;
  }, null);

  return {
    activeDays: activeDays.length,
    averageDailyMinutes: days.length > 0 ? Math.round(totals.focusMinutes / days.length) : 0,
    averageActiveDayMinutes: activeDays.length > 0 ? Math.round(totals.focusMinutes / activeDays.length) : 0,
    currentStreakDays: countCurrentStreakDays(days),
    bestDay: bestDay ? {
      date: bestDay.date,
      focusMinutes: bestDay.focusMinutes,
      completedCount: bestDay.completedCount
    } : null
  };
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toTaskRow(task) {
  return {
    id: task.id,
    client_id: task.clientId,
    date_key: task.dateKey,
    title: task.title,
    study_goal_id: task.studyGoalId,
    completed: task.completed,
    created_at: task.createdAt,
    completed_at: task.completedAt,
    carried_from_id: task.carriedFromId,
    source: task.source,
    source_label: task.sourceLabel,
    source_date_key: task.sourceDateKey,
    suggested_for_date: task.suggestedForDate,
    ai_generated_at: task.aiGeneratedAt,
    xp_earned: task.xpEarned,
    updated_at: task.updatedAt
  };
}

function toStudyGoalRow(goal) {
  return {
    id: goal.id,
    client_id: goal.clientId,
    title: goal.title,
    description: goal.description,
    target_minutes: goal.targetMinutes,
    weekly_target_minutes: goal.weeklyTargetMinutes,
    target_date: goal.targetDate,
    is_primary: goal.isPrimary,
    completed: goal.completed,
    created_at: goal.createdAt,
    completed_at: goal.completedAt,
    updated_at: goal.updatedAt
  };
}
