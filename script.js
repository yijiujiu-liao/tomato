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
const AUTH_SESSION_KEY = "kaoyanPomodoroAuth";
const STUDY_GOALS_KEY = "kaoyanStudyGoals";
const DEFAULT_GOAL = 8;
const DEFAULT_FOCUS_MINUTES = 50;
const MIN_FOCUS_MINUTES = 1;
const MAX_FOCUS_MINUTES = 180;
const REST_DURATIONS = {
  short: 5,
  long: 10
};
const STATS_RANGES = {
  day: "今日",
  week: "本周",
  month: "本月"
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
let currentGoalSelect = null;
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

let authSession = loadAuthSession();
let authPanel = null;
let authForm = null;
let authMode = "login";
let syncStatus = null;
let manualSyncButton = null;
let lastSyncText = null;
let cloudStatsPanel = null;
let studyGoalsPanel = null;
let aiSummaryPanel = null;
let cloudStats = {
  range: "week",
  status: "idle",
  data: null,
  error: ""
};
let aiSummary = {
  status: "idle",
  data: null,
  error: "",
  generatedAt: ""
};

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
let studyGoals = loadStudyGoals();

MODES.focus.minutes = todayData.focusDuration;
MODES.rest.minutes = getRestMinutes();
remainingSeconds = MODES.focus.minutes * 60;
focusDurationInput.value = todayData.focusDuration;
goalInput.value = todayData.dailyGoal;
applyTheme(todayData.theme);
render();
switchPage("timer");
setupAuthUI();
setupCloudStatsUI();
setupStudyGoalsUI();
setupAiSummaryUI();
setupCurrentGoalUI();
refreshAuthUI();
bootstrapCloudSession();

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

function setupAuthUI() {
  const hero = document.querySelector(".hero");

  if (!hero) {
    return;
  }

  authPanel = document.createElement("section");
  authPanel.className = "account-panel";
  authPanel.innerHTML = `
    <div class="account-summary">
      <div>
        <span class="account-kicker">云端同步</span>
        <strong id="accountName">本地模式</strong>
      </div>
      <button class="text-btn account-toggle" id="accountToggle" type="button">登录</button>
    </div>
    <form class="account-form" id="accountForm" hidden>
      <div class="account-field-row">
        <input id="authEmailInput" type="email" autocomplete="email" placeholder="邮箱">
        <input id="authPasswordInput" type="password" autocomplete="current-password" placeholder="密码">
      </div>
      <input id="authNameInput" type="text" autocomplete="nickname" placeholder="昵称（注册时填写）" hidden>
      <div class="account-actions">
        <button class="primary-btn account-submit" id="authSubmitBtn" type="submit">登录</button>
        <button class="text-btn" id="authModeBtn" type="button">注册账号</button>
      </div>
      <p class="sync-status" id="syncStatus" role="status"></p>
    </form>
    <div class="account-sync-tools" id="accountSyncTools" hidden>
      <button class="text-btn manual-sync-btn" id="manualSyncBtn" type="button">立即同步</button>
      <span id="lastSyncText">尚未同步</span>
    </div>
  `;

  hero.appendChild(authPanel);
  authForm = authPanel.querySelector("#accountForm");
  syncStatus = authPanel.querySelector("#syncStatus");
  manualSyncButton = authPanel.querySelector("#manualSyncBtn");
  lastSyncText = authPanel.querySelector("#lastSyncText");

  authPanel.querySelector("#accountToggle").addEventListener("click", handleAccountToggle);
  authPanel.querySelector("#authModeBtn").addEventListener("click", toggleAuthMode);
  manualSyncButton.addEventListener("click", () => {
    performFullCloudSync("正在手动同步...").catch((error) => setSyncStatus(error.message, true));
  });
  authForm.addEventListener("submit", handleAuthSubmit);
}

function refreshAuthUI() {
  if (!authPanel) {
    return;
  }

  const accountName = authPanel.querySelector("#accountName");
  const accountToggle = authPanel.querySelector("#accountToggle");
  const authSubmitBtn = authPanel.querySelector("#authSubmitBtn");
  const authModeBtn = authPanel.querySelector("#authModeBtn");
  const authNameInput = authPanel.querySelector("#authNameInput");
  const syncTools = authPanel.querySelector("#accountSyncTools");

  if (authSession?.user) {
    accountName.textContent = authSession.user.displayName || authSession.user.email;
    accountToggle.textContent = "退出";
    authForm.hidden = true;
    syncTools.hidden = false;
    updateLastSyncText();
    setSyncStatus("已开启云端同步");
    renderCloudStats();
    return;
  }

  accountName.textContent = "本地模式";
  accountToggle.textContent = authForm?.hidden ? "登录" : "收起";
  syncTools.hidden = true;
  authSubmitBtn.textContent = authMode === "register" ? "注册并同步" : "登录";
  authModeBtn.textContent = authMode === "register" ? "已有账号，去登录" : "注册账号";
  authNameInput.hidden = authMode !== "register";
  renderCloudStats();
}

function handleAccountToggle() {
  if (authSession?.token) {
    logoutFromCloud();
    return;
  }

  authForm.hidden = !authForm.hidden;
  refreshAuthUI();
}

function toggleAuthMode() {
  authMode = authMode === "login" ? "register" : "login";
  refreshAuthUI();
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  const email = authPanel.querySelector("#authEmailInput").value.trim();
  const password = authPanel.querySelector("#authPasswordInput").value;
  const displayName = authPanel.querySelector("#authNameInput").value.trim();

  if (!email || password.length < 8) {
    setSyncStatus("请输入邮箱和至少 8 位密码", true);
    return;
  }

  try {
    setSyncStatus(authMode === "register" ? "正在注册..." : "正在登录...");
    const result = await apiRequest(`/api/auth/${authMode === "register" ? "register" : "login"}`, {
      method: "POST",
      body: {
        email,
        password,
        displayName
      },
      skipAuth: true
    });

    authSession = result;
    saveAuthSession();
    await performFullCloudSync("正在同步本地与云端...");
  } catch (error) {
    setSyncStatus(error.message, true);
  }
}

async function logoutFromCloud() {
  try {
    if (authSession?.token) {
      await apiRequest("/api/auth/logout", { method: "POST" });
    }
  } catch (error) {
    console.warn(error);
  }

  authSession = null;
  saveAuthSession();
  refreshAuthUI();
  cloudStats = {
    range: cloudStats.range,
    status: "idle",
    data: null,
    error: ""
  };
  aiSummary = {
    status: "idle",
    data: null,
    error: "",
    generatedAt: ""
  };
  renderCloudStats();
  renderAiSummary();
  setSyncStatus("已回到本地模式");
}

async function bootstrapCloudSession() {
  if (!authSession?.token) {
    return;
  }

  try {
    await performFullCloudSync("正在恢复云端同步...");
  } catch (error) {
    setSyncStatus("登录已过期，请重新登录", true);
    authSession = null;
    saveAuthSession();
    refreshAuthUI();
  }
}

function loadAuthSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(AUTH_SESSION_KEY));

    if (!saved?.session?.token || !saved?.user) {
      return null;
    }

    return {
      user: saved.user,
      token: saved.session.token,
      expiresAt: saved.session.expiresAt,
      lastSyncedAt: typeof saved.lastSyncedAt === "string" ? saved.lastSyncedAt : ""
    };
  } catch (error) {
    return null;
  }
}

