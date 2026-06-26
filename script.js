const MODES = {
  focus: {
    label: "专注",
    minutes: 50
  },
  rest: {
    label: "休息",
    minutes: 5
  }
};

const STORAGE_KEY = "kaoyanPomodoroData";
const DAILY_PLANS_KEY = "kaoyanDailyPlans";
const DEFAULT_GOAL = 8;
const DEFAULT_FOCUS_MINUTES = 50;
const MIN_FOCUS_MINUTES = 1;
const MAX_FOCUS_MINUTES = 180;
const REST_DURATIONS = {
  short: 5,
  long: 10
};

const PET_TYPES = {
  penguin: {
    name: "蓝莓企鹅",
    src: "assets/pets/penguin.webp",
    accent: "#9fc7ea"
  },
  purpleDragon: {
    name: "紫晶小龙",
    src: "assets/pets/purple-dragon.webp",
    accent: "#9b6ee8"
  },
  greenDino: {
    name: "青叶恐龙",
    src: "assets/pets/green-dino.webp",
    accent: "#94bd55"
  },
  chick: {
    name: "奶油小鸡",
    src: "assets/pets/chick.webp",
    accent: "#f3c34a"
  }
};

const PET_TYPE_KEYS = Object.keys(PET_TYPES);
const EVOLUTION_STAGES = [
  { id: 1, minLevel: 1, maxLevel: 4, state: "juvenile", label: "幼体", sprite: "egg" },
  { id: 2, minLevel: 5, maxLevel: 9, state: "growth", label: "成长期", sprite: "crack" },
  { id: 3, minLevel: 10, maxLevel: 19, state: "mature", label: "成熟体", sprite: "peek" },
  { id: 4, minLevel: 20, maxLevel: Infinity, state: "complete", label: "完全体", sprite: "hatched" }
];
const MOTIVATION_TEXTS = [
  "稳定学习比猛冲更重要。",
  "你的专注正在让它成长。",
  "距离下一次进化更近了。",
  "今天的每一个番茄钟都会留下经验。"
];

const subtitle = document.querySelector("#subtitle");
const timerCard = document.querySelector(".timer-card");
const timerDisplay = document.querySelector("#timerDisplay");
const timerProgressFill = document.querySelector("#timerProgressFill");
const timerProgressText = document.querySelector("#timerProgressText");
const statusText = document.querySelector("#statusText");
const startBtn = document.querySelector("#startBtn");
const pauseBtn = document.querySelector("#pauseBtn");
const resetBtn = document.querySelector("#resetBtn");
const themeToggle = document.querySelector("#themeToggle");
const modeButtons = document.querySelectorAll(".mode-btn");
const pageButtons = document.querySelectorAll(".nav-btn");
const appPages = document.querySelectorAll(".app-page");
const focusDurationInput = document.querySelector("#focusDurationInput");
const currentTaskSelect = document.querySelector("#currentTaskSelect");
const todayDateText = document.querySelector("#todayDateText");
const planProgressText = document.querySelector("#planProgressText");
const carryOverBanner = document.querySelector("#carryOverBanner");
const carryOverText = document.querySelector("#carryOverText");
const carryOverBtn = document.querySelector("#carryOverBtn");
const newTaskInput = document.querySelector("#newTaskInput");
const addTaskBtn = document.querySelector("#addTaskBtn");
const taskList = document.querySelector("#taskList");
const taskToast = document.querySelector("#taskToast");
const taskToastText = document.querySelector("#taskToastText");
const taskToastUndo = document.querySelector("#taskToastUndo");
const goalInput = document.querySelector("#goalInput");
const goalProgressText = document.querySelector("#goalProgressText");
const goalProgressFill = document.querySelector("#goalProgressFill");
const doneCount = document.querySelector("#doneCount");
const focusMinutes = document.querySelector("#focusMinutes");
const recordsList = document.querySelector("#recordsList");
const clearRecordsBtn = document.querySelector("#clearRecordsBtn");
const petShell = document.querySelector("#petShell");
const petArt = document.querySelector("#petArt");
const petPicker = document.querySelector("#petPicker");
const petName = document.querySelector("#petName");
const petStatus = document.querySelector("#petStatus");
const petStageLabel = document.querySelector("#petStageLabel");
const petProgressFill = document.querySelector("#petProgressFill");
const petLevelLabel = document.querySelector("#petLevelLabel");
const petXPText = document.querySelector("#petXPText");
const evolutionHint = document.querySelector("#evolutionHint");
const streakCount = document.querySelector("#streakCount");
const petTotalXP = document.querySelector("#petTotalXP");
const xpToast = document.querySelector("#xpToast");
const petModal = document.querySelector("#petModal");
const petModalClose = document.querySelector("#petModalClose");
const petModalTitle = document.querySelector("#petModalTitle");
const petModalCopy = document.querySelector("#petModalCopy");
const evolutionPreviewGrid = document.querySelector("#evolutionPreviewGrid");
const restTypeLabel = document.querySelector("#restTypeLabel");
const restCopy = document.querySelector("#restCopy");

let currentMode = "focus";
let remainingSeconds = MODES.focus.minutes * 60;
let timerId = null;
let audioContext = null;
let activeSwipe = null;
let taskToastTimer = null;
let taskToastUndoCallback = null;
let recentlyCompletedTaskId = "";

let todayData = loadTodayData();
let dailyPlans = loadDailyPlans();

MODES.focus.minutes = todayData.focusDuration;
MODES.rest.minutes = getRestMinutes();
remainingSeconds = MODES.focus.minutes * 60;
focusDurationInput.value = todayData.focusDuration;
goalInput.value = todayData.dailyGoal;
applyTheme(todayData.theme);
render();
switchPage("timer");

startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", pauseTimer);
resetBtn.addEventListener("click", resetTimer);
clearRecordsBtn.addEventListener("click", clearTodayRecords);
themeToggle.addEventListener("click", toggleTheme);
focusDurationInput.addEventListener("change", updateFocusDuration);
currentTaskSelect.addEventListener("change", updateCurrentTaskSelection);
addTaskBtn.addEventListener("click", handleAddTask);
newTaskInput.addEventListener("keydown", handleNewTaskKeydown);
carryOverBtn.addEventListener("click", carryOverYesterdayTasks);
taskToastUndo.addEventListener("click", handleTaskToastUndo);
petShell.addEventListener("click", openPetModal);
petShell.addEventListener("keydown", handlePetShellKeydown);
petModalClose.addEventListener("click", closePetModal);
petModal.addEventListener("click", handlePetModalBackdrop);
document.addEventListener("keydown", handleDocumentKeydown);

goalInput.addEventListener("input", () => {
  const nextGoal = Number(goalInput.value);
  todayData.dailyGoal = Number.isFinite(nextGoal) && nextGoal > 0
    ? Math.min(Math.floor(nextGoal), 24)
    : DEFAULT_GOAL;
  goalInput.value = todayData.dailyGoal;
  saveTodayData();
  renderGoalProgress();
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    switchMode(button.dataset.mode);
  });
});

pageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    switchPage(button.dataset.pageTarget);
  });
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js");
  });
}

function startTimer() {
  if (timerId !== null) {
    return;
  }

  unlockAudio();
  requestNotificationPermission();
  statusText.textContent = currentMode === "focus"
    ? "专注进行中，你的宠物正在积累成长能量。"
    : "休息进行中，恢复也是学习的一部分。";

  timerId = setInterval(() => {
    remainingSeconds -= 1;

    if (remainingSeconds <= 0) {
      finishCurrentMode();
      return;
    }

    renderTimerAndProgress();
  }, 1000);
}

function pauseTimer() {
  if (timerId === null) {
    return;
  }

  clearInterval(timerId);
  timerId = null;

  statusText.textContent = currentMode === "focus"
    ? "已暂停，本轮还没完成，所以暂时不会获得 XP。继续完成就可以结算。"
    : "休息已暂停，准备好后继续。";
}

function resetTimer() {
  const interruptedFocus = timerId !== null && currentMode === "focus";

  pauseTimerSilently();

  if (currentMode === "rest") {
    MODES.rest.minutes = getRestMinutes();
  }

  remainingSeconds = MODES[currentMode].minutes * 60;
  statusText.textContent = interruptedFocus
    ? "本轮专注已重置，不获得 XP，但已有等级和经验不会丢。"
    : `已重置为${MODES[currentMode].label}模式。`;
  render();
}

function switchMode(mode) {
  if (!MODES[mode]) {
    return;
  }

  const interruptedFocus = timerId !== null && currentMode === "focus" && mode !== "focus";

  pauseTimerSilently();

  if (mode === "rest") {
    MODES.rest.minutes = getRestMinutes();
  }

  currentMode = mode;
  remainingSeconds = MODES[currentMode].minutes * 60;
  statusText.textContent = interruptedFocus
    ? `已切换到${MODES[currentMode].label}模式，本轮专注未完成所以不获得 XP。`
    : `已切换到${MODES[currentMode].label}模式。`;
  render();
}

function updateFocusDuration() {
  const nextDuration = normalizeFocusDuration(focusDurationInput.value);
  const interruptedFocus = timerId !== null && currentMode === "focus";

  if (interruptedFocus) {
    pauseTimerSilently();
  }

  todayData.focusDuration = nextDuration;
  MODES.focus.minutes = nextDuration;
  focusDurationInput.value = nextDuration;

  if (currentMode === "focus") {
    remainingSeconds = MODES.focus.minutes * 60;
    statusText.textContent = interruptedFocus
      ? `专注时长已改为 ${nextDuration} 分钟，本轮未完成所以不获得 XP。`
      : `专注时长已改为 ${nextDuration} 分钟。`;
  }

  saveTodayData();
  render();
}

function getTodayKey() {
  return getDateKey();
}

function getYesterdayKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function loadDailyPlans() {
  try {
    const saved = JSON.parse(localStorage.getItem(DAILY_PLANS_KEY));

    if (!saved || typeof saved !== "object" || Array.isArray(saved)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(saved).map(([date, tasks]) => [
        date,
        Array.isArray(tasks) ? tasks.map(normalizeTask).filter(Boolean) : []
      ])
    );
  } catch (error) {
    return {};
  }
}

function saveDailyPlans() {
  localStorage.setItem(DAILY_PLANS_KEY, JSON.stringify(dailyPlans));
}

function getTodayTasks() {
  const today = getTodayKey();

  if (!Array.isArray(dailyPlans[today])) {
    dailyPlans[today] = [];
  }

  return dailyPlans[today];
}

function addTask(title) {
  const cleanTitle = title.trim();

  if (!cleanTitle) {
    return false;
  }

  getTodayTasks().push({
    id: createTaskId(),
    title: cleanTitle,
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null
  });

  saveDailyPlans();
  renderTaskPage();
  updateCurrentTaskOptions();
  return true;
}

function toggleTask(taskId) {
  const task = getTodayTasks().find((item) => item.id === taskId);

  if (!task) {
    return;
  }

  task.completed = !task.completed;
  task.completedAt = task.completed ? new Date().toISOString() : null;

  if (task.completed && todayData.currentTaskId === task.id) {
    todayData.currentTaskId = "";
    todayData.currentTask = "";
    saveTodayData();
  }

  saveDailyPlans();
  renderTaskPage();
  updateCurrentTaskOptions();
}

