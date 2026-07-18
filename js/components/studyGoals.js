import { normalizeNonNegativeInteger, escapeHtml } from "../utils.js";

export function createStudyGoalsView({ mount, onAdd, onToggle, onDelete, onUpdate }) {
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
      <input id="studyGoalWeeklyHours" type="number" min="0" max="80" step="1" inputmode="numeric" placeholder="每周小时">
      <input id="studyGoalDate" type="date" aria-label="目标日期">
      <input id="studyGoalDescription" type="text" maxlength="240" placeholder="达成标准或原因（选填）">
      <button class="primary-btn study-goal-submit" type="submit">添加目标</button>
    </form>
    <ul class="study-goal-list" id="studyGoalList"></ul>
  `;
  mount.appendChild(panel);

  const form = panel.querySelector("#studyGoalForm");
  const titleInput = panel.querySelector("#studyGoalTitle");
  const minutesInput = panel.querySelector("#studyGoalMinutes");
  const dateInput = panel.querySelector("#studyGoalDate");
  const weeklyHoursInput = panel.querySelector("#studyGoalWeeklyHours");
  const descriptionInput = panel.querySelector("#studyGoalDescription");
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
      weeklyTargetMinutes: normalizeNonNegativeInteger((Number(weeklyHoursInput.value) || 0) * 60),
      targetDate: dateInput.value || null,
      description: descriptionInput.value.trim(),
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
          ${goal.isPrimary ? '<em class="study-goal-primary">主目标</em>' : ""}
          <span>${formatGoalMeta(goal)}</span>
          ${goal.description ? `<p>${escapeHtml(goal.description)}</p>` : ""}
          <div class="study-goal-progress" aria-label="目标进度"><i style="width: ${Math.min(100, Number(goal.progressPercent) || 0)}%"></i></div>
        </div>
        <div class="study-goal-actions">
          ${!goal.completed && !goal.isPrimary ? '<button class="text-btn study-goal-primary-btn" type="button">设为主目标</button>' : ""}
          <button class="text-btn study-goal-edit-btn" type="button">编辑</button>
          <button class="text-btn study-goal-delete" type="button">删除</button>
        </div>
      `;
      item.querySelector(".study-goal-check").addEventListener("click", () => onToggle(goal.id));
      item.querySelector(".study-goal-delete").addEventListener("click", () => onDelete(goal.id));
      item.querySelector(".study-goal-primary-btn")?.addEventListener("click", () => onUpdate(goal.id, { isPrimary: true }));
      item.querySelector(".study-goal-edit-btn")?.addEventListener("click", () => openGoalEditor(item, goal, onUpdate));
      list.appendChild(item);
    });
  }

  return { panel, render };
}

function formatGoalMeta(goal) {
  const parts = [];
  if (goal.targetMinutes > 0) parts.push(`${goal.focusMinutes || 0} / ${goal.targetMinutes} 分钟`);
  if (goal.targetDate) parts.push(`截止 ${goal.targetDate}`);
  if (goal.weeklyTargetMinutes > 0) parts.push(`每周 ${Math.round(goal.weeklyTargetMinutes / 60)} 小时`);
  if (goal.completed) parts.push("已完成");
  return parts.length ? parts.join(" · ") : "不设时长，保持推进";
}

function openGoalEditor(item, goal, onUpdate) {
  if (item.querySelector(".study-goal-inline-edit")) return;
  const form = document.createElement("form");
  form.className = "study-goal-inline-edit";
  form.innerHTML = `
    <input name="title" type="text" maxlength="80" value="${escapeHtml(goal.title)}" aria-label="目标名称">
    <input name="date" type="date" value="${goal.targetDate || ""}" aria-label="截止日期">
    <input name="weeklyHours" type="number" min="0" max="80" value="${Math.round((goal.weeklyTargetMinutes || 0) / 60)}" aria-label="每周投入小时">
    <textarea name="description" maxlength="240" rows="2" aria-label="目标说明">${escapeHtml(goal.description || "")}</textarea>
    <div>
      <button class="primary-btn" type="submit">保存</button>
      <button class="text-btn" type="button">取消</button>
    </div>
  `;
  item.appendChild(form);
  form.querySelector("button[type='button']").addEventListener("click", () => form.remove());
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const fields = new FormData(form);
    const title = String(fields.get("title") || "").trim();
    if (!title) return;
    onUpdate(goal.id, {
      title,
      targetDate: fields.get("date") || null,
      weeklyTargetMinutes: normalizeNonNegativeInteger((Number(fields.get("weeklyHours")) || 0) * 60),
      description: String(fields.get("description") || "").trim(),
    });
  });
  form.querySelector("input").focus();
}
