import { createUser, getUserByEmail, hashPassword } from "../server/auth.js";
import { createId, db, nowIso } from "../server/db.js";

const DEMO_EMAIL = "demo@tomato.local";
const DEMO_PASSWORD = "password123";
const DEMO_DISPLAY_NAME = "演示考研同学";

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function atLocal(daysAgo, hour, minute = 0) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() - daysAgo);

  return date;
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

function ensureDemoUser() {
  const existing = getUserByEmail(DEMO_EMAIL);

  if (existing) {
    const updatedAt = nowIso();
    db.prepare(`
      UPDATE users
      SET display_name = ?,
          password_hash = ?,
          updated_at = ?
      WHERE id = ?
    `).run(DEMO_DISPLAY_NAME, hashPassword(DEMO_PASSWORD), updatedAt, existing.id);

    return existing.id;
  }

  return createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    displayName: DEMO_DISPLAY_NAME
  }).id;
}

function resetDemoData(userId) {
  db.prepare("DELETE FROM focus_sessions WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM tasks WHERE user_id = ?").run(userId);
  db.prepare("DELETE FROM study_goals WHERE user_id = ?").run(userId);
}

function insertTask(userId, task) {
  const createdAt = task.createdAt || nowIso();
  const completedAt = task.completed ? (task.completedAt || createdAt) : null;
  const id = createId();

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
    id,
    userId,
    task.clientId,
    task.dateKey,
    task.title,
    Number(Boolean(task.completed)),
    createdAt,
    completedAt,
    task.carriedFromId || null,
    task.updatedAt || createdAt
  );

  return id;
}

function insertStudyGoal(userId, goal) {
  const createdAt = goal.createdAt || nowIso();
  const id = createId();

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
    id,
    userId,
    goal.clientId,
    goal.title,
    goal.targetMinutes,
    goal.targetDate,
    Number(Boolean(goal.completed)),
    createdAt,
    goal.completedAt || null,
    goal.updatedAt || createdAt
  );

  return id;
}

