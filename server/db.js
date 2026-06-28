import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { config } from "./config.js";

const databasePath = config.databasePath;
mkdirSync(dirname(databasePath), { recursive: true });

export const db = new DatabaseSync(databasePath);
db.exec("PRAGMA foreign_keys = ON");
db.exec("PRAGMA journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    focus_duration INTEGER NOT NULL DEFAULT 50,
    daily_goal INTEGER NOT NULL DEFAULT 8,
    theme TEXT NOT NULL DEFAULT 'light',
    next_rest_type TEXT NOT NULL DEFAULT 'short',
    current_task_id TEXT,
    current_study_goal_id TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pets (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    pet_id TEXT NOT NULL DEFAULT 'penguin',
    level INTEGER NOT NULL DEFAULT 1,
    current_xp INTEGER NOT NULL DEFAULT 0,
    next_level_xp INTEGER NOT NULL DEFAULT 100,
    total_xp INTEGER NOT NULL DEFAULT 0,
    evolution_stage INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id TEXT,
    date_key TEXT NOT NULL,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    carried_from_id TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks(user_id, date_key);

  CREATE TABLE IF NOT EXISTS study_goals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id TEXT,
    title TEXT NOT NULL,
    target_minutes INTEGER NOT NULL DEFAULT 0,
    target_date TEXT,
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_study_goals_user_status ON study_goals(user_id, completed, updated_at);

  CREATE TABLE IF NOT EXISTS focus_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id TEXT,
    task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
    study_goal_id TEXT REFERENCES study_goals(id) ON DELETE SET NULL,
    task_title TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'focus',
    minutes INTEGER NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT NOT NULL,
    streak INTEGER NOT NULL DEFAULT 0,
    xp_earned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_end ON focus_sessions(user_id, ended_at);
`);

const focusSessionColumns = db.prepare("PRAGMA table_info(focus_sessions)").all().map((column) => column.name);
const taskColumns = db.prepare("PRAGMA table_info(tasks)").all().map((column) => column.name);
const userSettingsColumns = db.prepare("PRAGMA table_info(user_settings)").all().map((column) => column.name);

if (!userSettingsColumns.includes("current_study_goal_id")) {
  db.exec("ALTER TABLE user_settings ADD COLUMN current_study_goal_id TEXT");
}

if (!taskColumns.includes("client_id")) {
  db.exec("ALTER TABLE tasks ADD COLUMN client_id TEXT");
}

if (!focusSessionColumns.includes("client_id")) {
  db.exec("ALTER TABLE focus_sessions ADD COLUMN client_id TEXT");
}

if (!focusSessionColumns.includes("study_goal_id")) {
  db.exec("ALTER TABLE focus_sessions ADD COLUMN study_goal_id TEXT");
}

const studyGoalColumns = db.prepare("PRAGMA table_info(study_goals)").all().map((column) => column.name);

if (!studyGoalColumns.includes("client_id")) {
  db.exec("ALTER TABLE study_goals ADD COLUMN client_id TEXT");
}

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_user_client
  ON tasks(user_id, client_id)
  WHERE client_id IS NOT NULL;

  CREATE UNIQUE INDEX IF NOT EXISTS idx_focus_sessions_user_client
  ON focus_sessions(user_id, client_id)
  WHERE client_id IS NOT NULL;

  CREATE UNIQUE INDEX IF NOT EXISTS idx_study_goals_user_client
  ON study_goals(user_id, client_id)
  WHERE client_id IS NOT NULL;
`);

export function nowIso() {
  return new Date().toISOString();
}

export function createId() {
  return crypto.randomUUID();
}

export function createDefaultUserState(userId) {
  const createdAt = nowIso();

  db.prepare(`
    INSERT OR IGNORE INTO user_settings (
      user_id,
      focus_duration,
      daily_goal,
      theme,
      next_rest_type,
      updated_at
    )
    VALUES (?, 50, 8, 'light', 'short', ?)
  `).run(userId, createdAt);

  db.prepare(`
    INSERT OR IGNORE INTO pets (
      user_id,
      pet_id,
      level,
      current_xp,
      next_level_xp,
      total_xp,
      evolution_stage,
      updated_at
    )
    VALUES (?, 'penguin', 1, 0, 100, 0, 1, ?)
  `).run(userId, createdAt);
}

export function toBoolean(value) {
  return Boolean(Number(value));
}

export function taskFromRow(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    dateKey: row.date_key,
    title: row.title,
    completed: toBoolean(row.completed),
    createdAt: row.created_at,
    completedAt: row.completed_at,
    carriedFromId: row.carried_from_id,
    updatedAt: row.updated_at
  };
}

export function goalFromRow(row) {
  const focusMinutes = Number(row.focus_minutes) || 0;
  const targetMinutes = row.target_minutes;

  return {
    id: row.id,
    clientId: row.client_id,
    title: row.title,
    targetMinutes,
    focusMinutes,
    progressPercent: targetMinutes > 0 ? Math.min(100, Math.round((focusMinutes / targetMinutes) * 100)) : 0,
    targetDate: row.target_date,
    completed: toBoolean(row.completed),
    createdAt: row.created_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at
  };
}

export function settingsFromRow(row) {
  return {
    focusDuration: row.focus_duration,
    dailyGoal: row.daily_goal,
    theme: row.theme,
    nextRestType: row.next_rest_type,
    currentTaskId: row.current_task_id,
    currentStudyGoalId: row.current_study_goal_id,
    updatedAt: row.updated_at
  };
}

export function petFromRow(row) {
  return {
    petId: row.pet_id,
    level: row.level,
    currentXP: row.current_xp,
    nextLevelXP: row.next_level_xp,
    totalXP: row.total_xp,
    evolutionStage: row.evolution_stage,
    updatedAt: row.updated_at
  };
}