function editTask(taskId, newTitle) {
  const cleanTitle = newTitle.trim();
  const task = getTodayTasks().find((item) => item.id === taskId);

  if (!task || !cleanTitle) {
    return;
  }

  task.title = cleanTitle;

  if (todayData.currentTaskId === task.id) {
    todayData.currentTask = cleanTitle;
    saveTodayData();
  }

  saveDailyPlans();
  renderTaskPage();
  updateCurrentTaskOptions();
}

function deleteTask(taskId) {
  const tasks = getTodayTasks();
  const nextTasks = tasks.filter((task) => task.id !== taskId);

  dailyPlans[getTodayKey()] = nextTasks;

  if (todayData.currentTaskId === taskId) {
    todayData.currentTaskId = "";
    todayData.currentTask = "";
    saveTodayData();
  }

  saveDailyPlans();
  renderTaskPage();
  updateCurrentTaskOptions();
}

function getYesterdayUnfinishedTasks() {
  const yesterdayTasks = dailyPlans[getYesterdayKey()];

  if (!Array.isArray(yesterdayTasks)) {
    return [];
  }

  return yesterdayTasks.filter((task) => !task.completed);
}

function carryOverYesterdayTasks() {
  const todayTasks = getTodayTasks();
  const existingKeys = new Set(todayTasks.map((task) => task.carriedFromId || task.title));
  const tasksToCarry = getYesterdayUnfinishedTasks().filter((task) => {
    return !existingKeys.has(task.id) && !existingKeys.has(task.title);
  });

  tasksToCarry.forEach((task) => {
    todayTasks.push({
      id: createTaskId(),
      title: task.title,
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
      carriedFromId: task.id
    });
  });

  saveDailyPlans();
  renderTaskPage();
  updateCurrentTaskOptions();
}

function renderTaskPage() {
  const tasks = getTodayTasks();
  const completedCount = tasks.filter((task) => task.completed).length;
  const sortedTasks = [...tasks].sort((a, b) => Number(a.completed) - Number(b.completed));

  todayDateText.textContent = formatPlanDate(new Date());
  planProgressText.textContent = `已完成 ${completedCount} / ${tasks.length}`;
  renderCarryOverBanner();
  taskList.innerHTML = "";

  if (sortedTasks.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty-record";
    emptyItem.textContent = "暂无任务，先添加一个今天要做的事。";
    taskList.appendChild(emptyItem);
    return;
  }

  sortedTasks.forEach((task) => {
    const item = renderTaskCard(task);

    taskList.appendChild(item);
  });
}

function renderTaskCard(task) {
  const item = document.createElement("li");
  const completedTime = task.completedAt ? formatTaskCompletedTime(task.completedAt) : "";

  item.className = "plan-task-item";
  item.dataset.completed = String(task.completed);
  item.dataset.taskId = task.id;
  item.innerHTML = `
    <div class="task-complete-underlay" aria-hidden="true">
      <span>✓</span>
      <strong>右滑完成</strong>
    </div>
    <div class="task-card-front">
      <span class="task-swipe-cue" aria-hidden="true">${task.completed ? "✓" : "→"}</span>
      <button class="task-title-btn" type="button" data-action="edit" data-task-id="${task.id}">
        <span class="task-title">${escapeHtml(task.title)}</span>
      </button>
      <div class="task-meta-actions">
        ${task.completed ? `<span class="task-completed-time">${completedTime} 完成</span>` : `<span class="task-swipe-hint">右滑</span>`}
        <div class="task-actions">
          ${task.completed ? `<button class="task-action-btn" type="button" data-action="restore" data-task-id="${task.id}">恢复</button>` : `<button class="task-action-btn" type="button" data-action="edit" data-task-id="${task.id}">编辑</button>`}
          <button class="task-action-btn task-delete-btn" type="button" data-action="delete" data-task-id="${task.id}">删除</button>
        </div>
      </div>
      <span class="task-done-badge">完成！</span>
    </div>
  `;

  if (task.id === recentlyCompletedTaskId) {
    item.classList.add("just-completed");
    window.setTimeout(() => {
      item.classList.remove("just-completed");
      if (recentlyCompletedTaskId === task.id) {
        recentlyCompletedTaskId = "";
      }
    }, 1300);
  }

  item.querySelectorAll('[data-action="edit"]').forEach((button) => {
    button.addEventListener("click", (event) => startTaskEdit(task.id, event.currentTarget));
  });
  item.querySelector('[data-action="delete"]').addEventListener("click", () => deleteTask(task.id));

  if (task.completed) {
    item.querySelector('[data-action="restore"]').addEventListener("click", () => undoCompleteTask(task.id));
  } else {
    initSwipeTaskCard(item, task);
  }

  return item;
}

function updateCurrentTaskOptions() {
  const unfinishedTasks = getTodayTasks().filter((task) => !task.completed);
  const selectedTaskExists = unfinishedTasks.some((task) => task.id === todayData.currentTaskId);

  if (todayData.currentTaskId && !selectedTaskExists) {
    todayData.currentTaskId = "";
    todayData.currentTask = "";
    saveTodayData();
  }

  currentTaskSelect.innerHTML = "";
  currentTaskSelect.appendChild(createTaskOption("", unfinishedTasks.length ? "暂未选择任务" : "暂无未完成任务"));

  unfinishedTasks.forEach((task) => {
    currentTaskSelect.appendChild(createTaskOption(task.id, task.title));
  });

  currentTaskSelect.value = selectedTaskExists ? todayData.currentTaskId : "";
}