function insertFocusSession(userId, session) {
  const endedAt = session.endedAt.toISOString();
  const startedAt = new Date(session.endedAt.getTime() - session.minutes * 60 * 1000).toISOString();

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
    VALUES (?, ?, ?, ?, ?, ?, 'focus', ?, ?, ?, ?, ?, ?)
  `).run(
    createId(),
    userId,
    session.clientId,
    session.taskId || null,
    session.studyGoalId || null,
    session.taskTitle,
    session.minutes,
    startedAt,
    endedAt,
    session.streak,
    session.xpEarned,
    nowIso()
  );
}

function seedDemoData() {
  const userId = ensureDemoUser();
  resetDemoData(userId);

  const today = getDateKey();
  const yesterday = getDateKey(atLocal(1, 9));
  const taskIds = new Map();
  const goalIds = new Map();

  const tasks = [
    ["demo-task-math", "数学强化：线代特征值错题复盘", today, true],
    ["demo-task-english", "英语阅读：2018 Text 2 精读", today, true],
    ["demo-task-politics", "政治：马原框架背诵 30 分钟", today, false],
    ["demo-task-major", "专业课：第 5 章名词解释整理", today, false],
    ["demo-task-yesterday-left", "昨日遗留：政治选择题二刷", yesterday, false]
  ];

  for (const [clientId, title, dateKey, completed] of tasks) {
    taskIds.set(clientId, insertTask(userId, {
      clientId,
      title,
      dateKey,
      completed,
      createdAt: nowIso()
    }));
  }

  const goals = [
    {
      clientId: "demo-goal-math",
      title: "数学强化二轮：错题体系建立",
      targetMinutes: 3600,
      targetDate: getDateKey(atLocal(-48, 9))
    },
    {
      clientId: "demo-goal-english",
      title: "英语真题阅读 20 篇精读",
      targetMinutes: 2400,
      targetDate: getDateKey(atLocal(-35, 9))
    },
    {
      clientId: "demo-goal-politics",
      title: "政治马原框架一轮背完",
      targetMinutes: 1800,
      targetDate: getDateKey(atLocal(-28, 9))
    }
  ];

  for (const goal of goals) {
    goalIds.set(goal.clientId, insertStudyGoal(userId, goal));
  }

  const focusPlan = [
    { daysAgo: 17, sessions: [["数学基础回顾", 45, "demo-goal-math"], ["英语单词复习", 30, "demo-goal-english"]] },
    { daysAgo: 16, sessions: [["线代矩阵题型", 50, "demo-goal-math"]] },
    { daysAgo: 15, sessions: [["英语阅读精读", 50, "demo-goal-english"], ["政治马原导论", 35, "demo-goal-politics"]] },
    { daysAgo: 13, sessions: [["高数极限错题", 50, "demo-goal-math"], ["专业课背诵", 40, "demo-goal-politics"]] },
    { daysAgo: 12, sessions: [["英语长难句", 45, "demo-goal-english"]] },
    { daysAgo: 11, sessions: [["数学强化例题", 50, "demo-goal-math"], ["数学错题整理", 50, "demo-goal-math"], ["政治选择题", 30, "demo-goal-politics"]] },
    { daysAgo: 10, sessions: [["英语阅读二刷", 50, "demo-goal-english"], ["专业课框架", 45, "demo-goal-politics"]] },
    { daysAgo: 8, sessions: [["高数积分专题", 50, "demo-goal-math"]] },
    { daysAgo: 7, sessions: [["英语真题精读", 50, "demo-goal-english"], ["政治马原背诵", 35, "demo-goal-politics"]] },
    { daysAgo: 6, sessions: [["线代特征值", 50, "demo-goal-math"], ["线代错题复盘", 50, "demo-goal-math"]] },
    { daysAgo: 5, sessions: [["英语翻译练习", 45, "demo-goal-english"]] },
    { daysAgo: 4, sessions: [["数学综合套题", 50, "demo-goal-math"], ["专业课名词解释", 40, "demo-goal-politics"]] },
    { daysAgo: 3, sessions: [["英语阅读 2019", 50, "demo-goal-english"], ["政治选择题整理", 30, "demo-goal-politics"]] },
    { daysAgo: 2, sessions: [["数学错题本回看", 50, "demo-goal-math"], ["英语作文模板", 35, "demo-goal-english"]] },
    { daysAgo: 1, sessions: [["数学强化第 6 讲", 50, "demo-goal-math"], ["政治马原框架", 45, "demo-goal-politics"]] },
    {
      daysAgo: 0,
      sessions: [
        ["数学强化：线代特征值错题复盘", 50, "demo-goal-math", "demo-task-math"],
        ["英语阅读：2018 Text 2 精读", 45, "demo-goal-english", "demo-task-english"]
      ]
    }
  ];

  let focusSessionCount = 0;
  let focusMinutes = 0;

  for (const day of focusPlan) {
    for (let index = 0; index < day.sessions.length; index += 1) {
      const [taskTitle, minutes, goalClientId, taskClientId] = day.sessions[index];
      insertFocusSession(userId, {
        clientId: `demo-focus-${day.daysAgo}-${index}`,
        taskId: taskClientId ? taskIds.get(taskClientId) : null,
        studyGoalId: goalIds.get(goalClientId),
        taskTitle,
        minutes,
        endedAt: atLocal(day.daysAgo, 19 + index, index * 7),
        streak: Math.max(1, 18 - day.daysAgo),
        xpEarned: minutes + 5
      });
      focusSessionCount += 1;
      focusMinutes += minutes;
    }
  }

  const level = 8;
  db.prepare(`
    UPDATE pets
    SET pet_id = 'greenDino',
        level = ?,
        current_xp = 70,
        next_level_xp = ?,
        total_xp = 960,
        evolution_stage = ?,
        updated_at = ?
    WHERE user_id = ?
  `).run(level, getNextLevelXP(level), getEvolutionStage(level), nowIso(), userId);

  db.prepare(`
    UPDATE user_settings
    SET focus_duration = 50,
        daily_goal = 6,
        theme = 'light',
        next_rest_type = 'short',
        current_task_id = ?,
        current_study_goal_id = ?,
        updated_at = ?
    WHERE user_id = ?
  `).run(taskIds.get("demo-task-politics"), goalIds.get("demo-goal-math"), nowIso(), userId);

  return {
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    tasks: tasks.length,
    goals: goals.length,
    focusSessions: focusSessionCount,
    focusMinutes
  };
}

const summary = seedDemoData();
console.log(JSON.stringify(summary, null, 2));
