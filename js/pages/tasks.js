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