function initSwipeTaskCard(cardElement, task) {
  const front = cardElement.querySelector(".task-card-front");

  front.addEventListener("pointerdown", (event) => handleTaskPointerDown(event, task, cardElement));
  front.addEventListener("pointermove", (event) => handleTaskPointerMove(event, task));
  front.addEventListener("pointerup", (event) => handleTaskPointerUp(event, task));
  front.addEventListener("pointercancel", (event) => handleTaskPointerCancel(event, task));
}

function handleTaskPointerDown(event, task, cardElement) {
  if (task.completed || event.target.closest("button")) {
    return;
  }

  const front = cardElement.querySelector(".task-card-front");

  activeSwipe = {
    taskId: task.id,
    cardElement,
    front,
    startX: event.clientX,
    startY: event.clientY,
    deltaX: 0,
    isDragging: false,
    isScrolling: false,
    rafId: null
  };
  front.style.transition = "none";
  front.setPointerCapture?.(event.pointerId);
}

function handleTaskPointerMove(event, task) {
  if (!activeSwipe || activeSwipe.taskId !== task.id) {
    return;
  }

  const deltaX = event.clientX - activeSwipe.startX;
  const deltaY = event.clientY - activeSwipe.startY;

  if (!activeSwipe.isDragging && !activeSwipe.isScrolling) {
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
      activeSwipe.isScrolling = true;
      return;
    }

    if (deltaX > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
      activeSwipe.isDragging = true;
      activeSwipe.cardElement.classList.add("is-swiping");
    }
  }

  if (!activeSwipe.isDragging) {
    return;
  }

  event.preventDefault();
  activeSwipe.deltaX = Math.max(0, Math.min(deltaX, activeSwipe.cardElement.offsetWidth * 0.55));
  scheduleSwipeFrame();
}

function handleTaskPointerUp(event, task) {
  if (!activeSwipe || activeSwipe.taskId !== task.id) {
    return;
  }

  const threshold = activeSwipe.cardElement.offsetWidth * 0.35;
  const shouldComplete = activeSwipe.isDragging && activeSwipe.deltaX >= threshold;
  const swipe = activeSwipe;

  swipe.front.releasePointerCapture?.(event.pointerId);

  if (shouldComplete) {
    swipe.front.style.transition = "transform 0.18s ease";
    swipe.front.style.transform = `translateX(${Math.min(96, swipe.cardElement.offsetWidth * 0.42)}px)`;
    swipe.cardElement.classList.add("is-completing");
    window.setTimeout(() => completeTaskWithAnimation(task.id), 150);
  } else {
    resetSwipeCard(swipe);
  }

  activeSwipe = null;
}

function handleTaskPointerCancel(event, task) {
  if (!activeSwipe || activeSwipe.taskId !== task.id) {
    return;
  }

  activeSwipe.front.releasePointerCapture?.(event.pointerId);
  resetSwipeCard(activeSwipe);
  activeSwipe = null;
}

function scheduleSwipeFrame() {
  if (!activeSwipe || activeSwipe.rafId) {
    return;
  }

  activeSwipe.rafId = requestAnimationFrame(() => {
    if (!activeSwipe) {
      return;
    }

    activeSwipe.front.style.transform = `translateX(${activeSwipe.deltaX}px)`;
    activeSwipe.rafId = null;
  });
}

function resetSwipeCard(swipe) {
  swipe.front.style.transition = "transform 0.18s ease";
  swipe.front.style.transform = "translateX(0)";
  swipe.cardElement.classList.remove("is-swiping", "is-completing");
}

function completeTaskWithAnimation(taskId) {
  const task = getTodayTasks().find((item) => item.id === taskId);

  if (!task || task.completed) {
    return;
  }

  task.completed = true;
  task.completedAt = new Date().toISOString();
  recentlyCompletedTaskId = task.id;
  vibrateTaskDone();

  if (todayData.currentTaskId === task.id) {
    todayData.currentTaskId = "";
    todayData.currentTask = "";
    saveTodayData();
  }

  saveDailyPlans();
  renderTaskPage();
  updateCurrentTaskOptions();
  showTaskToast(`已完成：${task.title}`, () => undoCompleteTask(task.id));
}

function undoCompleteTask(taskId) {
  const task = getTodayTasks().find((item) => item.id === taskId);

  if (!task) {
    return;
  }

  task.completed = false;
  task.completedAt = null;
  recentlyCompletedTaskId = "";
  saveDailyPlans();
  renderTaskPage();
  updateCurrentTaskOptions();
  hideTaskToast();
}

function showTaskToast(message, undoCallback) {
  taskToastText.textContent = message;
  taskToastUndoCallback = undoCallback;
  taskToast.setAttribute("aria-hidden", "false");

  window.clearTimeout(taskToastTimer);
  taskToastTimer = window.setTimeout(hideTaskToast, 3000);
}

function hideTaskToast() {
  taskToast.setAttribute("aria-hidden", "true");
  taskToastUndoCallback = null;
  window.clearTimeout(taskToastTimer);
}

function handleTaskToastUndo() {
  if (taskToastUndoCallback) {
    taskToastUndoCallback();
  }
}

function vibrateTaskDone() {
  if ("vibrate" in navigator) {
    navigator.vibrate(30);
  }
}

function handleAddTask() {
  const added = addTask(newTaskInput.value);

  if (!added) {
    newTaskInput.focus();
    return;
  }

  newTaskInput.value = "";
  newTaskInput.focus();
}

function handleNewTaskKeydown(event) {
  if (event.key === "Enter") {
    handleAddTask();
  }
}

