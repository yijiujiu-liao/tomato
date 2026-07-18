import { createClientId, normalizeNonNegativeInteger } from "./utils.js";

export function normalizeTask(task) {
  if (!task || typeof task !== "object" || typeof task.title !== "string" || !task.title.trim()) {
    return null;
  }

  const syncedTaskId = typeof task.syncedTaskId === "string" && task.syncedTaskId
    ? task.syncedTaskId
    : (typeof task.id === "string" && task.clientId ? task.id : "");
  const clientId = typeof task.clientId === "string" && task.clientId
    ? task.clientId
    : (syncedTaskId ? "" : (typeof task.id === "string" ? task.id : createClientId("task")));

  return {
    id: syncedTaskId || clientId || createClientId("task"),
    clientId,
    syncedTaskId,
    title: task.title.trim(),
    studyGoalId: typeof task.studyGoalId === "string" ? task.studyGoalId : "",
    completed: Boolean(task.completed),
    createdAt: typeof task.createdAt === "string" ? task.createdAt : new Date().toISOString(),
    completedAt: task.completed && typeof task.completedAt === "string" ? task.completedAt : null,
    xpEarned: normalizeNonNegativeInteger(task.xpEarned),
    carriedFromId: typeof task.carriedFromId === "string" ? task.carriedFromId : undefined,
    source: normalizeTaskSource(task.source),
    sourceLabel: typeof task.sourceLabel === "string" ? task.sourceLabel.slice(0, 24) : "",
    sourceDateKey: typeof task.sourceDateKey === "string" ? task.sourceDateKey : "",
    suggestedForDate: typeof task.suggestedForDate === "string" ? task.suggestedForDate : "",
    aiGeneratedAt: typeof task.aiGeneratedAt === "string" ? task.aiGeneratedAt : ""
  };
}

export function normalizeTaskSource(source) {
  return ["ai", "review", "delayed", "carry"].includes(source) ? source : "";
}

export function getTaskSourceLabel(task) {
  if (task.source === "ai") {
    return task.sourceLabel || "AI 建议";
  }

  if (task.source === "review") {
    return task.sourceLabel || "复盘建议";
  }

  return "";
}

export function sortExecutableTasks(tasks, currentTaskId = "") {
  return [...tasks].sort((first, second) => {
    const firstIsCurrent = first.id === currentTaskId;
    const secondIsCurrent = second.id === currentTaskId;

    if (firstIsCurrent !== secondIsCurrent) {
      return firstIsCurrent ? -1 : 1;
    }

    const firstIsAi = first.source === "ai";
    const secondIsAi = second.source === "ai";

    if (firstIsAi !== secondIsAi) {
      return firstIsAi ? -1 : 1;
    }

    return new Date(first.createdAt) - new Date(second.createdAt);
  });
}

export function resolveExecutableTaskSelection(tasks, currentTaskId = "") {
  const executableTasks = sortExecutableTasks(
    tasks.filter((task) => !task.completed),
    currentTaskId,
  );
  const selectedTask = executableTasks.find((task) => task.id === currentTaskId)
    || executableTasks[0]
    || null;
  const nextTaskId = selectedTask?.id || "";

  return {
    task: selectedTask,
    changed: nextTaskId !== currentTaskId,
  };
}

export function createLocalTask({ title, id = createClientId("task"), now = new Date(), ...metadata }) {
  const cleanTitle = String(title || "").trim().slice(0, 60);
  if (!cleanTitle) return null;
  return normalizeTask({
    id,
    clientId: "",
    syncedTaskId: "",
    title: cleanTitle,
    completed: false,
    createdAt: now.toISOString(),
    completedAt: null,
    ...metadata,
  });
}

export function addUniqueTask({ store, dateKey, title, metadata = {}, id, now = new Date() }) {
  const cleanTitle = String(title || "").trim().slice(0, 60);
  if (!cleanTitle) return null;
  const tasks = store.getTasks(dateKey, { create: true });
  const duplicate = tasks.some((task) => {
    const sameSource = metadata.carriedFromId && task.carriedFromId === metadata.carriedFromId;
    return sameSource || task.title.trim().toLowerCase() === cleanTitle.toLowerCase();
  });
  if (duplicate) return null;

  const task = createLocalTask({ title: cleanTitle, id, now, ...metadata });
  if (!task) return null;
  if (metadata.source === "ai") {
    const priorityCount = tasks.filter((item) => !item.completed && item.source === "ai").length;
    store.addTask(dateKey, task, { index: Math.min(priorityCount, 3) });
  } else {
    store.addTask(dateKey, task);
  }
  return task;
}

export function setTaskCompleted(task, completed, now = new Date()) {
  if (!task) return null;
  task.completed = Boolean(completed);
  task.completedAt = task.completed ? now.toISOString() : null;
  return task;
}

export function renameTask(task, title) {
  const cleanTitle = String(title || "").trim().slice(0, 60);
  if (!task || !cleanTitle) return null;
  task.title = cleanTitle;
  return task;
}

export function carryOverUnfinishedTasks({ store, fromDateKey, toDateKey, createId, now = new Date() }) {
  const destination = store.getTasks(toDateKey, { create: true });
  const existingKeys = new Set(destination.flatMap((task) => [task.carriedFromId, task.title].filter(Boolean)));
  const carried = store.getTasks(fromDateKey)
    .filter((task) => !task.completed && !existingKeys.has(task.id) && !existingKeys.has(task.title))
    .map((task) => createLocalTask({
      id: createId(),
      title: task.title,
      studyGoalId: task.studyGoalId,
      source: task.source || "carry",
      sourceLabel: task.sourceLabel,
      sourceDateKey: task.sourceDateKey,
      suggestedForDate: task.suggestedForDate,
      aiGeneratedAt: task.aiGeneratedAt,
      carriedFromId: task.id,
      now,
    }))
    .filter(Boolean);
  carried.forEach((task) => store.addTask(toDateKey, task));
  return carried;
}

export function delayTask({ store, fromDateKey, toDateKey, taskId, createId, now = new Date() }) {
  const task = store.getTasks(fromDateKey).find((item) => item.id === taskId);
  if (!task || task.completed) return { task: null, delayedTask: null };
  store.removeTask(fromDateKey, taskId);
  const delayedTask = normalizeTask({
    ...task,
    id: createId(),
    clientId: "",
    syncedTaskId: "",
    completed: false,
    completedAt: null,
    createdAt: now.toISOString(),
    carriedFromId: task.id,
  });
  if (delayedTask) store.addTask(toDateKey, delayedTask);
  return { task, delayedTask };
}
