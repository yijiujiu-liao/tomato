import express from "express";
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

export const app = express();
const port = config.port;
const publicDir = config.publicDir;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(publicDir, {
  extensions: ["html"],
  setHeaders(res, filePath) {
    if (filePath.endsWith("sw.js")) {
      res.setHeader("Cache-Control", "no-cache");
    }
  }
}));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "kaoyan-pomodoro-api",
    environment: config.nodeEnv,
    uptimeSeconds: Math.round(process.uptime()),
    database: "sqlite"
  });
});

app.get("/api/ready", (req, res, next) => {
  try {
    db.prepare("SELECT 1 AS ok").get();
    res.json({ ok: true, database: "ready" });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/register", (req, res, next) => {
  try {
    const user = createUser(req.body || {});
    const session = createSession(user.id);

    res.status(201).json({ user, session });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", (req, res, next) => {
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
      COALESCE(SUM(CASE WHEN focus_sessions.mode = 'focus' THEN focus_sessions.minutes ELSE 0 END), 0) AS focus_minutes
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
    currentTaskId: req.body?.currentTaskId || null,
    currentStudyGoalId: normalizeOwnedStudyGoalId(userId, req.body?.currentStudyGoalId),
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
        updated_at = ?
    WHERE user_id = ?
  `).run(
    next.focusDuration,
    next.dailyGoal,
    next.theme,
    next.nextRestType,
    next.currentTaskId,
    next.currentStudyGoalId,
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
  const level = clampInteger(req.body?.level, current.level, 1, 999);
  const nextLevelXP = getNextLevelXP(level);
  const next = {
    petId: normalizePetId(req.body?.petId || current.pet_id),
    level,
    currentXP: clampInteger(req.body?.currentXP, current.current_xp, 0, nextLevelXP - 1),
    nextLevelXP,
    totalXP: Math.max(0, Math.floor(Number(req.body?.totalXP ?? current.total_xp))),
    evolutionStage: getEvolutionStage(level),
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

  if (clientId) {
    const existing = db.prepare(`
      SELECT * FROM tasks
      WHERE user_id = ? AND client_id = ?
    `).get(req.auth.user.id, clientId);

    if (existing) {
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
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
  const updatedAt = nowIso();

  db.prepare(`
    UPDATE tasks
    SET title = ?,
        completed = ?,
        completed_at = ?,
        updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(title, completed, completedAt, updatedAt, req.params.taskId, req.auth.user.id);

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
      COALESCE(SUM(CASE WHEN focus_sessions.mode = 'focus' THEN focus_sessions.minutes ELSE 0 END), 0) AS focus_minutes
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
    targetMinutes: clampInteger(req.body?.targetMinutes, 0, 0, 99999),
    targetDate: normalizeOptionalDateKey(req.body?.targetDate),
    completed: typeof req.body?.completed === "boolean" ? Number(req.body.completed) : 0,
    createdAt: nowIso(),
    completedAt: req.body?.completed === true ? nowIso() : null,
    updatedAt: nowIso()
  };

  db.prepare(`
    INSERT INTO study_goals (
      id,
      user_id,
      client_id,
      title,
      target_minutes,
      target_date,
      completed,
      created_at,
      completed_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    goal.id,
    goal.userId,
    goal.clientId,
    goal.title,
    goal.targetMinutes,
    goal.targetDate,
    goal.completed,
    goal.createdAt,
    goal.completedAt,
    goal.updatedAt
  );

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
  const completed = typeof req.body?.completed === "boolean" ? Number(req.body.completed) : current.completed;
  const completedAt = completed && !current.completed_at ? nowIso() : (completed ? current.completed_at : null);
  const updatedAt = nowIso();

  db.prepare(`
    UPDATE study_goals
    SET title = ?,
        target_minutes = ?,
        target_date = ?,
        completed = ?,
        completed_at = ?,
        updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(
    title,
    targetMinutes,
    targetDate,
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
  const endedAt = req.body?.endedAt ? new Date(req.body.endedAt).toISOString() : nowIso();
  const startedAt = req.body?.startedAt
    ? new Date(req.body.startedAt).toISOString()
    : new Date(new Date(endedAt).getTime() - minutes * 60 * 1000).toISOString();
  const taskId = req.body?.taskId || null;
  const studyGoalId = normalizeOwnedStudyGoalId(req.auth.user.id, req.body?.studyGoalId);
  const taskTitle = String(req.body?.taskTitle || "未命名学习任务").trim().slice(0, 80);
  const streak = Math.max(0, Math.floor(Number(req.body?.streak || 0)));
  const xpEarned = Math.max(0, Math.floor(Number(req.body?.xpEarned || minutes)));
  const clientId = normalizeOptionalString(req.body?.clientId, 120);

  if (clientId) {
    const existing = db.prepare(`
      SELECT
        id,
        client_id AS clientId,
        task_id AS taskId,
        study_goal_id AS studyGoalId,
        task_title AS taskTitle,
        mode,
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
      minutes,
      started_at,
      ended_at,
      streak,
      xp_earned,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    session.id,
    session.userId,
    session.clientId,
    session.taskId,
    session.studyGoalId,
    session.taskTitle,
    session.mode,
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
      date(ended_at, 'localtime') AS date,
      COUNT(*) AS completedCount,
      COALESCE(SUM(minutes), 0) AS focusMinutes,
      COALESCE(SUM(xp_earned), 0) AS xpEarned
    FROM focus_sessions
    WHERE user_id = ? AND mode = 'focus' AND ended_at >= ?
    GROUP BY date(ended_at, 'localtime')
    ORDER BY date ASC
  `).all(req.auth.user.id, startDate.toISOString());
  const days = buildStatsDays(startDate, endDate, rows);
  const totals = days.reduce((summary, row) => {
    summary.completedCount += row.completedCount;
    summary.focusMinutes += row.focusMinutes;
    summary.xpEarned += row.xpEarned;
    return summary;
  }, { completedCount: 0, focusMinutes: 0, xpEarned: 0 });
  const summary = buildStatsSummary(days, totals);

  res.json({
    range,
    startAt: startDate.toISOString(),
    endAt: endDate.toISOString(),
    totals,
    summary,
    days
  });
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ error: "API 不存在。" });
    return;
  }

  next();
});

app.use((error, req, res, next) => {
  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    error: error.message || "服务器错误。"
  });
});

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  app.listen(port, () => {
    console.log(`考研番茄钟 API 已启动：http://localhost:${port}`);
  });
}