function startTaskEdit(taskId, trigger) {
  const task = getTodayTasks().find((item) => item.id === taskId);
  const taskItem = trigger.closest(".plan-task-item");

  if (!task || !taskItem) {
    return;
  }

  taskItem.classList.add("is-editing");
  taskItem.innerHTML = `
    <input class="task-edit-input" type="text" maxlength="60" data-task-id="${task.id}">
    <div class="task-actions">
      <button class="task-action-btn" type="button" data-action="save-edit" data-task-id="${task.id}">保存</button>
      <button class="task-action-btn task-delete-btn" type="button" data-action="cancel-edit" data-task-id="${task.id}">取消</button>
    </div>
  `;

  const input = taskItem.querySelector(".task-edit-input");
  const saveButton = taskItem.querySelector('[data-action="save-edit"]');
  const cancelButton = taskItem.querySelector('[data-action="cancel-edit"]');

  input.value = task.title;
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      editTask(task.id, input.value);
    }

    if (event.key === "Escape") {
      renderTaskPage();
    }
  });
  saveButton.addEventListener("click", () => editTask(task.id, input.value));
  cancelButton.addEventListener("click", renderTaskPage);
  input.focus();
  input.select();
}

function updateCurrentTaskSelection() {
  const task = getTodayTasks().find((item) => item.id === currentTaskSelect.value);

  todayData.currentTaskId = task ? task.id : "";
  todayData.currentTask = task ? task.title : "";
  saveTodayData();
}

function renderCarryOverBanner() {
  const yesterdayUnfinished = getYesterdayUnfinishedTasks();
  const todayTasks = getTodayTasks();
  const existingKeys = new Set(todayTasks.map((task) => task.carriedFromId || task.title));
  const carryableCount = yesterdayUnfinished.filter((task) => {
    return !existingKeys.has(task.id) && !existingKeys.has(task.title);
  }).length;

  carryOverBanner.hidden = carryableCount === 0;
  carryOverText.textContent = `昨日有 ${carryableCount} 个未完成任务，是否带入今天？`;
}

function normalizeTask(task) {
  if (!task || typeof task !== "object" || typeof task.title !== "string" || !task.title.trim()) {
    return null;
  }

  return {
    id: typeof task.id === "string" ? task.id : createTaskId(),
    title: task.title.trim(),
    completed: Boolean(task.completed),
    createdAt: typeof task.createdAt === "string" ? task.createdAt : new Date().toISOString(),
    completedAt: task.completed && typeof task.completedAt === "string" ? task.completedAt : null,
    carriedFromId: typeof task.carriedFromId === "string" ? task.carriedFromId : undefined
  };
}

function createTaskId() {
  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createTaskOption(value, text) {
  const option = document.createElement("option");

  option.value = value;
  option.textContent = text;
  return option;
}

function formatPlanDate(date) {
  return date.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long"
  });
}

function formatTaskCompletedTime(completedAt) {
  const date = new Date(completedAt);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function switchPage(pageName) {
  appPages.forEach((page) => {
    page.classList.toggle("active", page.dataset.page === pageName);
  });

  pageButtons.forEach((button) => {
    const isActive = button.dataset.pageTarget === pageName;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
  });
}

function handlePetShellKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  openPetModal();
}

function handlePetModalBackdrop(event) {
  if (event.target === petModal) {
    closePetModal();
  }
}

function handleDocumentKeydown(event) {
  if (event.key === "Escape" && petModal.getAttribute("aria-hidden") === "false") {
    closePetModal();
  }
}

function openPetModal() {
  renderEvolutionPreview();
  petModal.setAttribute("aria-hidden", "false");
  petModalClose.focus();
}

function closePetModal() {
  petModal.setAttribute("aria-hidden", "true");
  petShell.focus();
}

function finishCurrentMode() {
  pauseTimerSilently();
  playFinishSound();

  if (currentMode === "focus") {
    addFocusRecord();
    const xpResult = addPetXP(MODES.focus.minutes);
    showNotification("专注完成", `完成 1 个番茄，宠物获得了 ${xpResult.totalXP} XP。`);
    const nextRestType = todayData.completedCount % 4 === 0 ? "long" : "short";
    setRestType(nextRestType);
    currentMode = "rest";
    remainingSeconds = MODES.rest.minutes * 60;
    render();
    showPetReward(xpResult);
    statusText.textContent = buildFocusCompleteMessage(xpResult, nextRestType);
    return;
  } else {
    showNotification("休息结束", "可以回到下一轮专注了。");
    setRestType("short");
    currentMode = "focus";
    remainingSeconds = MODES.focus.minutes * 60;
    statusText.textContent = "休息结束，回到专注模式。";
  }

  render();
}

function addFocusRecord() {
  const task = todayData.currentTask || "未命名学习任务";
  const time = new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  });

  todayData.completedCount += 1;
  todayData.streak += 1;
  todayData.focusMinutes += MODES.focus.minutes;
  todayData.records.unshift({
    time,
    task,
    minutes: MODES.focus.minutes,
    streak: todayData.streak
  });

  saveTodayData();
}

function clearTodayRecords() {
  todayData.completedCount = 0;
  todayData.focusMinutes = 0;
  todayData.streak = 0;
  todayData.records = [];
  todayData.nextRestType = "short";
  MODES.rest.minutes = REST_DURATIONS.short;
  saveTodayData();
  render();
  statusText.textContent = "今日记录和 streak 已清空，宠物等级与总经验已保留。";
}

function toggleTheme() {
  todayData.theme = todayData.theme === "dark" ? "light" : "dark";
  applyTheme(todayData.theme);
  saveTodayData();
}

