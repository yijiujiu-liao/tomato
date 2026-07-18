export function createCurrentGoalView({ mount, onChange }) {
  if (!mount) return null;

  const wrapper = document.createElement("div");
  wrapper.className = "current-goal-setting";
  wrapper.innerHTML = `
    <label for="currentGoalSelect">这轮推进的长期目标</label>
    <select id="currentGoalSelect" aria-label="选择当前学习目标"></select>
  `;
  mount.appendChild(wrapper);

  const select = wrapper.querySelector("select");
  select.addEventListener("change", () => onChange(select.value));

  function render(goals, selectedId) {
    const activeGoals = goals.filter((goal) => !goal.completed);
    const selected = activeGoals.find((goal) => goal.id === selectedId) || null;
    select.replaceChildren(
      createOption("", activeGoals.length ? "请选择任务所属目标" : "暂无进行中目标"),
      ...activeGoals.map((goal) => createOption(goal.id, goal.title)),
    );
    select.value = selected?.id || "";
    return {
      changed: Boolean(selectedId) && !selected,
      selectedId: selected?.id || "",
    };
  }

  return {
    element: wrapper,
    getValue: () => select.value,
    render,
  };
}

function createOption(value, text) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = text;
  return option;
}
