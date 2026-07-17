const PET_IDS = new Set(["penguin", "purpleDragon", "greenDino", "chick"]);
const TASK_SOURCES = new Set(["ai", "review", "delayed", "carry"]);
const MAX_PET_LEVEL = 999;

export function clampInteger(value, fallback, min, max) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.min(Math.max(Math.floor(numberValue), min), max);
}

export function normalizeDateKey(value, now = new Date()) {
  const candidate = String(value || "").trim();
  return isValidDateKey(candidate) ? candidate : now.toISOString().slice(0, 10);
}

export function normalizeOptionalDateKey(value) {
  const candidate = String(value || "").trim();
  return isValidDateKey(candidate) ? candidate : null;
}

export function normalizeRequiredTitle(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

export function normalizePetId(value) {
  return PET_IDS.has(value) ? value : "penguin";
}

export function normalizeOptionalString(value, maxLength) {
  const cleanValue = String(value || "").trim();
  return cleanValue ? cleanValue.slice(0, maxLength) : null;
}

export function normalizeTaskSource(value) {
  const cleanValue = String(value || "").trim();
  return TASK_SOURCES.has(cleanValue) ? cleanValue : null;
}

export function normalizeTimestamp(value) {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp.toISOString();
}

export function getNextLevelXP(level) {
  return 100 + (level - 1) * 50;
}

export function getCumulativeXPForLevel(level) {
  const completedLevels = Math.max(0, level - 1);
  return completedLevels * 100 + (completedLevels * (completedLevels - 1) * 25);
}

export function getPetProgressFromTotalXP(totalXP) {
  let level = 1;
  let currentXP = totalXP;
  let nextLevelXP = getNextLevelXP(level);

  while (level < MAX_PET_LEVEL && currentXP >= nextLevelXP) {
    currentXP -= nextLevelXP;
    level += 1;
    nextLevelXP = getNextLevelXP(level);
  }

  return { level, currentXP, nextLevelXP, totalXP };
}

export function getEvolutionStage(level) {
  if (level >= 20) return 4;
  if (level >= 10) return 3;
  if (level >= 5) return 2;
  return 1;
}

function isValidDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}