function loadTodayData() {
  const today = getDateKey();
  const defaultPetType = PET_TYPE_KEYS[0];
  const defaultData = {
    date: today,
    completedCount: 0,
    focusMinutes: 0,
    streak: 0,
    currentTask: "",
    currentTaskId: "",
    dailyGoal: DEFAULT_GOAL,
    focusDuration: DEFAULT_FOCUS_MINUTES,
    nextRestType: "short",
    theme: "light",
    records: [],
    selectedPet: defaultPetType,
    petProgress: createPetProgress(defaultPetType)
  };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (!saved) {
      return defaultData;
    }

    const selectedPet = normalizePetType(saved.selectedPet || saved.petProgress?.petId || saved.pet?.type);
    const petProgress = loadPetProgress(saved, selectedPet);

    if (saved.date !== today) {
      return {
        ...defaultData,
        currentTask: "",
        currentTaskId: "",
        dailyGoal: normalizeGoal(saved.dailyGoal),
        focusDuration: normalizeFocusDuration(saved.focusDuration),
        nextRestType: "short",
        theme: saved.theme === "dark" ? "dark" : "light",
        selectedPet,
        petProgress
      };
    }

    return {
      ...defaultData,
      ...saved,
      streak: normalizeNonNegativeInteger(saved.streak),
      currentTaskId: typeof saved.currentTaskId === "string" ? saved.currentTaskId : "",
      dailyGoal: normalizeGoal(saved.dailyGoal),
      focusDuration: normalizeFocusDuration(saved.focusDuration),
      nextRestType: normalizeRestType(saved.nextRestType),
      theme: saved.theme === "dark" ? "dark" : "light",
      records: Array.isArray(saved.records) ? saved.records : [],
      selectedPet,
      petProgress
    };
  } catch (error) {
    return defaultData;
  }
}

function saveTodayData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todayData));
}

function getDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function render() {
  renderModePanels();
  renderTimerAndProgress();
  renderModeButtons();
  renderRestPanel();
  renderStats();
  renderGoalProgress();
  renderTaskPage();
  updateCurrentTaskOptions();
  renderRecords();
  renderPetPicker();
  updatePetUI();
}

function renderModePanels() {
  timerCard.dataset.mode = currentMode;
}

function renderTimerAndProgress() {
  const text = formatTime(remainingSeconds);
  const totalSeconds = MODES[currentMode].minutes * 60;
  const progress = Math.min(100, Math.max(0, (1 - remainingSeconds / totalSeconds) * 100));

  timerDisplay.textContent = text;
  timerProgressFill.style.width = `${progress}%`;
  timerProgressText.textContent = `本轮已完成 ${Math.round(progress)}%`;
  document.title = `${text} - 考研番茄钟`;
}

function renderModeButtons() {
  modeButtons.forEach((button) => {
    if (button.dataset.mode === "focus") {
      button.textContent = `专注 ${MODES.focus.minutes}`;
    }

    if (button.dataset.mode === "rest") {
      button.textContent = `休息 ${MODES.rest.minutes}`;
    }

    button.classList.toggle("active", button.dataset.mode === currentMode);
  });

  subtitle.textContent = currentMode === "rest"
    ? "暂停追赶，给大脑一点恢复的风。"
    : `专注 ${MODES.focus.minutes} 分钟，休息一下，再回来继续。`;
}

function renderRestPanel() {
  const restType = normalizeRestType(todayData.nextRestType);

  restTypeLabel.textContent = restType === "long"
    ? `长休 ${MODES.rest.minutes} 分钟`
    : `短休 ${MODES.rest.minutes} 分钟`;
  restCopy.textContent = restType === "long"
    ? "这是一段认真赢来的长休息。站起来，伸展一下，让眼睛离开屏幕。"
    : "把手机放低一点，肩膀松开，慢慢呼吸。";
}

function renderStats() {
  doneCount.textContent = todayData.completedCount;
  focusMinutes.textContent = todayData.focusMinutes;
}

function renderGoalProgress() {
  const percent = Math.min(100, Math.round((todayData.completedCount / todayData.dailyGoal) * 100));

  goalProgressText.textContent = `${todayData.completedCount} / ${todayData.dailyGoal} 个番茄`;
  goalProgressFill.style.width = `${percent}%`;
}

function renderRecords() {
  recordsList.innerHTML = "";

  if (todayData.records.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty-record";
    emptyItem.textContent = "还没有记录，完成一个专注番茄后会出现在这里。";
    recordsList.appendChild(emptyItem);
    return;
  }

  todayData.records.forEach((record) => {
    const item = document.createElement("li");
    item.className = "record-item";
    item.innerHTML = `
      <span class="record-time">${record.time}</span>
      <span class="record-task">${escapeHtml(record.task)}</span>
      <span> · ${record.minutes} 分钟专注</span>
    `;
    recordsList.appendChild(item);
  });
}

function renderPetPicker() {
  petPicker.innerHTML = "";

  PET_TYPE_KEYS.forEach((typeKey) => {
    const petType = PET_TYPES[typeKey];
    const button = document.createElement("button");
    const isActive = todayData.selectedPet === typeKey;
    const isLocked = timerId !== null && currentMode === "focus";

    button.className = "pet-choice";
    button.type = "button";
    button.disabled = isLocked;
    button.setAttribute("aria-pressed", String(isActive));
    button.innerHTML = `
      <span class="pet-choice-art">${renderPetImage(typeKey, 4, "choice")}</span>
      <span>${petType.name}</span>
    `;
    button.addEventListener("click", () => selectPetType(typeKey));
    petPicker.appendChild(button);
  });
}

