import { normalizeNonNegativeInteger, escapeHtml } from "../utils.js";

export function createStudyGoalsView({ mount, onAdd, onToggle, onDelete }) {
  const panel = document.createElement("section");
  panel.className = "card study-goals-card";
  panel.innerHTML = `
    <div class="section-title study-goals-head">
      <div><p class="stats-kicker">考研长期目标</p><h2>学习目标</h2></div>
      <span class="study-goals-count" id="studyGoalsCount">0 个进行中</span>
    </div>
    <form class="study-goal-form" id="studyGoalForm">
      <input id="studyGoalTitle" type="text" maxlength="80" placeholder="例如：英语真题二刷、政治一轮背完">
      <input id="studyGoalMinutes" type="number" min="0" max="99999" step="30" inputmode="numeric" placeholder="目标分钟">
      <input id="studyGoalDate" type="date" aria-label="目标日期">
      <button class="primary-btn study-goal-submit" type="submit">添加目标</button>
    </form>
    <ul class="study-goal-list" id="studyGoalList"></ul>
  `;
  mount.appendChild(panel);

  const form = panel.querySelector("#studyGoalForm");
  const titleInput = panel.querySelector("#studyGoalTitle");
  const minutesInput = panel.querySelector("#studyGoalMinutes");
  const dateInput = panel.querySelector("#studyGoalDate");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = titleInput.value.trim();
    if (!title) {
      titleInput.focus();
      return;
    }
    onAdd({
      title,
      targetMinutes: normalizeNonNegativeInteger(minutesInput.value),
      targetDate: dateInput.value || null,
    });
    form.reset();
    titleInput.focus();
  });

  function render(goals) {
    const list = panel.querySelector("#studyGoalList");
    panel.querySelector("#studyGoalsCount").textContent = `${goals.filter((goal) => !goal.completed).length} 个进行中`;
    list.innerHTML = "";
    if (goals.length === 0) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "study-goal-empty";
      emptyItem.textContent = "先写下一个长期目标，让每天的番茄钟有方向。";
      list.appendChild(emptyItem);
      return;
    }

    goals.forEach((goal) => {
      const item = document.createElement("li");
      item.className = "study-goal-item";
      item.dataset.completed = String(goal.completed);
      item.innerHTML = `
        <button class="study-goal-check" type="button" aria-label="${goal.completed ? "恢复目标" : "完成目标"}">${goal.completed ? "✓" : ""}</button>
        <div class="study-goal-main">
          <strong>${escapeHtml(goal.title)}</strong>
          <span>${formatGoalMeta(goal)}</span>
          <div class="study-goal-progress" aria-label="目标进度"><i style="width: ${Math.min(100, Number(goal.progressPercent) || 0)}%"></i></div>
        </div>
        <button class="text-btn study-goal-delete" type="button">删除</button>
      `;
      item.querySelector(".study-goal-check").addEventListener("click", () => onToggle(goal.id));
      item.querySelector(".study-goal-delete").addEventListener("click", () => onDelete(goal.id));
      list.appendChild(item);
    });
  }

  return { panel, render };
}

function formatGoalMeta(goal) {
  const parts = [];
  if (goal.targetMinutes > 0) parts.push(`${goal.focusMinutes || 0} / ${goal.targetMinutes} 分钟`);
  if (goal.targetDate) parts.push(`截止 ${goal.targetDate}`);
  if (goal.completed) parts.push("已完成");
  return parts.length ? parts.join(" · ") : "不设时长，保持推进";
}