function clampInteger(value, fallback, min, max) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.min(Math.max(Math.floor(numberValue), min), max);
}

function normalizeDateKey(value) {
  const candidate = String(value || "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    return candidate;
  }

  return new Date().toISOString().slice(0, 10);
}

function normalizeOptionalDateKey(value) {
  const candidate = String(value || "").trim();

  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : null;
}

function normalizeRequiredTitle(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizePetId(value) {
  return ["penguin", "purpleDragon", "greenDino", "chick"].includes(value) ? value : "penguin";
}

function normalizeOptionalString(value, maxLength) {
  const cleanValue = String(value || "").trim();

  if (!cleanValue) {
    return null;
  }

  return cleanValue.slice(0, maxLength);
}

function normalizeOwnedStudyGoalId(userId, value) {
  const studyGoalId = normalizeOptionalString(value, 120);

  if (!studyGoalId) {
    return null;
  }

  const goal = db.prepare("SELECT id FROM study_goals WHERE id = ? AND user_id = ?").get(studyGoalId, userId);
  return goal ? goal.id : null;
}

function getNextLevelXP(level) {
  return 100 + (level - 1) * 50;
}

function getEvolutionStage(level) {
  if (level >= 20) {
    return 4;
  }

  if (level >= 10) {
    return 3;
  }

  if (level >= 5) {
    return 2;
  }

  return 1;
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
    currentStreakDays: countTrailingActiveDays(days),
    bestDay: bestDay ? {
      date: bestDay.date,
      focusMinutes: bestDay.focusMinutes,
      completedCount: bestDay.completedCount
    } : null
  };
}

function countTrailingActiveDays(days) {
  let streak = 0;

  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (days[index].focusMinutes <= 0) {
      break;
    }

    streak += 1;
  }

  return streak;
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
    completed: task.completed,
    created_at: task.createdAt,
    completed_at: task.completedAt,
    carried_from_id: task.carriedFromId,
    updated_at: task.updatedAt
  };
}

function toStudyGoalRow(goal) {
  return {
    id: goal.id,
    client_id: goal.clientId,
    title: goal.title,
    target_minutes: goal.targetMinutes,
    target_date: goal.targetDate,
    completed: goal.completed,
    created_at: goal.createdAt,
    completed_at: goal.completedAt,
    updated_at: goal.updatedAt
  };
}