function updatePetUI() {
  const progress = todayData.petProgress;
  const petType = PET_TYPES[normalizePetType(progress.petId || todayData.selectedPet)];
  const evolutionStage = getEvolutionStage(progress.level);
  const xpPercent = Math.min(100, Math.round((progress.currentXP / progress.nextLevelXP) * 100));

  petShell.dataset.stage = evolutionStage.state;
  petArt.innerHTML = renderPetImage(petType === undefined ? todayData.selectedPet : progress.petId, evolutionStage.id);
  petStageLabel.textContent = evolutionStage.label;
  petName.textContent = petType.name;
  petLevelLabel.textContent = `Lv.${progress.level}`;
  petStatus.textContent = getPetDescription();
  petProgressFill.style.width = `${xpPercent}%`;
  petXPText.textContent = `${progress.currentXP} / ${progress.nextLevelXP} XP`;
  evolutionHint.textContent = getEvolutionHint(progress.level);
  streakCount.textContent = `今日连续 ${todayData.streak}`;
  petTotalXP.textContent = `累计 ${progress.totalXP} XP`;
}

function renderEvolutionPreview() {
  const progress = todayData.petProgress;
  const petId = normalizePetType(progress.petId || todayData.selectedPet);
  const petType = PET_TYPES[petId];

  petModalTitle.textContent = `${petType.name} · Lv.${progress.level}`;
  petModalCopy.textContent = `当前阶段：${getEvolutionStage(progress.level).label}。完整完成番茄钟，继续解锁后续形态。`;
  evolutionPreviewGrid.innerHTML = "";

  EVOLUTION_STAGES.forEach((stage) => {
    const isUnlocked = progress.level >= stage.minLevel;
    const isCurrent = getEvolutionStage(progress.level).id === stage.id;
    const item = document.createElement("article");

    item.className = "evolution-preview-item";
    item.dataset.unlocked = String(isUnlocked);
    item.dataset.current = String(isCurrent);
    item.innerHTML = `
      <div class="evolution-preview-art">${renderPetImage(petId, stage.id, "preview")}</div>
      <div class="evolution-preview-info">
        <strong>${stage.label}</strong>
        <span>Lv.${stage.minLevel}</span>
      </div>
      <em>${isUnlocked ? "已解锁" : "未解锁"}</em>
    `;
    evolutionPreviewGrid.appendChild(item);
  });
}

function selectPetType(typeKey) {
  if (timerId !== null && currentMode === "focus") {
    statusText.textContent = "这轮正在专注中，下一轮再换宠物。";
    return;
  }

  const normalizedType = normalizePetType(typeKey);
  todayData.selectedPet = normalizedType;
  todayData.petProgress = createPetProgress(normalizedType);
  saveTodayData();
  renderPetPicker();
  updatePetUI();
  statusText.textContent = `已切换为 ${PET_TYPES[normalizedType].name}，从 Lv.1 开始培养。`;
}

function getPetDescription() {
  const progress = todayData.petProgress;
  const stage = getEvolutionStage(progress.level);
  const encouragement = MOTIVATION_TEXTS[progress.totalXP % MOTIVATION_TEXTS.length];

  return `${stage.label}成长中。${encouragement}`;
}

function getNextLevelXP(level) {
  return 100 + (level - 1) * 50;
}

function getEvolutionStage(level) {
  return EVOLUTION_STAGES.find((stage) => level >= stage.minLevel && level <= stage.maxLevel)
    || EVOLUTION_STAGES[EVOLUTION_STAGES.length - 1];
}

function getEvolutionHint(level) {
  const nextStage = EVOLUTION_STAGES.find((stage) => level < stage.minLevel);

  if (!nextStage) {
    return "已经是完全体，继续积累总 XP";
  }

  return `距离下一阶段还差 ${nextStage.minLevel - level} 级`;
}

function addPetXP(amount) {
  const baseXP = Math.max(0, Math.floor(Number(amount) || 0));
  const bonusPercent = getStreakBonusPercent(todayData.streak);
  const totalXP = Math.round(baseXP * (1 + bonusPercent / 100));
  const progress = todayData.petProgress;
  const previousStage = getEvolutionStage(progress.level).id;

  progress.currentXP += totalXP;
  progress.totalXP += totalXP;

  const levelsGained = checkLevelUp();
  const nextStage = getEvolutionStage(progress.level).id;

  progress.evolutionStage = nextStage;
  progress.lastUpdated = new Date().toISOString();
  savePetProgress();

  return {
    baseXP,
    bonusPercent,
    totalXP,
    levelsGained,
    leveledUp: levelsGained > 0,
    evolved: nextStage !== previousStage,
    level: progress.level,
    evolutionStage: nextStage
  };
}

function checkLevelUp() {
  const progress = todayData.petProgress;
  let levelsGained = 0;

  while (progress.currentXP >= progress.nextLevelXP) {
    progress.currentXP -= progress.nextLevelXP;
    progress.level += 1;
    progress.nextLevelXP = getNextLevelXP(progress.level);
    levelsGained += 1;
  }

  return levelsGained;
}

function getStreakBonusPercent(streak) {
  return Math.min(Math.max(0, streak - 1) * 5, 20);
}

function showPetReward(result) {
  const bonusText = result.bonusPercent > 0
    ? `，连续专注加成 ${result.bonusPercent}%`
    : "";
  const levelText = result.leveledUp ? ` 宠物升级到 Lv.${result.level}！` : "";
  const evolutionText = result.evolved ? " 宠物进化了！" : "";

  xpToast.textContent = `+${result.totalXP} XP${bonusText}`;
  xpToast.classList.remove("show");
  void xpToast.offsetWidth;
  xpToast.classList.add("show");
  petStatus.textContent = `完成一个番茄钟，宠物获得了 ${result.totalXP} XP。${levelText}${evolutionText}`;

  window.setTimeout(() => {
    xpToast.classList.remove("show");
  }, 1800);
}

function buildFocusCompleteMessage(result, nextRestType) {
  const restText = nextRestType === "long" ? "奖励自己一个 10 分钟长休息。" : "休息 5 分钟吧。";
  const levelText = result.leveledUp ? `宠物升级到 Lv.${result.level}！` : "距离下一次进化更近了。";
  const evolutionText = result.evolved ? "宠物进化了！" : "";

  return `完成一个番茄钟，宠物获得了 ${result.totalXP} XP。${levelText}${evolutionText} ${restText}`;
}

