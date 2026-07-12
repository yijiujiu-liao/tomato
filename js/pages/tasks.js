import { buildTaskCardHtml } from "../components/taskCard.js";
import { getTaskSourceLabel, sortExecutableTasks } from "../tasks.js";
import { escapeHtml, formatTaskCompletedTime } from "../utils.js";

export function createTasksPageController({
  elements,
  taskSwipeController,
  formatPlanDate,
  onFocus,
  onEdit,
  onDelete,
  onRestore,
  onComplete,
  onDelay,
}) {
  let expanded = false;
  let recentlyCompletedTaskId = "";

  function render(tasks, currentTaskId) {
    renderTasksPageView({
      elements,
      tasks,
      renderTaskCard: (task) => renderCard(task, currentTaskId),
      formatPlanDate,
      currentTaskId,
    });
    renderExpansion();
  }

  function renderCard(task, currentTaskId) {
    const item = document.createElement("li");
    item.className = "plan-task-item";
    item.dataset.completed = String(task.completed);
    item.dataset.taskId = task.id;
    item.innerHTML = buildTaskCardHtml({
      task,
      completedTime: task.completedAt ? formatTaskCompletedTime(task.completedAt) : "",
      escapeHtml,
      sourceLabel: getTaskSourceLabel(task),
    });
    if (!task.completed && task.id === currentTaskId) item.classList.add("is-current-task");
    if (task.id === recentlyCompletedTaskId) {
      item.classList.add("just-completed");
      window.setTimeout(() => {
        item.classList.remove("just-completed");
        if (recentlyCompletedTaskId === task.id) recentlyCompletedTaskId = "";
      }, 1300);
    }

    item.querySelectorAll('[data-action="edit"]').forEach((button) => {
      button.addEventListener("click", (event) => startEdit(task, event.currentTarget));
    });
    item.querySelectorAll('[data-action="delete"]').forEach((button) => {
      button.addEventListener("click", () => onDelete(task.id));
    });
    if (task.completed) {
      item.querySelector('[data-action="restore"]')?.addEventListener("click", () => onRestore(task.id));
    } else {
      const front = item.querySelector(".task-card-front");
      front.addEventListener("click", (event) => {
        if (front.dataset.ignoreClick !== "true" && !event.target.closest("button, summary, details")) onFocus(task.id);
      });
      front.addEventListener("keydown", (event) => {
        if ((event.key === "Enter" || event.key === " ") && !event.target.closest("button, summary, details")) {
          event.preventDefault();
          onFocus(task.id);
        }
      });
      taskSwipeController.bind(item, task, { onComplete, onDelay });
    }
    return item;
  }

  function startEdit(task, trigger) {
    const item = trigger.closest(".plan-task-item");
    if (!item) return;
    item.classList.add("is-editing");
    item.innerHTML = `
      <input class="task-edit-input" type="text" maxlength="60" data-task-id="${task.id}">
      <div class="task-actions">
        <button class="task-action-btn" type="button" data-action="save-edit">保存</button>
        <button class="task-action-btn task-delete-btn" type="button" data-action="cancel-edit">取消</button>
      </div>
    `;
    const input = item.querySelector(".task-edit-input");
    input.value = task.title;
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") onEdit(task.id, input.value);
      if (event.key === "Escape") renderCurrent?.();
    });
    item.querySelector('[data-action="save-edit"]').addEventListener("click", () => onEdit(task.id, input.value));
    item.querySelector('[data-action="cancel-edit"]').addEventListener("click", () => renderCurrent?.());
    input.focus();
    input.select();
  }

  let renderCurrent = null;

  function setRenderCurrent(callback) {
    renderCurrent = callback;
  }

  function renderCurrentTaskOptions(tasks, currentTaskId, allowAutoSelect) {
    const unfinished = sortExecutableTasks(tasks.filter((task) => !task.completed), currentTaskId);
    let selected = unfinished.find((task) => task.id === currentTaskId) || null;
    let changed = Boolean(currentTaskId && !selected);
    if (!selected && unfinished.length > 0 && allowAutoSelect) {
      selected = unfinished[0];
      changed = true;
    }
    elements.currentTaskSelect.innerHTML = "";
    elements.currentTaskSelect.appendChild(createOption("", unfinished.length ? "暂未选择任务" : "暂无未完成任务"));
    unfinished.forEach((task) => elements.currentTaskSelect.appendChild(createOption(task.id, task.title)));
    elements.currentTaskSelect.value = selected?.id || "";
    return { selected, changed };
  }

  function renderCarryOver(yesterdayTasks, todayTasks) {
    const existing = new Set(todayTasks.flatMap((task) => [task.carriedFromId, task.title].filter(Boolean)));
    const count = yesterdayTasks.filter((task) => !task.completed && !existing.has(task.id) && !existing.has(task.title)).length;
    elements.carryOverBanner.hidden = count === 0;
    elements.carryOverText.textContent = `昨日有 ${count} 个未完成任务，是否带入今天？`;
  }

  function toggleExpansion() {
    expanded = !expanded;
    renderExpansion();
  }

  function renderExpansion() {
    document.body.classList.toggle("show-full-plan", expanded);
    if (elements.planExpandButton) {
      elements.planExpandButton.textContent = expanded ? "收起为三件大事" : "展开完整计划";
    }
  }

  return {
    render,
    renderCurrentTaskOptions,
    renderCarryOver,
    toggleExpansion,
    markRecentlyCompleted: (taskId) => { recentlyCompletedTaskId = taskId; },
    clearRecentlyCompleted: () => { recentlyCompletedTaskId = ""; },
    setRenderCurrent,
  };
}

function createOption(value, text) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = text;
  return option;
}

export function renderTasksPageView({
  elements,
  tasks,
  renderTaskCard,
  formatPlanDate,
  currentTaskId = "",
  now = new Date()
}) {
  const completedCount = tasks.filter((task) => task.completed).length;
  const pendingTasks = sortPendingTasks(tasks.filter((task) => !task.completed), currentTaskId);
  const priorityTasks = pendingTasks.slice(0, 3);
  const otherTasks = pendingTasks.slice(3);
  const completedTasks = tasks.filter((task) => task.completed);

  elements.todayDateText.textContent = formatPlanDate(now);
  elements.planProgressText.textContent = `已完成 ${completedCount} / ${tasks.length}`;
  elements.taskList.innerHTML = "";

  if (tasks.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty-record";
    emptyItem.textContent = "暂无任务，先添加一个今天要做的事。";
    elements.taskList.appendChild(emptyItem);
    return;
  }

  appendTaskGroup(elements.taskList, "今日三件大事", "priority", priorityTasks, renderTaskCard);
  appendTaskGroup(elements.taskList, "其他任务", "other", otherTasks, renderTaskCard);
  appendTaskGroup(elements.taskList, "已完成任务", "completed", completedTasks, renderTaskCard);
}

function appendTaskGroup(taskList, title, groupKey, tasks, renderTaskCard) {
  if (tasks.length === 0) {
    return;
  }

  const heading = document.createElement("li");
  heading.className = "task-list-heading";
  heading.dataset.taskGroup = groupKey;
  heading.textContent = title;
  taskList.appendChild(heading);

  tasks.forEach((task) => {
    const item = renderTaskCard(task);
    item.dataset.taskGroup = groupKey;
    taskList.appendChild(item);
  });
}

function sortPendingTasks(tasks, currentTaskId) {
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
