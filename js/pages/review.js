import { escapeHtml, formatPlanDate, normalizeNonNegativeInteger } from "../utils.js";

export function renderRecordsView(list, records, getGoalLabel = () => "") {
  list.innerHTML = "";
  if (records.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-record";
    empty.textContent = "还没有记录，完成一个专注番茄后会出现在这里。";
    list.appendChild(empty);
    return;
  }
  records.forEach((record) => {
    const goalLabel = getGoalLabel(record.studyGoalId);
    const item = document.createElement("li");
    item.className = "record-item";
    item.innerHTML = `
      <span class="record-time">${record.time}</span>
      <span class="record-task">${escapeHtml(record.task)}</span>
      <span> · ${record.minutes} 分钟专注</span>
      ${goalLabel ? `<small class="record-goal">目标 · ${escapeHtml(goalLabel)}</small>` : ""}
    `;
    list.appendChild(item);
  });
}

export function inferSubject(title = "") {
  const cleanTitle = String(title).trim();
  if (!cleanTitle) return "未命名任务";
  return cleanTitle.split(/[：:·\-—｜|]/)[0].trim().slice(0, 12) || cleanTitle.slice(0, 12);
}

export function buildReviewModel({ tasks, records, completedCount, nextTask, date = new Date() }) {
  const completedTasks = tasks.filter((task) => task.completed);
  const unfinishedTasks = tasks.filter((task) => !task.completed);
  const focusBySubject = records.reduce((result, record) => {
    const subject = inferSubject(record.task);
    result[subject] = (result[subject] || 0) + normalizeNonNegativeInteger(record.minutes);
    return result;
  }, {});
  const topSubject = Object.entries(focusBySubject).sort((a, b) => b[1] - a[1])[0];

  return {
    dateText: formatPlanDate(date),
    completedText: completedTasks.length
      ? completedTasks.slice(0, 3).map((task) => task.title).join("、")
      : (completedCount > 0 ? `完成了 ${completedCount} 个番茄钟。` : "今天还没有完成任务，先从一件小事开始。"),
    topSubjectText: topSubject ? `${topSubject[0]}，累计 ${topSubject[1]} 分钟` : "暂无专注记录。",
    unfinishedText: unfinishedTasks.length
      ? unfinishedTasks.slice(0, 3).map((task) => task.title).join("、")
      : "今天的任务都清掉了。",
    tomorrowText: nextTask ? `优先处理：${nextTask.title}` : "明天先安排一件最重要的小任务。",
    encouragementText: completedCount > 0
      ? "稳定推进比临时爆发更可靠，今天的专注已经留下痕迹。"
      : "先写下一件能完成的小事，节奏会从第一个番茄开始。",
    canAdopt: Boolean(nextTask),
  };
}

export function renderReviewPageView(elements, model) {
  if (!elements.completedText) return;
  elements.dateText.textContent = model.dateText;
  elements.completedText.textContent = model.completedText;
  elements.topSubjectText.textContent = model.topSubjectText;
  elements.unfinishedText.textContent = model.unfinishedText;
  elements.tomorrowText.textContent = model.tomorrowText;
  elements.encouragementText.textContent = model.encouragementText;

  if (elements.adoptButton) {
    elements.adoptButton.disabled = !model.canAdopt;
    elements.adoptButton.textContent = model.canAdopt ? "采纳为明日任务" : "暂无可采纳任务";
  }
}