function saveAuthSession() {
  if (!authSession) {
    localStorage.removeItem(AUTH_SESSION_KEY);
    return;
  }

  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({
    user: authSession.user,
    lastSyncedAt: authSession.lastSyncedAt || "",
    session: {
      token: authSession.token || authSession.session?.token,
      expiresAt: authSession.expiresAt || authSession.session?.expiresAt
    }
  }));

  if (authSession.session) {
    authSession = {
      user: authSession.user,
      token: authSession.session.token,
      expiresAt: authSession.session.expiresAt,
      lastSyncedAt: authSession.lastSyncedAt || ""
    };
  }
}

async function apiRequest(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (!options.skipAuth && authSession?.token) {
    headers.Authorization = `Bearer ${authSession.token}`;
  }

  const response = await fetch(path, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    let message = "请求失败";
    let code = "";

    try {
      const payload = await response.json();
      message = payload.error || message;
      code = payload.code || "";
    } catch (error) {
      message = response.statusText || message;
    }

    const requestError = new Error(message);
    requestError.status = response.status;
    requestError.code = code;
    throw requestError;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function isCloudSyncEnabled() {
  return Boolean(authSession?.token);
}

function setSyncStatus(message, isError = false) {
  if (!syncStatus) {
    return;
  }

  syncStatus.textContent = message || "";
  syncStatus.dataset.error = String(isError);
}

async function performFullCloudSync(message = "正在同步...") {
  if (!isCloudSyncEnabled()) {
    return;
  }

  try {
    if (manualSyncButton) {
      manualSyncButton.disabled = true;
    }

    setSyncStatus(message);
    await syncLocalStateToCloud();
    await pullCloudState();
    await fetchCloudStats(cloudStats.range, { silent: true });
    markCloudSynced();
    refreshAuthUI();
    renderAiSummary();
    setSyncStatus("同步完成");
  } finally {
    if (manualSyncButton) {
      manualSyncButton.disabled = false;
    }
  }
}

function markCloudSynced() {
  if (!authSession) {
    return;
  }

  authSession.lastSyncedAt = new Date().toISOString();
  saveAuthSession();
  updateLastSyncText();
}

function updateLastSyncText() {
  if (!lastSyncText) {
    return;
  }

  lastSyncText.textContent = authSession?.lastSyncedAt
    ? `上次同步 ${formatLastSyncTime(authSession.lastSyncedAt)}`
    : "尚未同步";
}

function formatLastSyncTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "未知";
  }

  return date.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function setupCloudStatsUI() {
  const trendsPage = document.querySelector('.app-page[data-page="trends"]');

  if (!trendsPage) {
    return;
  }

  cloudStatsPanel = document.createElement("section");
  cloudStatsPanel.className = "card cloud-stats-card";
  cloudStatsPanel.innerHTML = `
    <div class="section-title cloud-stats-head">
      <div>
        <p class="stats-kicker">长期复习节奏</p>
        <h2>云端学习统计</h2>
      </div>
      <div class="stats-range-tabs" role="tablist" aria-label="统计范围">
        <button class="stats-range-btn" type="button" data-stats-range="day">今日</button>
        <button class="stats-range-btn" type="button" data-stats-range="week">本周</button>
        <button class="stats-range-btn" type="button" data-stats-range="month">本月</button>
      </div>
    </div>
    <p class="stats-sync-hint" id="statsSyncHint"></p>
    <div class="cloud-stats-summary" id="cloudStatsSummary"></div>
    <div class="cloud-stats-chart" id="cloudStatsChart" aria-label="学习趋势图"></div>
    <div class="stats-heatmap-wrap">
      <div class="stats-heatmap-head">
        <strong>近 30 天稳定度</strong>
        <span id="statsHeatmapCaption">登录后生成学习热力图</span>
      </div>
      <div class="stats-heatmap" id="statsHeatmap" aria-label="近 30 天学习热力图"></div>
    </div>
  `;

  trendsPage.appendChild(cloudStatsPanel);
  cloudStatsPanel.querySelectorAll("[data-stats-range]").forEach((button) => {
    button.addEventListener("click", () => fetchCloudStats(button.dataset.statsRange));
  });
  renderCloudStats();
}

async function fetchCloudStats(range = cloudStats.range, options = {}) {
  cloudStats.range = STATS_RANGES[range] ? range : "week";

  if (!isCloudSyncEnabled()) {
    cloudStats.status = "idle";
    cloudStats.data = null;
    cloudStats.error = "";
    renderCloudStats();
    return;
  }

  try {
    cloudStats.status = options.silent ? cloudStats.status : "loading";
    cloudStats.error = "";
    renderCloudStats();

    const data = await apiRequest(`/api/stats?range=${cloudStats.range}`);
    cloudStats = {
      range: cloudStats.range,
      status: "ready",
      data,
      error: ""
    };
  } catch (error) {
    cloudStats = {
      range: cloudStats.range,
      status: "error",
      data: cloudStats.data,
      error: error.message
    };
  }

  renderCloudStats();
}

function renderCloudStats() {
  if (!cloudStatsPanel) {
    return;
  }

  cloudStatsPanel.querySelectorAll("[data-stats-range]").forEach((button) => {
    const isActive = button.dataset.statsRange === cloudStats.range;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  const hint = cloudStatsPanel.querySelector("#statsSyncHint");
  const summary = cloudStatsPanel.querySelector("#cloudStatsSummary");
  const chart = cloudStatsPanel.querySelector("#cloudStatsChart");
  const heatmap = cloudStatsPanel.querySelector("#statsHeatmap");
  const heatmapCaption = cloudStatsPanel.querySelector("#statsHeatmapCaption");

  if (!isCloudSyncEnabled()) {
    hint.textContent = "登录后可查看跨设备累计的每日、每周、每月学习统计。";
    summary.innerHTML = buildLocalStatsSummary();
    chart.innerHTML = `<p class="cloud-stats-empty">当前是本地模式，先完成登录/注册，就能把专注记录沉淀成长期曲线。</p>`;
    heatmapCaption.textContent = "本地模式暂不生成跨设备热力图";
    renderCloudStatsHeatmap(heatmap, []);
    return;
  }

  if (cloudStats.status === "loading") {
    hint.textContent = `正在读取${STATS_RANGES[cloudStats.range]}学习数据...`;
  } else if (cloudStats.status === "error") {
    hint.textContent = cloudStats.error || "统计数据暂时读取失败。";
  } else {
    hint.textContent = `${STATS_RANGES[cloudStats.range]}统计来自云端专注记录，会随多设备同步自动更新。`;
  }

  const totals = cloudStats.data?.totals || {
    completedCount: 0,
    focusMinutes: 0,
    xpEarned: 0
  };
  const rhythmSummary = cloudStats.data?.summary || {
    activeDays: 0,
    averageDailyMinutes: 0,
    currentStreakDays: 0,
    bestDay: null
  };

  if (cloudStats.status === "ready" && rhythmSummary.bestDay) {
    hint.textContent = `${STATS_RANGES[cloudStats.range]}最高效的一天是 ${formatStatsDateLabel(rhythmSummary.bestDay.date)}，学习了 ${rhythmSummary.bestDay.focusMinutes} 分钟。`;
  }

  summary.innerHTML = `
    ${renderCloudStatMetric(totals.focusMinutes, "专注分钟")}
    ${renderCloudStatMetric(rhythmSummary.activeDays, "学习天数")}
    ${renderCloudStatMetric(rhythmSummary.averageDailyMinutes, "日均分钟")}
    ${renderCloudStatMetric(rhythmSummary.currentStreakDays, "连续天数")}
  `;

  renderCloudStatsChart(chart, cloudStats.data?.days || []);
  renderCloudStatsHeatmap(heatmap, cloudStats.data?.days || []);
  heatmapCaption.textContent = buildHeatmapCaption(cloudStats.data?.summary);
}

function buildLocalStatsSummary() {
  return `
    ${renderCloudStatMetric(todayData.completedCount, "今日次数")}
    ${renderCloudStatMetric(todayData.focusMinutes, "今日分钟")}
    ${renderCloudStatMetric(todayData.petProgress.totalXP, "宠物 XP")}
    ${renderCloudStatMetric(todayData.dailyGoal, "今日目标")}
  `;
}

function renderCloudStatMetric(value, label) {
  return `
    <article class="cloud-stat-metric">
      <strong>${Number(value) || 0}</strong>
      <span>${label}</span>
    </article>
  `;
}

function renderCloudStatsChart(container, days) {
  container.innerHTML = "";

  if (!Array.isArray(days) || days.length === 0) {
    container.innerHTML = `<p class="cloud-stats-empty">这个范围还没有云端专注记录。完成一个番茄后，这里会长出第一根柱子。</p>`;
    return;
  }

  const maxMinutes = Math.max(...days.map((day) => Number(day.focusMinutes) || 0), 1);

  days.forEach((day) => {
    const minutes = Number(day.focusMinutes) || 0;
    const bar = document.createElement("div");
    bar.className = "cloud-stat-bar";
    bar.title = `${formatStatsDateLabel(day.date)}：${minutes} 分钟，${Number(day.completedCount) || 0} 次专注，${Number(day.xpEarned) || 0} XP`;
    bar.style.setProperty("--bar-height", `${Math.max(8, Math.round((minutes / maxMinutes) * 100))}%`);
    bar.innerHTML = `
      <span class="cloud-stat-bar-fill"></span>
      <strong>${minutes}</strong>
      <small>${formatStatsDateLabel(day.date)}</small>
    `;
    container.appendChild(bar);
  });
}

function renderCloudStatsHeatmap(container, days) {
  container.innerHTML = "";

  if (!Array.isArray(days) || days.length === 0) {
    container.innerHTML = `<p class="cloud-stats-empty">还没有足够的数据生成热力图。</p>`;
    return;
  }

  const maxMinutes = Math.max(...days.map((day) => Number(day.focusMinutes) || 0), 1);

  days.slice(-30).forEach((day) => {
    const minutes = Number(day.focusMinutes) || 0;
    const level = minutes === 0 ? 0 : Math.max(1, Math.ceil((minutes / maxMinutes) * 4));
    const cell = document.createElement("span");
    cell.className = "stats-heat-cell";
    cell.dataset.level = String(level);
    cell.title = `${formatStatsDateLabel(day.date)}：${minutes} 分钟`;
    cell.textContent = new Date(day.date).getDate();
    container.appendChild(cell);
  });
}

function buildHeatmapCaption(summary) {
  if (!summary || summary.activeDays === 0) {
    return "这个范围还没有形成学习节奏";
  }

  return `${summary.activeDays} 天有学习记录，当前连续 ${summary.currentStreakDays} 天`;
}

function formatStatsDateLabel(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || "";
  }

  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function setupAiSummaryUI() {
  const reviewPage = document.querySelector('.app-page[data-page="review"]');

  if (!reviewPage) {
    return;
  }

  aiSummaryPanel = document.createElement("section");
  aiSummaryPanel.className = "card ai-summary-card";
  aiSummaryPanel.innerHTML = `
    <div class="section-title ai-summary-head">
      <div>
        <p class="stats-kicker">AI 学习教练</p>
        <h2>今日总结与明日建议</h2>
      </div>
      <button class="primary-btn ai-summary-generate" id="aiSummaryGenerate" type="button">生成今日总结</button>
    </div>
    <p class="ai-summary-hint" id="aiSummaryHint"></p>
    <div class="ai-summary-body" id="aiSummaryBody"></div>
  `;

  reviewPage.appendChild(aiSummaryPanel);
  aiSummaryPanel.querySelector("#aiSummaryGenerate").addEventListener("click", () => fetchDailyAiSummary());
  renderAiSummary();
}

async function fetchDailyAiSummary(options = {}) {
  if (!isCloudSyncEnabled()) {
    aiSummary = {
      status: "idle",
      data: null,
      error: "",
      generatedAt: ""
    };
    renderAiSummary();
    return;
  }

  try {
    aiSummary = {
      ...aiSummary,
      status: "loading",
      error: options.auto ? "专注完成，正在生成今天的 AI 复盘..." : ""
    };
    renderAiSummary();

    const data = await apiRequest("/api/ai/daily-summary", {
      method: "POST",
      body: { dateKey: getTodayKey() }
    });
    aiSummary = {
      status: "ready",
      data: data.summary,
      error: "",
      generatedAt: data.generatedAt || new Date().toISOString()
    };
  } catch (error) {
    aiSummary = {
      ...aiSummary,
      status: "error",
      error: error.code === "AI_NOT_CONFIGURED"
        ? "AI 总结还没有配置。部署时在服务端环境变量里添加 OPENAI_API_KEY 后，这里就会自动生成复盘。"
        : error.message
    };
  }

  renderAiSummary();
}

function renderAiSummary() {
  if (!aiSummaryPanel) {
    return;
  }

  const hint = aiSummaryPanel.querySelector("#aiSummaryHint");
  const body = aiSummaryPanel.querySelector("#aiSummaryBody");
  const button = aiSummaryPanel.querySelector("#aiSummaryGenerate");
  button.disabled = aiSummary.status === "loading" || !isCloudSyncEnabled();

  if (!isCloudSyncEnabled()) {
    hint.textContent = "登录后，AI 会基于跨设备同步的任务、专注记录和学习目标生成复盘。";
    body.innerHTML = `<p class="ai-summary-empty">先登录/注册账号，完成一个番茄后，这里会出现当天总结和第二天建议。</p>`;
    return;
  }

  if (aiSummary.status === "loading") {
    hint.textContent = aiSummary.error || "AI 正在读取今天的学习记录...";
    body.innerHTML = `
      <div class="ai-summary-loading">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
    return;
  }

  if (aiSummary.status === "error") {
    hint.textContent = "AI 总结暂时不可用。";
    body.innerHTML = `<p class="ai-summary-empty">${escapeHtml(aiSummary.error || "请稍后重试。")}</p>`;
    return;
  }

  if (!aiSummary.data) {
    hint.textContent = "完成学习后可自动生成，也可以随时手动刷新今天的 AI 复盘。";
    body.innerHTML = `<p class="ai-summary-empty">还没有生成今日总结。点一下按钮，让 AI 教练帮你把今天收束成明天的行动。</p>`;
    return;
  }

  hint.textContent = aiSummary.generatedAt
    ? `最近生成：${formatAiGeneratedAt(aiSummary.generatedAt)}`
    : "已生成今日 AI 复盘。";
  body.innerHTML = `
    <article class="ai-summary-main">
      <h3>${escapeHtml(aiSummary.data.title)}</h3>
      <p>${escapeHtml(aiSummary.data.todaySummary)}</p>
    </article>
    ${renderAiSummaryList("亮点", aiSummary.data.highlights)}
    ${renderAiSummaryList("风险提醒", aiSummary.data.risks)}
    ${renderAiSummaryList("明日建议", aiSummary.data.tomorrowPlan)}
    <blockquote class="ai-summary-encouragement">${escapeHtml(aiSummary.data.encouragement)}</blockquote>
  `;
}

function renderAiSummaryList(title, items) {
  if (!Array.isArray(items) || items.length === 0) {
    return "";
  }

  return `
    <section class="ai-summary-section">
      <strong>${title}</strong>
      <ul>
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </section>
  `;
}

function formatAiGeneratedAt(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function setupStudyGoalsUI() {
  const goalsPage = document.querySelector('.app-page[data-page="goals"]');

  if (!goalsPage) {
    return;
  }

  studyGoalsPanel = document.createElement("section");
  studyGoalsPanel.className = "card study-goals-card";
  studyGoalsPanel.innerHTML = `
    <div class="section-title study-goals-head">
      <div>
        <p class="stats-kicker">考研长期目标</p>
        <h2>学习目标</h2>
      </div>
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

  goalsPage.appendChild(studyGoalsPanel);
  studyGoalsPanel.querySelector("#studyGoalForm").addEventListener("submit", handleStudyGoalSubmit);
  renderStudyGoals();
}

function handleStudyGoalSubmit(event) {
  event.preventDefault();

  const titleInput = studyGoalsPanel.querySelector("#studyGoalTitle");
  const minutesInput = studyGoalsPanel.querySelector("#studyGoalMinutes");
  const dateInput = studyGoalsPanel.querySelector("#studyGoalDate");
  const title = titleInput.value.trim();

  if (!title) {
    titleInput.focus();
    return;
  }

  addStudyGoal({
    title,
    targetMinutes: normalizeNonNegativeInteger(minutesInput.value),
    targetDate: dateInput.value || null
  });
  titleInput.value = "";
  minutesInput.value = "";
  dateInput.value = "";
  titleInput.focus();
}

function addStudyGoal(goalInput) {
  const goal = normalizeStudyGoal({
    id: createStudyGoalId(),
    clientId: "",
    title: goalInput.title,
    targetMinutes: goalInput.targetMinutes,
    targetDate: goalInput.targetDate,
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
    updatedAt: new Date().toISOString()
  });

  if (!goal) {
    return;
  }

  studyGoals.unshift(goal);
  saveStudyGoals();
  renderStudyGoals();
  runCloudSync(async () => {
    const created = await createStudyGoalInCloud(goal);
    replaceStudyGoal(goal.id, normalizeStudyGoal(created.studyGoal));
  });
}

function toggleStudyGoal(goalId) {
  const goal = studyGoals.find((item) => item.id === goalId);

  if (!goal) {
    return;
  }

  goal.completed = !goal.completed;
  goal.completedAt = goal.completed ? new Date().toISOString() : null;
  goal.updatedAt = new Date().toISOString();
  saveStudyGoals();
  renderStudyGoals();
  runCloudSync(async () => {
    if (!goal.syncedGoalId) {
      const created = await createStudyGoalInCloud(goal);
      replaceStudyGoal(goal.id, normalizeStudyGoal(created.studyGoal));
      return;
    }

    const updated = await apiRequest(`/api/study-goals/${goal.syncedGoalId}`, {
      method: "PATCH",
      body: {
        completed: goal.completed
      }
    });
    replaceStudyGoal(goal.id, normalizeStudyGoal(updated.studyGoal));
  });
}

function deleteStudyGoal(goalId) {
  const goal = studyGoals.find((item) => item.id === goalId);

  if (!goal) {
    return;
  }

  studyGoals = studyGoals.filter((item) => item.id !== goalId);

  if (todayData.currentStudyGoalId === goalId) {
    todayData.currentStudyGoalId = "";
    saveTodayData();
  }

  saveStudyGoals();
  renderStudyGoals();
  updateCurrentGoalOptions();

  if (goal.syncedGoalId) {
    runCloudSync(() => apiRequest(`/api/study-goals/${goal.syncedGoalId}`, {
      method: "DELETE"
    }));
  }
}

function renderStudyGoals() {
  if (!studyGoalsPanel) {
    return;
  }

  const list = studyGoalsPanel.querySelector("#studyGoalList");
  const count = studyGoalsPanel.querySelector("#studyGoalsCount");
  const activeCount = studyGoals.filter((goal) => !goal.completed).length;
  count.textContent = `${activeCount} 个进行中`;
  list.innerHTML = "";

  if (studyGoals.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "study-goal-empty";
    emptyItem.textContent = "先写下一个长期目标，让每天的番茄钟有方向。";
    list.appendChild(emptyItem);
    return;
  }

  studyGoals.forEach((goal) => {
    const item = document.createElement("li");
    item.className = "study-goal-item";
    item.dataset.completed = String(goal.completed);
    item.innerHTML = `
      <button class="study-goal-check" type="button" aria-label="${goal.completed ? "恢复目标" : "完成目标"}">
        ${goal.completed ? "✓" : ""}
      </button>
      <div class="study-goal-main">
        <strong>${escapeHtml(goal.title)}</strong>
        <span>${formatStudyGoalMeta(goal)}</span>
        <div class="study-goal-progress" aria-label="目标进度">
          <i style="width: ${Math.min(100, Number(goal.progressPercent) || 0)}%"></i>
        </div>
      </div>
      <button class="text-btn study-goal-delete" type="button">删除</button>
    `;
    item.querySelector(".study-goal-check").addEventListener("click", () => toggleStudyGoal(goal.id));
    item.querySelector(".study-goal-delete").addEventListener("click", () => deleteStudyGoal(goal.id));
    list.appendChild(item);
  });
}

function formatStudyGoalMeta(goal) {
  const parts = [];

  if (goal.targetMinutes > 0) {
    parts.push(`${goal.focusMinutes || 0} / ${goal.targetMinutes} 分钟`);
  }

  if (goal.targetDate) {
    parts.push(`截止 ${goal.targetDate}`);
  }

  if (goal.completed) {
    parts.push("已完成");
  }

  return parts.length ? parts.join(" · ") : "不设时长，保持推进";
}

function setupCurrentGoalUI() {
  const currentTaskSetting = document.querySelector(".current-task-setting");

  if (!currentTaskSetting) {
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "current-goal-setting";
  wrapper.innerHTML = `
    <label for="currentGoalSelect">当前目标</label>
    <select id="currentGoalSelect" aria-label="选择当前学习目标"></select>
  `;
  currentTaskSetting.insertAdjacentElement("afterend", wrapper);
  currentGoalSelect = wrapper.querySelector("#currentGoalSelect");
  currentGoalSelect.addEventListener("change", updateCurrentGoalSelection);
  updateCurrentGoalOptions();
}

async function pullCloudState() {
  const data = await apiRequest("/api/sync");

  if (data.user) {
    authSession.user = data.user;
    saveAuthSession();
  }

  applyCloudSettings(data.settings);
  applyCloudPet(data.pet);
  applyCloudTasks(data.tasks || []);
  applyCloudStudyGoals(data.studyGoals || []);
  applyCloudFocusSessions(data.focusSessions || []);
  render();
}

async function syncLocalStateToCloud() {
  if (!isCloudSyncEnabled()) {
    return;
  }

  await uploadLocalStudyGoalsToCloud();
  await syncSettingsToCloud();
  await syncPetToCloud();
  await uploadLocalFocusRecordsToCloud();
  await uploadLocalTasksToCloud();
}

async function uploadLocalFocusRecordsToCloud() {
  if (!Array.isArray(todayData.records) || todayData.records.length === 0) {
    return;
  }

  for (const record of todayData.records) {
    if (record.syncedSessionId) {
      continue;
    }

    const created = await apiRequest("/api/focus-sessions", {
      method: "POST",
      body: {
        clientId: record.id || createFocusRecordId(),
        taskId: record.taskId || null,
        studyGoalId: record.studyGoalId || null,
        taskTitle: record.task,
        minutes: record.minutes,
        startedAt: record.startedAt,
        endedAt: record.endedAt,
        streak: record.streak,
        xpEarned: record.xpEarned || record.minutes
      }
    });

    record.id = created.focusSession.clientId || record.id || created.focusSession.id;
    record.syncedSessionId = created.focusSession.id;
  }

  saveTodayData(false);
}

async function uploadLocalStudyGoalsToCloud() {
  if (!Array.isArray(studyGoals) || studyGoals.length === 0) {
    return;
  }

  for (const goal of studyGoals) {
    if (goal.syncedGoalId) {
      continue;
    }

    const created = await createStudyGoalInCloud(goal);
    replaceStudyGoal(goal.id, normalizeStudyGoal(created.studyGoal));
  }
}

async function createStudyGoalInCloud(goal) {
  return apiRequest("/api/study-goals", {
    method: "POST",
    body: {
      clientId: goal.clientId || goal.id,
      title: goal.title,
      targetMinutes: goal.targetMinutes,
      targetDate: goal.targetDate,
      completed: goal.completed
    }
  });
}

async function syncSettingsToCloud() {
  if (!isCloudSyncEnabled()) {
    return;
  }

  await apiRequest("/api/settings", {
    method: "PUT",
    body: {
      focusDuration: todayData.focusDuration,
      dailyGoal: todayData.dailyGoal,
      theme: todayData.theme,
      nextRestType: todayData.nextRestType,
      currentTaskId: todayData.currentTaskId,
      currentStudyGoalId: todayData.currentStudyGoalId
    }
  });
}

async function syncPetToCloud() {
  if (!isCloudSyncEnabled()) {
    return;
  }

  await apiRequest("/api/pet", {
    method: "PUT",
    body: {
      petId: todayData.petProgress.petId || todayData.selectedPet,
      level: todayData.petProgress.level,
      currentXP: todayData.petProgress.currentXP,
      totalXP: todayData.petProgress.totalXP
    }
  });
}

async function uploadLocalTasksToCloud() {
  const groupedTasks = Object.entries(dailyPlans);

  for (const [dateKey, tasks] of groupedTasks) {
    for (const task of tasks) {
      if (task.syncedTaskId) {
        continue;
      }

      const created = await createTaskInCloud(task, dateKey);
      applyCreatedCloudTask(task, created.task);
    }
  }

  saveDailyPlans();
}

async function createTaskInCloud(task, dateKey = getTodayKey()) {
  return apiRequest("/api/tasks", {
    method: "POST",
    body: {
      clientId: task.clientId || task.id,
      title: task.title,
      dateKey,
      completed: task.completed,
      carriedFromId: task.carriedFromId || null
    }
  });
}

function applyCreatedCloudTask(localTask, cloudTask) {
  const previousId = localTask.id;
  const normalizedTask = normalizeTask({
    ...cloudTask,
    clientId: cloudTask.clientId || localTask.clientId || localTask.id,
    syncedTaskId: cloudTask.id
  });

  if (!normalizedTask) {
    return;
  }

  Object.assign(localTask, normalizedTask);

  if (todayData.currentTaskId === previousId) {
    todayData.currentTaskId = normalizedTask.id;
    todayData.currentTask = normalizedTask.title;
    saveTodayData(false);
  }
}

async function syncTaskPatch(task, patchBody, dateKey = getTodayKey()) {
  if (!task.syncedTaskId) {
    const created = await createTaskInCloud(task, dateKey);
    applyCreatedCloudTask(task, created.task);
  }

  const updated = await apiRequest(`/api/tasks/${task.syncedTaskId || task.id}`, {
    method: "PATCH",
    body: patchBody
  });
  applyCreatedCloudTask(task, updated.task);
  saveDailyPlans();
}

function applyCloudSettings(settings) {
  if (!settings) {
    return;
  }

  todayData.focusDuration = normalizeFocusDuration(settings.focusDuration);
  todayData.dailyGoal = normalizeGoal(settings.dailyGoal);
  todayData.theme = settings.theme === "dark" ? "dark" : "light";
  todayData.nextRestType = normalizeRestType(settings.nextRestType);
  todayData.currentTaskId = typeof settings.currentTaskId === "string" ? settings.currentTaskId : "";
  todayData.currentStudyGoalId = typeof settings.currentStudyGoalId === "string" ? settings.currentStudyGoalId : "";
  MODES.focus.minutes = todayData.focusDuration;
  MODES.rest.minutes = getRestMinutes();

  if (currentMode === "focus" && timerId === null) {
    remainingSeconds = MODES.focus.minutes * 60;
  }

  focusDurationInput.value = todayData.focusDuration;
  goalInput.value = todayData.dailyGoal;
  applyTheme(todayData.theme);
  saveTodayData(false);
}

function applyCloudPet(pet) {
  if (!pet) {
    return;
  }

  const petId = normalizePetType(pet.petId);
  todayData.selectedPet = petId;
  todayData.petProgress = normalizePetProgress({
    petId,
    level: pet.level,
    currentXP: pet.currentXP,
    totalXP: pet.totalXP,
    lastUpdated: pet.updatedAt
  }, petId);
  saveTodayData(false);
}

function applyCloudTasks(tasks) {
  if (!Array.isArray(tasks)) {
    return;
  }

  const cloudPlans = tasks.reduce((plans, task) => {
    const dateKey = task.dateKey || getTodayKey();

    if (!plans[dateKey]) {
      plans[dateKey] = [];
    }

    plans[dateKey].push(normalizeTask({
      id: task.id,
      clientId: task.clientId,
      syncedTaskId: task.id,
      title: task.title,
      completed: task.completed,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      carriedFromId: task.carriedFromId
    }));

    return plans;
  }, {});
  const cloudKeys = new Set(tasks.map((task) => task.clientId || task.id));

  Object.entries(dailyPlans).forEach(([dateKey, localTasks]) => {
    const unsyncedTasks = localTasks.filter((task) => {
      return !task.syncedTaskId && !cloudKeys.has(task.clientId || task.id);
    });

    if (unsyncedTasks.length === 0) {
      return;
    }

    if (!cloudPlans[dateKey]) {
      cloudPlans[dateKey] = [];
    }

    cloudPlans[dateKey].push(...unsyncedTasks);
  });

  dailyPlans = cloudPlans;
  saveDailyPlans(false);
}

function applyCloudStudyGoals(goals) {
  if (!Array.isArray(goals)) {
    return;
  }

  const localUnsyncedGoals = studyGoals.filter((goal) => !goal.syncedGoalId);
  const cloudGoals = goals.map(normalizeStudyGoal).filter(Boolean);
  const cloudKeys = new Set(cloudGoals.map((goal) => goal.clientId || goal.id));
  studyGoals = [
    ...cloudGoals,
    ...localUnsyncedGoals.filter((goal) => !cloudKeys.has(goal.clientId || goal.id))
  ].sort(sortStudyGoals);
  saveStudyGoals();
  renderStudyGoals();
}

function applyCloudFocusSessions(focusSessions) {
  if (!Array.isArray(focusSessions)) {
    return;
  }

  const todayKey = getTodayKey();
  const cloudRecords = focusSessions
    .filter((session) => session.mode === "focus" && getDateKey(new Date(session.endedAt)) === todayKey)
    .map(focusSessionToRecord);
  const cloudRecordKeys = new Set(cloudRecords.map(getFocusRecordKey));
  const localUnsyncedRecords = todayData.records
    .filter((record) => !record.syncedSessionId && getDateKey(new Date(record.endedAt)) === todayKey)
    .filter((record) => !cloudRecordKeys.has(getFocusRecordKey(record)));
  const records = [...cloudRecords, ...localUnsyncedRecords]
    .filter(Boolean)
    .sort((first, second) => new Date(second.endedAt) - new Date(first.endedAt));

  todayData.records = records;
  todayData.completedCount = records.length;
  todayData.focusMinutes = records.reduce((total, record) => total + (Number(record.minutes) || 0), 0);
  todayData.streak = records.reduce((maxStreak, record) => Math.max(maxStreak, Number(record.streak) || 0), 0);
  saveTodayData(false);
}

function focusSessionToRecord(session) {
  const endedAt = session.endedAt || new Date().toISOString();
  const endedDate = new Date(endedAt);

  return {
    id: session.clientId || session.id,
    syncedSessionId: session.id,
    taskId: session.taskId || "",
    studyGoalId: session.studyGoalId || "",
    time: Number.isNaN(endedDate.getTime())
      ? ""
      : endedDate.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit"
      }),
    task: session.taskTitle || "未命名学习任务",
    minutes: Number(session.minutes) || 0,
    streak: Number(session.streak) || 0,
    xpEarned: Number(session.xpEarned) || 0,
    startedAt: session.startedAt || "",
    endedAt
  };
}

function getFocusRecordKey(record) {
  return record.syncedSessionId || record.id || `${record.endedAt}-${record.task}-${record.minutes}`;
}

function runCloudSync(action) {
  if (!isCloudSyncEnabled()) {
    return;
  }

  Promise.resolve()
    .then(action)
    .then(() => setSyncStatus("已同步"))
    .catch((error) => setSyncStatus(error.message, true));
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

function loadStudyGoals() {
  try {
    const saved = JSON.parse(localStorage.getItem(STUDY_GOALS_KEY));

    if (!Array.isArray(saved)) {
      return [];
    }

    return saved.map(normalizeStudyGoal).filter(Boolean).sort(sortStudyGoals);
  } catch (error) {
    return [];
  }
}

function saveStudyGoals() {
  localStorage.setItem(STUDY_GOALS_KEY, JSON.stringify(studyGoals));
}

function normalizeStudyGoal(goal) {
  if (!goal || typeof goal !== "object" || typeof goal.title !== "string" || !goal.title.trim()) {
    return null;
  }

  const syncedGoalId = typeof goal.syncedGoalId === "string" && goal.syncedGoalId
    ? goal.syncedGoalId
    : (typeof goal.id === "string" && goal.clientId ? goal.id : "");
  const clientId = typeof goal.clientId === "string" && goal.clientId
    ? goal.clientId
    : (syncedGoalId ? "" : (typeof goal.id === "string" ? goal.id : createStudyGoalId()));

  return {
    id: syncedGoalId || clientId || createStudyGoalId(),
    clientId,
    syncedGoalId,
    title: goal.title.trim().slice(0, 80),
    targetMinutes: normalizeNonNegativeInteger(goal.targetMinutes),
    focusMinutes: normalizeNonNegativeInteger(goal.focusMinutes),
    progressPercent: normalizeNonNegativeInteger(goal.progressPercent),
    targetDate: /^\d{4}-\d{2}-\d{2}$/.test(goal.targetDate || "") ? goal.targetDate : null,
    completed: Boolean(goal.completed),
    createdAt: typeof goal.createdAt === "string" ? goal.createdAt : new Date().toISOString(),
    completedAt: goal.completed && typeof goal.completedAt === "string" ? goal.completedAt : null,
    updatedAt: typeof goal.updatedAt === "string" ? goal.updatedAt : new Date().toISOString()
  };
}

function replaceStudyGoal(currentId, nextGoal) {
  if (!nextGoal) {
    return;
  }

  studyGoals = studyGoals.map((goal) => goal.id === currentId ? nextGoal : goal).sort(sortStudyGoals);

  if (todayData.currentStudyGoalId === currentId) {
    todayData.currentStudyGoalId = nextGoal.id;
  }

  todayData.records.forEach((record) => {
    if (record.studyGoalId === currentId) {
      record.studyGoalId = nextGoal.id;
    }
  });

  saveTodayData(false);
  saveStudyGoals();
  renderStudyGoals();
  updateCurrentGoalOptions();
}

function sortStudyGoals(first, second) {
  if (first.completed !== second.completed) {
    return Number(first.completed) - Number(second.completed);
  }

  return new Date(second.updatedAt) - new Date(first.updatedAt);
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

  const task = {
    id: createTaskId(),
    clientId: "",
    syncedTaskId: "",
    title: cleanTitle,
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  getTodayTasks().push(task);

  saveDailyPlans();
  renderTaskPage();
  updateCurrentTaskOptions();
  runCloudSync(async () => {
    const created = await createTaskInCloud(task, getTodayKey());
    applyCreatedCloudTask(task, created.task);
    saveDailyPlans();
    renderTaskPage();
    updateCurrentTaskOptions();
  });
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
  runCloudSync(() => syncTaskPatch(task, { completed: task.completed }));
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
  runCloudSync(() => syncTaskPatch(task, { title: task.title }));
}

function deleteTask(taskId) {
  const tasks = getTodayTasks();
  const task = tasks.find((item) => item.id === taskId);
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
  if (task?.syncedTaskId) {
    runCloudSync(() => apiRequest(`/api/tasks/${task.syncedTaskId}`, {
      method: "DELETE"
    }));
  }
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

  const carriedTasks = tasksToCarry.map((task) => ({
      id: createTaskId(),
      clientId: "",
      syncedTaskId: "",
      title: task.title,
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
      carriedFromId: task.id
  }));

  todayTasks.push(...carriedTasks);

  saveDailyPlans();
  renderTaskPage();
  updateCurrentTaskOptions();
  runCloudSync(async () => {
    for (const task of carriedTasks) {
      const created = await createTaskInCloud(task, getTodayKey());
      applyCreatedCloudTask(task, created.task);
    }
    saveDailyPlans();
    renderTaskPage();
    updateCurrentTaskOptions();
  });
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

function updateCurrentGoalOptions() {
  if (!currentGoalSelect) {
    return;
  }

  const activeGoals = studyGoals.filter((goal) => !goal.completed);
  const selectedGoalExists = activeGoals.some((goal) => goal.id === todayData.currentStudyGoalId);

  if (todayData.currentStudyGoalId && !selectedGoalExists) {
    todayData.currentStudyGoalId = "";
    saveTodayData();
  }

  currentGoalSelect.innerHTML = "";
  currentGoalSelect.appendChild(createTaskOption("", activeGoals.length ? "暂未选择目标" : "暂无进行中目标"));

  activeGoals.forEach((goal) => {
    currentGoalSelect.appendChild(createTaskOption(goal.id, goal.title));
  });

  currentGoalSelect.value = selectedGoalExists ? todayData.currentStudyGoalId : "";
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
  runCloudSync(() => syncTaskPatch(task, { completed: true }));
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
  runCloudSync(() => syncTaskPatch(task, { completed: false }));
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
  runCloudSync(syncSettingsToCloud);
}

function updateCurrentGoalSelection() {
  const goal = studyGoals.find((item) => item.id === currentGoalSelect.value);

  todayData.currentStudyGoalId = goal ? goal.id : "";
  saveTodayData();
  runCloudSync(syncSettingsToCloud);
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

  const syncedTaskId = typeof task.syncedTaskId === "string" && task.syncedTaskId
    ? task.syncedTaskId
    : (typeof task.id === "string" && task.clientId ? task.id : "");
  const clientId = typeof task.clientId === "string" && task.clientId
    ? task.clientId
    : (syncedTaskId ? "" : (typeof task.id === "string" ? task.id : createTaskId()));

  return {
    id: syncedTaskId || clientId || createTaskId(),
    clientId,
    syncedTaskId,
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

function createFocusRecordId() {
  return `focus-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createStudyGoalId() {
  return `goal-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

  if (pageName === "trends" && isCloudSyncEnabled() && cloudStats.status === "idle") {
    fetchCloudStats(cloudStats.range);
  }
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
    const focusRecord = addFocusRecord();
    const xpResult = addPetXP(MODES.focus.minutes);
    focusRecord.xpEarned = xpResult.totalXP;
    saveTodayData();
    runCloudSync(async () => {
      const created = await apiRequest("/api/focus-sessions", {
        method: "POST",
        body: {
          clientId: focusRecord.id,
          taskId: todayData.currentTaskId || null,
          studyGoalId: todayData.currentStudyGoalId || null,
          taskTitle: focusRecord.task,
          minutes: focusRecord.minutes,
          startedAt: focusRecord.startedAt,
          endedAt: focusRecord.endedAt,
          streak: focusRecord.streak,
          xpEarned: xpResult.totalXP
        }
      });
      focusRecord.syncedSessionId = created.focusSession.id;
      await syncPetToCloud();
      await syncSettingsToCloud();
      await pullCloudState();
      await fetchCloudStats(cloudStats.range, { silent: true });
      await fetchDailyAiSummary({ auto: true });
      saveTodayData(false);
    });
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
  const endedAt = new Date().toISOString();
  const startedAt = new Date(new Date(endedAt).getTime() - MODES.focus.minutes * 60 * 1000).toISOString();
  const time = new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  });

  todayData.completedCount += 1;
  todayData.streak += 1;
  todayData.focusMinutes += MODES.focus.minutes;
  todayData.records.unshift({
    id: createFocusRecordId(),
    syncedSessionId: "",
    taskId: todayData.currentTaskId || "",
    studyGoalId: todayData.currentStudyGoalId || "",
    time,
    task,
    minutes: MODES.focus.minutes,
    streak: todayData.streak,
    xpEarned: 0,
    startedAt,
    endedAt
  });

  saveTodayData();
  return todayData.records[0];
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
    currentStudyGoalId: "",
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
        currentStudyGoalId: "",
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
      currentStudyGoalId: typeof saved.currentStudyGoalId === "string" ? saved.currentStudyGoalId : "",
      dailyGoal: normalizeGoal(saved.dailyGoal),
      focusDuration: normalizeFocusDuration(saved.focusDuration),
      nextRestType: normalizeRestType(saved.nextRestType),
      theme: saved.theme === "dark" ? "dark" : "light",
      records: Array.isArray(saved.records) ? saved.records.map(normalizeFocusRecord).filter(Boolean) : [],
      selectedPet,
      petProgress
    };
  } catch (error) {
    return defaultData;
  }
}

function saveTodayData(syncCloud = true) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todayData));

  if (syncCloud) {
    runCloudSync(async () => {
      await syncSettingsToCloud();
      await syncPetToCloud();
    });
  }
}

function getDateKey(date = new Date()) {
  const now = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(now.getTime())) {
    return getDateKey();
  }

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeFocusRecord(record) {
  if (!record || typeof record !== "object") {
    return null;
  }

  const endedAt = Number.isNaN(new Date(record.endedAt).getTime())
    ? new Date().toISOString()
    : record.endedAt;
  const minutes = normalizeNonNegativeInteger(record.minutes);

  return {
    id: typeof record.id === "string" && record.id ? record.id : createFocusRecordId(),
    syncedSessionId: typeof record.syncedSessionId === "string" ? record.syncedSessionId : "",
    taskId: typeof record.taskId === "string" ? record.taskId : "",
    studyGoalId: typeof record.studyGoalId === "string" ? record.studyGoalId : "",
    time: typeof record.time === "string" && record.time
      ? record.time
      : new Date(endedAt).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit"
      }),
    task: typeof record.task === "string" && record.task ? record.task : "未命名学习任务",
    minutes,
    streak: normalizeNonNegativeInteger(record.streak),
    xpEarned: normalizeNonNegativeInteger(record.xpEarned || minutes),
    startedAt: Number.isNaN(new Date(record.startedAt).getTime())
      ? new Date(new Date(endedAt).getTime() - minutes * 60 * 1000).toISOString()
      : record.startedAt,
    endedAt
  };
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
  renderStudyGoals();
  updateCurrentGoalOptions();
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
  renderCloudStats();
  renderAiSummary();
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
