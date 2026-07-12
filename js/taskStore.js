import { loadDailyPlans, loadStringSet, saveJson } from "./storage.js";
import { normalizeTask } from "./tasks.js";

export function createTaskStore({ storage, plansKey, deletedKey }) {
  let plans = loadDailyPlans(storage, plansKey, normalizeTask);
  const deletedIds = loadStringSet(storage, deletedKey);

  function savePlans() {
    saveJson(storage, plansKey, plans);
  }

  function getTasks(dateKey, { create = false } = {}) {
    if (!Array.isArray(plans[dateKey])) {
      if (!create) return [];
      plans[dateKey] = [];
    }
    return plans[dateKey];
  }

  function setTasks(dateKey, tasks, { persist = false } = {}) {
    plans[dateKey] = Array.isArray(tasks) ? tasks : [];
    if (persist) savePlans();
    return plans[dateKey];
  }

  function addTask(dateKey, task, { index, persist = false } = {}) {
    const tasks = getTasks(dateKey, { create: true });
    if (Number.isInteger(index) && index >= 0 && index < tasks.length) {
      tasks.splice(index, 0, task);
    } else {
      tasks.push(task);
    }
    if (persist) savePlans();
    return task;
  }

  function removeTask(dateKey, taskId, { persist = false } = {}) {
    const tasks = getTasks(dateKey);
    const removed = tasks.find((task) => task.id === taskId) || null;
    setTasks(dateKey, tasks.filter((task) => task.id !== taskId), { persist });
    return removed;
  }

  function replacePlans(nextPlans, { persist = false } = {}) {
    plans = nextPlans && typeof nextPlans === "object" ? nextPlans : {};
    if (persist) savePlans();
    return plans;
  }

  function saveDeletedIds() {
    saveJson(storage, deletedKey, [...deletedIds]);
  }

  function rememberDeleted(taskId) {
    if (!taskId) return;
    deletedIds.add(String(taskId));
    saveDeletedIds();
  }

  function forgetDeleted(taskId) {
    deletedIds.delete(String(taskId));
    saveDeletedIds();
  }

  return {
    getPlans: () => plans,
    getTasks,
    setTasks,
    addTask,
    removeTask,
    replacePlans,
    savePlans,
    getDeletedIds: () => deletedIds,
    rememberDeleted,
    forgetDeleted,
  };
}
