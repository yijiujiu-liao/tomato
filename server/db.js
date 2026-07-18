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
    long_goal_onboarding_completed INTEGER NOT NULL DEFAULT 0,
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
    source TEXT,
    source_label TEXT,
    source_date_key TEXT,
    suggested_for_date TEXT,
    ai_generated_at TEXT,
    xp_earned INTEGER NOT NULL DEFAULT 0,
    study_goal_id TEXT REFERENCES study_goals(id) ON DELETE SET NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks(user_id, date_key);

  CREATE TABLE IF NOT EXISTS study_goals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id TEXT,
    title TEXT NOT NULL,
    target_minutes INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL DEFAULT '',
    weekly_target_minutes INTEGER NOT NULL DEFAULT 0,
    is_primary INTEGER NOT NULL DEFAULT 0,
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
    date_key TEXT,
    minutes INTEGER NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT NOT NULL,
    streak INTEGER NOT NULL DEFAULT 0,
    xp_earned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_end ON focus_sessions(user_id, ended_at);

  CREATE TABLE IF NOT EXISTS ai_daily_summaries (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date_key TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    summary_json TEXT NOT NULL,
    source_fingerprint TEXT NOT NULL,
    generated_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, date_key)
  );
`);

const focusSessionColumns = db.prepare("PRAGMA table_info(focus_sessions)").all().map((column) => column.name);
const taskColumns = db.prepare("PRAGMA table_info(tasks)").all().map((column) => column.name);
const userSettingsColumns = db.prepare("PRAGMA table_info(user_settings)").all().map((column) => column.name);

if (!userSettingsColumns.includes("current_study_goal_id")) {
  db.exec("ALTER TABLE user_settings ADD COLUMN current_study_goal_id TEXT");
}

if (!userSettingsColumns.includes("long_goal_onboarding_completed")) {
  db.exec("ALTER TABLE user_settings ADD COLUMN long_goal_onboarding_completed INTEGER NOT NULL DEFAULT 0");
  db.exec(`
    UPDATE user_settings
    SET long_goal_onboarding_completed = 1
    WHERE EXISTS (
      SELECT 1 FROM study_goals WHERE study_goals.user_id = user_settings.user_id
    )
  `);
}

if (!taskColumns.includes("client_id")) {
  db.exec("ALTER TABLE tasks ADD COLUMN client_id TEXT");
}

if (!taskColumns.includes("source")) {
  db.exec("ALTER TABLE tasks ADD COLUMN source TEXT");
}

if (!taskColumns.includes("source_label")) {
  db.exec("ALTER TABLE tasks ADD COLUMN source_label TEXT");
}

if (!taskColumns.includes("source_date_key")) {
  db.exec("ALTER TABLE tasks ADD COLUMN source_date_key TEXT");
}

if (!taskColumns.includes("suggested_for_date")) {
  db.exec("ALTER TABLE tasks ADD COLUMN suggested_for_date TEXT");
}

if (!taskColumns.includes("ai_generated_at")) {
  db.exec("ALTER TABLE tasks ADD COLUMN ai_generated_at TEXT");
}

if (!taskColumns.includes("xp_earned")) {
  db.exec("ALTER TABLE tasks ADD COLUMN xp_earned INTEGER NOT NULL DEFAULT 0");
}

if (!taskColumns.includes("study_goal_id")) {
  db.exec("ALTER TABLE tasks ADD COLUMN study_goal_id TEXT REFERENCES study_goals(id) ON DELETE SET NULL");
}

if (!focusSessionColumns.includes("client_id")) {
  db.exec("ALTER TABLE focus_sessions ADD COLUMN client_id TEXT");
}

if (!focusSessionColumns.includes("study_goal_id")) {
  db.exec("ALTER TABLE focus_sessions ADD COLUMN study_goal_id TEXT");
}

if (!focusSessionColumns.includes("date_key")) {
  db.exec("ALTER TABLE focus_sessions ADD COLUMN date_key TEXT");
  db.exec("UPDATE focus_sessions SET date_key = substr(ended_at, 1, 10) WHERE date_key IS NULL");
}

const studyGoalColumns = db.prepare("PRAGMA table_info(study_goals)").all().map((column) => column.name);

if (!studyGoalColumns.includes("client_id")) {
  db.exec("ALTER TABLE study_goals ADD COLUMN client_id TEXT");
}

if (!studyGoalColumns.includes("description")) {
  db.exec("ALTER TABLE study_goals ADD COLUMN description TEXT NOT NULL DEFAULT ''");
}

if (!studyGoalColumns.includes("weekly_target_minutes")) {
  db.exec("ALTER TABLE study_goals ADD COLUMN weekly_target_minutes INTEGER NOT NULL DEFAULT 0");
}

if (!studyGoalColumns.includes("is_primary")) {
  db.exec("ALTER TABLE study_goals ADD COLUMN is_primary INTEGER NOT NULL DEFAULT 0");
  db.exec(`
    UPDATE study_goals
    SET is_primary = 1
    WHERE id IN (
      SELECT candidate.id
      FROM study_goals AS candidate
      WHERE candidate.completed = 0
        AND candidate.id = (
          SELECT latest.id
          FROM study_goals AS latest
          WHERE latest.user_id = candidate.user_id AND latest.completed = 0
          ORDER BY latest.updated_at DESC, latest.created_at DESC, latest.id DESC
          LIMIT 1
        )
    )
  `);
}

db.exec(`
  UPDATE study_goals AS goal
  SET is_primary = 0
  WHERE goal.is_primary = 1
    AND goal.id <> (
      SELECT preferred.id
      FROM study_goals AS preferred
      WHERE preferred.user_id = goal.user_id AND preferred.is_primary = 1
      ORDER BY preferred.updated_at DESC, preferred.id DESC
      LIMIT 1
    );
`);

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

  CREATE UNIQUE INDEX IF NOT EXISTS idx_study_goals_user_primary
  ON study_goals(user_id)
  WHERE is_primary = 1;

  CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_date
  ON focus_sessions(user_id, date_key);
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
    source: row.source || "",
    sourceLabel: row.source_label || "",
    sourceDateKey: row.source_date_key || "",
    suggestedForDate: row.suggested_for_date || "",
    aiGeneratedAt: row.ai_generated_at || "",
    studyGoalId: row.study_goal_id || "",
    xpEarned: Number(row.xp_earned) || 0,
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
    description: row.description || "",
    targetMinutes,
    weeklyTargetMinutes: Number(row.weekly_target_minutes) || 0,
    recentFocusMinutes: Number(row.recent_focus_minutes) || 0,
    focusMinutes,
    progressPercent: targetMinutes > 0 ? Math.min(100, Math.round((focusMinutes / targetMinutes) * 100)) : 0,
    targetDate: row.target_date,
    isPrimary: toBoolean(row.is_primary),
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
    longGoalOnboardingCompleted: toBoolean(row.long_goal_onboarding_completed),
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