function renderPetImage(typeKey, evolutionStageId, renderMode) {
  const pet = PET_TYPES[normalizePetType(typeKey)];
  const stageIndex = evolutionStageToImageIndex(evolutionStageId);
  const className = renderMode === "choice" ? "pet-sprite pet-sprite-small" : "pet-sprite";

  return `
    <span class="pet-frame" style="--pet-accent: ${pet.accent};">
      <img
        class="${className}"
        src="${pet.src}"
        alt="${pet.name}"
        style="--pet-stage: ${stageIndex};"
      >
    </span>
  `;
}

function evolutionStageToImageIndex(evolutionStageId) {
  return Math.max(0, Math.min(3, Number(evolutionStageId) - 1));
}

function createPetProgress(petId = PET_TYPE_KEYS[0]) {
  const normalizedPetId = normalizePetType(petId);
  const level = 1;

  return {
    petId: normalizedPetId,
    level,
    currentXP: 0,
    nextLevelXP: getNextLevelXP(level),
    totalXP: 0,
    evolutionStage: getEvolutionStage(level).id,
    lastUpdated: new Date().toISOString()
  };
}

function loadPetProgress(saved, fallbackPetId = PET_TYPE_KEYS[0]) {
  const savedProgress = saved?.petProgress;

  if (savedProgress && typeof savedProgress === "object") {
    return normalizePetProgress(savedProgress, fallbackPetId);
  }

  return convertLegacyPetProgress(saved, fallbackPetId);
}

function normalizePetProgress(progress, fallbackPetId = PET_TYPE_KEYS[0]) {
  const petId = normalizePetType(progress.petId || fallbackPetId);
  const level = Math.max(1, Math.floor(Number(progress.level) || 1));
  const nextLevelXP = getNextLevelXP(level);
  const currentXP = Math.max(0, Math.min(Math.floor(Number(progress.currentXP) || 0), nextLevelXP - 1));
  const totalXP = Math.max(currentXP, Math.floor(Number(progress.totalXP) || currentXP));
  const evolutionStage = getEvolutionStage(level).id;

  return {
    petId,
    level,
    currentXP,
    nextLevelXP,
    totalXP,
    evolutionStage,
    lastUpdated: typeof progress.lastUpdated === "string" ? progress.lastUpdated : new Date().toISOString()
  };
}

function convertLegacyPetProgress(saved, fallbackPetId = PET_TYPE_KEYS[0]) {
  const petId = normalizePetType(saved?.selectedPet || saved?.pet?.type || fallbackPetId);
  const legacyProgress = Number(
    saved?.hatchProgress
    ?? saved?.eggProgress
    ?? saved?.pet?.hatchProgress
    ?? saved?.pet?.progress
  );
  const progress = createPetProgress(petId);

  if (Number.isFinite(legacyProgress) && legacyProgress > 0) {
    progress.currentXP = Math.min(99, Math.round(Math.min(1, legacyProgress) * 100));
    progress.totalXP = progress.currentXP;
  }

  return progress;
}

function savePetProgress() {
  saveTodayData();
}

function normalizePetType(typeKey) {
  return PET_TYPES[typeKey] ? typeKey : PET_TYPE_KEYS[0];
}

function pauseTimerSilently() {
  if (timerId === null) {
    return;
  }

  clearInterval(timerId);
  timerId = null;
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function normalizeGoal(goal) {
  const numberGoal = Number(goal);

  if (!Number.isFinite(numberGoal) || numberGoal < 1) {
    return DEFAULT_GOAL;
  }

  return Math.min(Math.floor(numberGoal), 24);
}

function normalizeNonNegativeInteger(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return 0;
  }

  return Math.floor(numberValue);
}

function normalizeFocusDuration(minutes) {
  const numberMinutes = Number(minutes);

  if (!Number.isFinite(numberMinutes) || numberMinutes < MIN_FOCUS_MINUTES) {
    return DEFAULT_FOCUS_MINUTES;
  }

  return Math.min(Math.floor(numberMinutes), MAX_FOCUS_MINUTES);
}

function normalizeRestType(restType) {
  return restType === "long" ? "long" : "short";
}

function getRestMinutes(restType = todayData?.nextRestType) {
  return REST_DURATIONS[normalizeRestType(restType)];
}

function setRestType(restType) {
  todayData.nextRestType = normalizeRestType(restType);
  MODES.rest.minutes = getRestMinutes(todayData.nextRestType);
  saveTodayData();
}

function applyTheme(theme) {
  const isDark = theme === "dark";

  document.body.classList.toggle("dark", isDark);
  themeToggle.textContent = isDark ? "浅色模式" : "深色模式";
  document.querySelector("meta[name='theme-color']").setAttribute(
    "content",
    isDark ? "#111c1a" : "#25635a"
  );
}

function requestNotificationPermission() {
  if (!("Notification" in window) || Notification.permission !== "default") {
    return;
  }

  Notification.requestPermission();
}

function showNotification(title, body) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  new Notification(title, {
    body,
    icon: "icon-192.png"
  });
}

function unlockAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function playFinishSound() {
  unlockAudio();

  const startTime = audioContext.currentTime;
  playTone(880, startTime, 0.16);
  playTone(1100, startTime + 0.22, 0.16);
  playTone(1320, startTime + 0.44, 0.22);
}

function playTone(frequency, startTime, duration) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.18, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

function escapeHtml(text) {
  const span = document.createElement("span");
  span.textContent = text;
  return span.innerHTML;
}
