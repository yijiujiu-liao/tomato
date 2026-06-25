const MODES = {
  focus: {
    label: "专注",
    minutes: 50
  },
  short: {
    label: "短休息",
    minutes: 5
  },
  long: {
    label: "长休息",
    minutes: 10
  }
};

const STORAGE_KEY = "kaoyanPomodoroData";
const DEFAULT_GOAL = 8;
const DEFAULT_FOCUS_MINUTES = 50;
const MIN_FOCUS_MINUTES = 1;
const MAX_FOCUS_MINUTES = 180;

const subtitle = document.querySelector("#subtitle");
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
const taskInput = document.querySelector("#taskInput");
const goalInput = document.querySelector("#goalInput");
const goalProgressText = document.querySelector("#goalProgressText");
const goalProgressFill = document.querySelector("#goalProgressFill");
const doneCount = document.querySelector("#doneCount");
const focusMinutes = document.querySelector("#focusMinutes");
const recordsList = document.querySelector("#recordsList");
const clearRecordsBtn = document.querySelector("#clearRecordsBtn");

let currentMode = "focus";
let remainingSeconds = MODES.focus.minutes * 60;
let timerId = null;
let audioContext = null;

let todayData = loadTodayData();

MODES.focus.minutes = todayData.focusDuration;
remainingSeconds = MODES.focus.minutes * 60;
focusDurationInput.value = todayData.focusDuration;
taskInput.value = todayData.currentTask;
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

taskInput.addEventListener("input", () => {
  todayData.currentTask = taskInput.value.trim();
  saveTodayData();
});

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
  statusText.textContent = `${MODES[currentMode].label}进行中，加油。`;

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
  statusText.textContent = "已暂停，准备好后继续。";
}

function resetTimer() {
  pauseTimer();
  remainingSeconds = MODES[currentMode].minutes * 60;
  statusText.textContent = `已重置为${MODES[currentMode].label}模式。`;
  renderTimerAndProgress();
}

function switchMode(mode) {
  if (!MODES[mode]) {
    return;
  }

  currentMode = mode;
  pauseTimer();
  remainingSeconds = MODES[currentMode].minutes * 60;
  statusText.textContent = `已切换到${MODES[currentMode].label}模式。`;
  render();
}

function updateFocusDuration() {
  const nextDuration = normalizeFocusDuration(focusDurationInput.value);

  todayData.focusDuration = nextDuration;
  MODES.focus.minutes = nextDuration;
  focusDurationInput.value = nextDuration;

  if (currentMode === "focus") {
    pauseTimer();
    remainingSeconds = MODES.focus.minutes * 60;
    statusText.textContent = `专注时长已改为 ${nextDuration} 分钟。`;
  }

  saveTodayData();
  render();
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

function finishCurrentMode() {
  pauseTimer();
  playFinishSound();

  if (currentMode === "focus") {
    addFocusRecord();
    showNotification("专注完成", `完成 1 个番茄：${todayData.currentTask || "未命名学习任务"}`);
    const nextMode = todayData.completedCount % 4 === 0 ? "long" : "short";
    currentMode = nextMode;
    remainingSeconds = MODES[nextMode].minutes * 60;
    statusText.textContent = nextMode === "long"
      ? "完成 4 个番茄，奖励自己一个长休息。"
      : "专注完成，休息 5 分钟吧。";
  } else {
    showNotification("休息结束", "可以回到下一轮专注了。");
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
  todayData.focusMinutes += MODES.focus.minutes;
  todayData.records.unshift({
    time,
    task,
    minutes: MODES.focus.minutes
  });

  saveTodayData();
}

function clearTodayRecords() {
  todayData.completedCount = 0;
  todayData.focusMinutes = 0;
  todayData.records = [];
  saveTodayData();
  renderStats();
  renderGoalProgress();
  renderRecords();
  statusText.textContent = "今日记录已清空。";
}

function toggleTheme() {
  todayData.theme = todayData.theme === "dark" ? "light" : "dark";
  applyTheme(todayData.theme);
  saveTodayData();
}

function loadTodayData() {
  const today = getDateKey();
  const defaultData = {
    date: today,
    completedCount: 0,
    focusMinutes: 0,
    currentTask: "",
    dailyGoal: DEFAULT_GOAL,
    focusDuration: DEFAULT_FOCUS_MINUTES,
    theme: "light",
    records: []
  };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (!saved) {
      return defaultData;
    }

    if (saved.date !== today) {
      return {
        ...defaultData,
        currentTask: saved.currentTask || "",
        dailyGoal: normalizeGoal(saved.dailyGoal),
        focusDuration: normalizeFocusDuration(saved.focusDuration),
        theme: saved.theme === "dark" ? "dark" : "light"
      };
    }

    return {
      ...defaultData,
      ...saved,
      dailyGoal: normalizeGoal(saved.dailyGoal),
      focusDuration: normalizeFocusDuration(saved.focusDuration),
      theme: saved.theme === "dark" ? "dark" : "light",
      records: Array.isArray(saved.records) ? saved.records : []
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
  renderTimerAndProgress();
  renderModeButtons();
  renderStats();
  renderGoalProgress();
  renderRecords();
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

    button.classList.toggle("active", button.dataset.mode === currentMode);
  });

  subtitle.textContent = `专注 ${MODES.focus.minutes} 分钟，休息一下，再回来继续。`;
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

function normalizeFocusDuration(minutes) {
  const numberMinutes = Number(minutes);

  if (!Number.isFinite(numberMinutes) || numberMinutes < MIN_FOCUS_MINUTES) {
    return DEFAULT_FOCUS_MINUTES;
  }

  return Math.min(Math.floor(numberMinutes), MAX_FOCUS_MINUTES);
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
