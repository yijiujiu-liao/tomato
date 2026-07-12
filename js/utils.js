import {
  DEFAULT_FOCUS_MINUTES,
  DEFAULT_GOAL,
  MAX_FOCUS_MINUTES,
  MIN_FOCUS_MINUTES
} from "./state.js";

export function getDateKey(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(value.getTime())) {
    return getDateKey();
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getRelativeDateKey(offsetDays, from = new Date()) {
  const date = from instanceof Date ? new Date(from) : new Date(from);

  if (Number.isNaN(date.getTime())) {
    return getRelativeDateKey(offsetDays);
  }

  date.setDate(date.getDate() + Number(offsetDays || 0));
  return getDateKey(date);
}

export function formatTime(totalSeconds) {
  const safeSeconds = normalizeNonNegativeInteger(totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function normalizeGoal(goal) {
  const value = Number(goal);
  return Number.isFinite(value) && value >= 1
    ? Math.min(Math.floor(value), 24)
    : DEFAULT_GOAL;
}

export function normalizeNonNegativeInteger(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? Math.floor(numberValue) : 0;
}

export function normalizeFocusDuration(minutes) {
  const value = Number(minutes);
  return Number.isFinite(value) && value >= MIN_FOCUS_MINUTES
    ? Math.min(Math.floor(value), MAX_FOCUS_MINUTES)
    : DEFAULT_FOCUS_MINUTES;
}

export function normalizeRestType(restType) {
  return restType === "long" ? "long" : "short";
}

export function createClientId(prefix, now = Date.now(), random = Math.random()) {
  return `${prefix}-${now}-${random.toString(16).slice(2)}`;
}

export function formatPlanDate(date) {
  return date.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long"
  });
}

export function formatTaskCompletedTime(completedAt) {
  const date = new Date(completedAt);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
