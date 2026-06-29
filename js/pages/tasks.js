export function renderTasksPageView({
  elements,
  tasks,
  renderTaskCard,
  formatPlanDate,
  now = new Date()
}) {
  const completedCount = tasks.filter((task) => task.completed).length;
  const pendingTasks = tasks.filter((task) => !task.completed);
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

  appendTaskGroup(elements.taskList, "今日三件大事", priorityTasks, renderTaskCard);
  appendTaskGroup(elements.taskList, "其他任务", otherTasks, renderTaskCard);
  appendTaskGroup(elements.taskList, "已完成任务", completedTasks, renderTaskCard);
}

function appendTaskGroup(taskList, title, tasks, renderTaskCard) {
  if (tasks.length === 0) {
    return;
  }

  const heading = document.createElement("li");
  heading.className = "task-list-heading";
  heading.textContent = title;
  taskList.appendChild(heading);

  tasks.forEach((task) => {
    taskList.appendChild(renderTaskCard(task));
  });
}
