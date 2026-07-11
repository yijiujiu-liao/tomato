import { createApiClient } from "./js/api.js";
import { renderAiSummaryList } from "./js/components/aiSummary.js";
import { buildStudyDiagnostics } from "./js/components/diagnostics.js";
import { renderCloudStatMetric } from "./js/components/stats.js";
import { buildTaskCardHtml } from "./js/components/taskCard.js";
import { renderHomePageView } from "./js/pages/home.js";
import { renderTasksPageView } from "./js/pages/tasks.js";
import {
  createTimerDeadline,
  getRemainingSeconds,
  normalizeActiveTimer
} from "./js/timer.js";
import {
  AUTH_SESSION_KEY,
  DAILY_PLANS_KEY,
  DELETED_TASKS_KEY,
  DEFAULT_FOCUS_MINUTES,
  DEFAULT_GOAL,
  EVOLUTION_STAGES,
  MAX_FOCUS_MINUTES,
  MIN_FOCUS_MINUTES,
  MODES,
  MOTIVATION_TEXTS,
  PET_TYPE_KEYS,
  PET_TYPES,
  REST_DURATIONS,
  STATS_RANGES,
  STORAGE_KEY,
  STUDY_GOALS_KEY
} from "./js/state.js";

const timerCard = document.querySelector(".timer-card");
const timerDisplay = document.querySelector("#timerDisplay");
const timerProgressFill = document.querySelector("#timerProgressFill");
const timerProgressText = document.querySelector("#timerProgressText");
const statusText = document.querySelector("#statusText");
const startBtn = document.querySelector("#startBtn");
const pauseBtn = document.querySelector("#pauseBtn");
const resetBtn = document.querySelector("#resetBtn");
const abandonBtn = document.querySelector("#abandonBtn");
const themeToggle = document.querySelector("#themeToggle");
const profileThemeBtn = document.querySelector("#profileThemeBtn");
const modeButtons = document.querySelectorAll(".mode-btn");
const pageButtons = document.querySelectorAll(".nav-btn");
const appPages = document.querySelectorAll(".app-page");
const todayTaskMount = document.querySelector("#todayTaskMount");
const todayTimerMount = document.querySelector("#todayTimerMount");
const homeDateText = document.querySelector("#homeDateText");
const homeTaskProgress = document.querySelector("#homeTaskProgress");
const homeFocusMinutes = document.querySelector("#homeFocusMinutes");
const homeGoalProgress = document.querySelector("#homeGoalProgress");
const homeStreakText = document.querySelector("#homeStreakText");
const homePetChip = document.querySelector("#homePetChip");
const homePetArt = document.querySelector("#homePetArt");
const homePetProgressFill = document.querySelector("#homePetProgressFill");
const homePetNextHint = document.querySelector("#homePetNextHint");
const homeNextTaskTitle = document.querySelector("#homeNextTaskTitle");
const homeNextTaskHint = document.querySelector("#homeNextTaskHint");
const homeQuickTask = document.querySelector("#homeQuickTask");
const homeQuickTaskInput = document.querySelector("#homeQuickTaskInput");
const homeQuickTaskBtn = document.querySelector("#homeQuickTaskBtn");
const aiPlanBanner = document.querySelector("#aiPlanBanner");
const aiPlanBannerTitle = document.querySelector("#aiPlanBannerTitle");
const aiPlanBannerText = document.querySelector("#aiPlanBannerText");
const homeFocusBtn = document.querySelector("#homeFocusBtn");
const homeAddTaskBtn = document.querySelector("#homeAddTaskBtn");
const homeInsightsBtn = document.querySelector("#homeInsightsBtn");
const focusDurationInput = document.querySelector("#focusDurationInput");
const restDurationSelect = document.querySelector("#restDurationSelect");
const currentTaskSelect = document.querySelector("#currentTaskSelect");
let currentGoalSelect = null;
const todayDateText = document.querySelector("#todayDateText");
const planProgressText = document.querySelector("#planProgressText");
const planExpandBtn = document.querySelector("#planExpandBtn");
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
const profileClearRecordsBtn = document.querySelector("#profileClearRecordsBtn");
const profileInsightsBtn = document.querySelector("#profileInsightsBtn");
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
const petTodayXP = document.querySelector("#petTodayXP");
const streakCount = document.querySelector("#streakCount");
const petTotalXP = document.querySelector("#petTotalXP");
const xpToast = document.querySelector("#xpToast");
const petModal = document.querySelector("#petModal");
const petModalClose = document.querySelector("#petModalClose");
const petModalTitle = document.querySelector("#petModalTitle");
const petModalCopy = document.querySelector("#petModalCopy");
const evolutionPreviewGrid = document.querySelector("#evolutionPreviewGrid");
const focusCompleteModal = document.querySelector("#focusCompleteModal");
const focusCompleteCopy = document.querySelector("#focusCompleteCopy");
const focusCompleteXp = document.querySelector("#focusCompleteXp");
const focusCompletePomodoro = document.querySelector("#focusCompletePomodoro");
const focusCompletePetArt = document.querySelector("#focusCompletePetArt");
const focusCompletePetText = document.querySelector("#focusCompletePetText");
const focusCompleteRestHint = document.querySelector("#focusCompleteRestHint");
const startRestFromModalBtn = document.querySelector("#startRestFromModalBtn");
const skipRestFromModalBtn = document.querySelector("#skipRestFromModalBtn");
const reviewDateText = document.querySelector("#reviewDateText");
const reviewCompletedText = document.querySelector("#reviewCompletedText");
const reviewTopSubjectText = document.querySelector("#reviewTopSubjectText");
const reviewUnfinishedText = document.querySelector("#reviewUnfinishedText");
const reviewTomorrowText = document.querySelector("#reviewTomorrowText");
const reviewEncouragementText = document.querySelector("#reviewEncouragementText");
const reviewAdoptBtn = document.querySelector("#reviewAdoptBtn");
const restTypeLabel = document.querySelector("#restTypeLabel");
const restCopy = document.querySelector("#restCopy");
const appRoot = document.querySelector("#appRoot");
const authGate = document.querySelector("#authGate");
const authGateForm = document.querySelector("#authGateForm");
const authGateStatus = document.querySelector("#authGateStatus");
const authGateSubmit = document.querySelector("#authGateSubmit");
const gateLoginTab = document.querySelector("#gateLoginTab");
const gateRegisterTab = document.querySelector("#gateRegisterTab");
const gateNameField = document.querySelector("#gateNameField");
const gateEmailInput = document.querySelector("#gateEmailInput");
const gatePasswordInput = document.querySelector("#gatePasswordInput");
const gateNameInput = document.querySelector("#gateNameInput");
const authLocalEntry = document.querySelector("#authLocalEntry");
const authGateEyebrow = document.querySelector("#authGateEyebrow");
const authGateHeading = document.querySelector("#authGateHeading");
const settingsDrawer = document.querySelector("#settingsDrawer");
const settingsDrawerMount = document.querySelector("#settingsDrawerMount");
const openSettingsBtn = document.querySelector("#openSettingsBtn");
const closeSettingsBtn = document.querySelector("#closeSettingsBtn");
const AUTH_LOCAL_SESSION_KEY = "kaoyanLocalSessionAccess";

let authSession = loadAuthSession();
let localAccessGranted = loadLocalAccessState();
const apiRequest = createApiClient({ getToken: () => authSession?.token });
let authPanel = null;
let authForm = null;
let authMode = "login";
let syncStatus = null;
let manualSyncButton = null;
let lastSyncText = null;
let cloudStatsPanel = null;
let studyGoalsPanel = null;
let aiSummaryPanel = null;
let studyDiagnosisPanel = null;
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
let timerEndsAt = 0;
let audioContext = null;
let activeSwipe = null;
let taskToastTimer = null;
let taskToastUndoCallback = null;
let recentlyCompletedTaskId = "";
let pendingRestType = "";
let isHomePlanExpanded = false;

let todayData = loadTodayData();
let dailyPlans = loadDailyPlans();
let studyGoals = loadStudyGoals();
let deletedCloudTaskIds = loadDeletedCloudTaskIds();

MODES.focus.minutes = todayData.focusDuration;
MODES.rest.minutes = getRestMinutes();
remainingSeconds = MODES.focus.minutes * 60;
restoreActiveTimerState();
focusDurationInput.value = todayData.focusDuration;
restDurationSelect.value = normalizeRestType(todayData.nextRestType);
goalInput.value = todayData.dailyGoal;
applyTheme(todayData.theme);
setupTodayPageLayout();
render();
switchPage(getPageFromLocation(), { fromHistory: true });
setupAuthGateUI();
setupAuthUI();
setupAiSummaryUI();
setupCloudStatsUI();
setupStudyGoalsUI();
setupStudyDiagnosisUI();
setupCurrentGoalUI();
placeDataUtilitiesLast();
refreshAuthUI();
bootstrapCloudSession();

startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", pauseTimer);
resetBtn.addEventListener("click", resetTimer);
abandonBtn.addEventListener("click", abandonCurrentRound);
clearRecordsBtn.addEventListener("click", clearTodayRecords);
profileClearRecordsBtn?.addEventListener("click", clearTodayRecords);
themeToggle.addEventListener("click", toggleTheme);
profileThemeBtn?.addEventListener("click", toggleTheme);
homeFocusBtn?.addEventListener("click", startNextHomeFocus);
homeAddTaskBtn?.addEventListener("click", () => {
  switchPage("tasks");
  newTaskInput.focus();
});
homeInsightsBtn?.addEventListener("click", () => switchPage("review"));
profileInsightsBtn?.addEventListener("click", () => switchPage("review"));
focusDurationInput.addEventListener("change", updateFocusDuration);
restDurationSelect.addEventListener("change", updateRestDuration);
currentTaskSelect.addEventListener("change", updateCurrentTaskSelection);
addTaskBtn.addEventListener("click", handleAddTask);
newTaskInput.addEventListener("keydown", handleNewTaskKeydown);
homeQuickTaskBtn?.addEventListener("click", handleHomeQuickTask);
homeQuickTaskInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleHomeQuickTask();
  }
});
carryOverBtn.addEventListener("click", carryOverYesterdayTasks);
planExpandBtn?.addEventListener("click", toggleHomePlanExpanded);
taskToastUndo.addEventListener("click", handleTaskToastUndo);
petShell.addEventListener("click", openPetModal);
petShell.addEventListener("keydown", handlePetShellKeydown);
petModalClose.addEventListener("click", closePetModal);
petModal.addEventListener("click", handlePetModalBackdrop);
focusCompleteModal.addEventListener("click", handleFocusCompleteModalBackdrop);
startRestFromModalBtn.addEventListener("click", startRestFromCompletionModal);
skipRestFromModalBtn.addEventListener("click", skipRestFromCompletionModal);
reviewAdoptBtn?.addEventListener("click", adoptReviewTomorrowTask);
document.addEventListener("keydown", handleDocumentKeydown);
openSettingsBtn?.addEventListener("click", openSettingsDrawer);
closeSettingsBtn?.addEventListener("click", closeSettingsDrawer);
settingsDrawer?.addEventListener("click", (event) => {
  if (event.target === settingsDrawer) {
    closeSettingsDrawer();
  }
});
document.addEventListener("visibilitychange", () => {
  if (timerId !== null) {
    updateCountdownFromClock();
  }
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
    switchPage(button.dataset.pageTarget, { pushHistory: true });
  });
});

window.addEventListener("popstate", () => {
  switchPage(getPageFromLocation(), { fromHistory: true });
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js");
  });
}

function setupTodayPageLayout() {
  const planCard = document.querySelector(".plan-card");
  const recordsCard = document.querySelector(".records-card");

  if (todayTaskMount && planCard && planCard.parentElement !== todayTaskMount) {
    todayTaskMount.appendChild(planCard);
  }

  if (todayTimerMount && timerCard && timerCard.parentElement !== todayTimerMount) {
    todayTimerMount.appendChild(timerCard);
  }

  const reviewPage = document.querySelector('.app-page[data-page="review"]');

  if (reviewPage && recordsCard && recordsCard.parentElement !== reviewPage) {
    const recordsDisclosure = document.createElement("details");
    recordsDisclosure.className = "review-records-disclosure";
    recordsDisclosure.innerHTML = "<summary>今日学习记录</summary>";
    recordsDisclosure.appendChild(recordsCard);
    reviewPage.appendChild(recordsDisclosure);
  }

}

function placeDataUtilitiesLast() {
  const accountMount = document.querySelector("#accountMount");
  const settingsCard = document.querySelector(".settings-card");

  if (!settingsDrawerMount) {
    return;
  }

  if (accountMount) {
    settingsDrawerMount.appendChild(accountMount);
  }

  if (settingsCard) {
    settingsDrawerMount.appendChild(settingsCard);
  }

  if (studyGoalsPanel) {
    const goalsDisclosure = document.createElement("details");
    goalsDisclosure.className = "settings-goals-disclosure";
    goalsDisclosure.innerHTML = "<summary>长期学习目标</summary>";
    goalsDisclosure.appendChild(studyGoalsPanel);
    settingsDrawerMount.appendChild(goalsDisclosure);
  }
}

function openSettingsDrawer() {
  settingsDrawer.hidden = false;
  settingsDrawer.inert = false;
  settingsDrawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("drawer-open");
  closeSettingsBtn.focus();
}

function closeSettingsDrawer() {
  settingsDrawer.setAttribute("aria-hidden", "true");
  settingsDrawer.inert = true;
  settingsDrawer.hidden = true;
  document.body.classList.remove("drawer-open");
  openSettingsBtn?.focus();
}

function setupAuthGateUI() {
  if (!authGateForm) {
    return;
  }

  gateLoginTab.addEventListener("click", () => setAuthMode("login"));
  gateRegisterTab.addEventListener("click", () => setAuthMode("register"));
  authGateForm.addEventListener("submit", handleAuthGateSubmit);
  authLocalEntry.addEventListener("click", enterLocalMode);
}

function refreshAuthGateUI() {
  if (!authGate || !appRoot) {
    return;
  }

  const gateIsOpen = !authSession?.token && !localAccessGranted;
  authGate.hidden = !gateIsOpen;
  authGate.inert = !gateIsOpen;
  appRoot.inert = gateIsOpen;
  appRoot.setAttribute("aria-hidden", String(gateIsOpen));
  document.body.classList.remove("auth-pending");
  document.body.classList.toggle("auth-locked", gateIsOpen);

  gateLoginTab.classList.toggle("active", authMode === "login");
  gateRegisterTab.classList.toggle("active", authMode === "register");
  gateLoginTab.setAttribute("aria-pressed", String(authMode === "login"));
  gateRegisterTab.setAttribute("aria-pressed", String(authMode === "register"));
  gateNameField.hidden = authMode !== "register";
  gatePasswordInput.autocomplete = authMode === "register" ? "new-password" : "current-password";
  authGateSubmit.textContent = authMode === "register" ? "注册并开始学习" : "登录并同步";
  authGateEyebrow.textContent = authMode === "register" ? "建立你的学习档案" : "欢迎回来";
  authGateHeading.textContent = authMode === "register" ? "从第一轮番茄开始积累" : "继续今天的复习节奏";
}

function setAuthMode(mode) {
  authMode = mode === "register" ? "register" : "login";
  refreshAuthUI();
}

function enterLocalMode() {
  localAccessGranted = true;

  try {
    sessionStorage.setItem(AUTH_LOCAL_SESSION_KEY, "true");
  } catch (error) {
    // Session storage may be unavailable in strict privacy modes.
  }

  refreshAuthUI();
  switchPage("home");
  window.setTimeout(() => homeQuickTaskInput?.focus(), 120);
}

function loadLocalAccessState() {
  try {
    return sessionStorage.getItem(AUTH_LOCAL_SESSION_KEY) === "true";
  } catch (error) {
    return false;
  }
}

function clearLocalAccessState() {
  try {
    sessionStorage.removeItem(AUTH_LOCAL_SESSION_KEY);
  } catch (error) {
    // Session storage may be unavailable in strict privacy modes.
  }
}

function setupAuthUI() {
  const mount = document.querySelector("#accountMount") || document.querySelector(".hero");

  if (!mount) {
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

  mount.appendChild(authPanel);
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
  refreshAuthGateUI();

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
  setAuthMode(authMode === "login" ? "register" : "login");
}

async function handleAuthGateSubmit(event) {
  event.preventDefault();

  await authenticateCredentials({
    email: gateEmailInput.value.trim(),
    password: gatePasswordInput.value,
    displayName: gateNameInput.value.trim()
  });
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  const email = authPanel.querySelector("#authEmailInput").value.trim();
  const password = authPanel.querySelector("#authPasswordInput").value;
  const displayName = authPanel.querySelector("#authNameInput").value.trim();

  await authenticateCredentials({ email, password, displayName });
}

async function authenticateCredentials({ email, password, displayName }) {
  if (!email || password.length < 8) {
    setAuthFeedback("请输入有效邮箱和至少 8 位密码", true);
    return;
  }

  const submitButtons = [authGateSubmit, authPanel?.querySelector("#authSubmitBtn")].filter(Boolean);
  submitButtons.forEach((button) => {
    button.disabled = true;
  });

  try {
    setAuthFeedback(authMode === "register" ? "正在创建账号..." : "正在登录...");
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
    localAccessGranted = false;
    clearLocalAccessState();
    saveAuthSession();
    refreshAuthUI();
    await performFullCloudSync("正在同步本地与云端...", {
      cloudFirst: authMode === "login"
    });
    gatePasswordInput.value = "";
    setAuthFeedback("登录成功，学习记录已同步");
  } catch (error) {
    setAuthFeedback(error.message, true);
  } finally {
    submitButtons.forEach((button) => {
      button.disabled = false;
    });
  }
}

function setAuthFeedback(message, isError = false) {
  setSyncStatus(message, isError);

  if (authGateStatus) {
    authGateStatus.textContent = message || "";
    authGateStatus.dataset.error = String(isError);
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
  localAccessGranted = false;
  clearLocalAccessState();
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
    await performFullCloudSync("正在恢复云端同步...", { cloudFirst: true });
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

async function performFullCloudSync(message = "正在同步...", options = {}) {
  if (!isCloudSyncEnabled()) {
    return;
  }

  try {
    if (manualSyncButton) {
      manualSyncButton.disabled = true;
    }

    setSyncStatus(message);
    if (options.cloudFirst) {
      await pullCloudState();
      await syncLocalStateToCloud();
      await pullCloudState();
    } else {
      await syncLocalStateToCloud();
      await pullCloudState();
    }
    await fetchCloudStats(cloudStats.range, { silent: true });
    await loadStoredAiSummary();
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
  const insightsPage = document.querySelector('.app-page[data-page="data"]');

  if (!insightsPage) {
    return;
  }

  cloudStatsPanel = document.createElement("details");
  cloudStatsPanel.className = "card cloud-stats-card";
  cloudStatsPanel.innerHTML = `
    <summary class="cloud-stats-summary-toggle">
      <span>长期趋势</span>
      <small>按需查看</small>
    </summary>
    <div class="cloud-stats-content">
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
    <details class="stats-heatmap-wrap">
      <summary class="stats-heatmap-head">
        <strong>近 30 天稳定度</strong>
        <span id="statsHeatmapCaption">登录后生成学习热力图</span>
      </summary>
      <div class="stats-heatmap" id="statsHeatmap" aria-label="近 30 天学习热力图"></div>
    </details>
    </div>
  `;

  insightsPage.appendChild(cloudStatsPanel);
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

function setupStudyDiagnosisUI() {
  const dataPage = document.querySelector('.app-page[data-page="data"]');

  if (!dataPage) {
    return;
  }

  studyDiagnosisPanel = document.createElement("section");
  studyDiagnosisPanel.className = "card study-diagnosis-card";
  studyDiagnosisPanel.innerHTML = `
    <div class="section-title">
      <div>
        <p class="stats-kicker">节奏诊断</p>
        <h2>今天的问题在哪里</h2>
      </div>
      <span class="diagnosis-chip">直接一点</span>
    </div>
    <details class="diagnosis-details">
      <summary>查看具体诊断</summary>
      <div class="diagnosis-list" id="studyDiagnosisList"></div>
    </details>
  `;

  dataPage.insertBefore(studyDiagnosisPanel, cloudStatsPanel || dataPage.children[1] || null);
  renderStudyDiagnosis();
}

function renderStudyDiagnosis() {
  if (!studyDiagnosisPanel) {
    return;
  }

  const list = studyDiagnosisPanel.querySelector("#studyDiagnosisList");
  list.innerHTML = buildStudyDiagnostics({
    todayData,
    todayTasks: getTodayTasks(),
    recentPlans: getRecentPlanSummaries(7),
    studyGoals,
    inferSubject,
    escapeHtml
  });
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
  const insightsPage = document.querySelector('.app-page[data-page="review"]');

  if (!insightsPage) {
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

  insightsPage.insertBefore(aiSummaryPanel, insightsPage.querySelector(".review-card"));
  aiSummaryPanel.querySelector("#aiSummaryGenerate").addEventListener("click", () => fetchDailyAiSummary({ force: true }));
  renderAiSummary();
}

async function loadStoredAiSummary() {
  if (!isCloudSyncEnabled()) {
    return;
  }

  try {
    const data = await apiRequest(`/api/ai/daily-summary?dateKey=${encodeURIComponent(getTodayKey())}`);
    aiSummary = {
      status: "ready",
      data: data.summary,
      error: "",
      generatedAt: data.generatedAt || ""
    };
  } catch (error) {
    if (error.code !== "AI_SUMMARY_NOT_FOUND" && error.status !== 404) {
      console.warn(error);
    }
  }

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
      body: {
        dateKey: getTodayKey(),
        force: options.force === true
      }
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
        ? "AI 复盘尚未开启。配置好服务端 AI Key 后，这里会自动生成当天总结和明日建议。"
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
  const localReviewCard = document.querySelector(".review-card");
  button.disabled = aiSummary.status === "loading" || !isCloudSyncEnabled();

  if (localReviewCard) {
    localReviewCard.hidden = Boolean(aiSummary.data);
  }

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
  const suggestions = getAiTomorrowSuggestions();
  const adoptionState = getAiTomorrowAdoptionState(suggestions);
  const adoptButtonText = adoptionState.total === 0
    ? "暂无可采纳建议"
    : (adoptionState.remaining === 0 ? "明日建议已加入任务" : `采纳 ${adoptionState.remaining} 条明日建议`);

  body.innerHTML = `
    <article class="ai-summary-main">
      <h3>${escapeHtml(aiSummary.data.title)}</h3>
      <p>${escapeHtml(aiSummary.data.todaySummary)}</p>
    </article>
    ${renderAiSummaryList("亮点", aiSummary.data.highlights, escapeHtml)}
    ${renderAiSummaryList("风险提醒", aiSummary.data.risks, escapeHtml)}
    ${renderAiSummaryList("明日建议", aiSummary.data.tomorrowPlan, escapeHtml)}
    <blockquote class="ai-summary-encouragement">${escapeHtml(aiSummary.data.encouragement)}</blockquote>
    <button class="secondary-btn ai-summary-adopt" id="aiSummaryAdoptBtn" type="button">${escapeHtml(adoptButtonText)}</button>
  `;

  const adoptButton = body.querySelector("#aiSummaryAdoptBtn");
  if (adoptButton) {
    adoptButton.disabled = adoptionState.total === 0 || adoptionState.remaining === 0;
    adoptButton.addEventListener("click", adoptAiTomorrowPlan);
  }
}

function adoptAiTomorrowPlan() {
  const suggestions = getAiTomorrowSuggestions();

  if (suggestions.length === 0) {
    showTaskToast("AI 还没有给出可采纳的明日建议。");
    return;
  }

  const tomorrowKey = getTomorrowKey();
  let addedCount = 0;

  suggestions.forEach((suggestion) => {
    const task = addTaskToDate(tomorrowKey, suggestion, {
      source: "ai",
      sourceDateKey: getTodayKey(),
      sourceLabel: "AI 明日建议",
      aiGeneratedAt: aiSummary.generatedAt || new Date().toISOString(),
      suggestedForDate: tomorrowKey
    });

    if (!task) {
      return;
    }

    addedCount += 1;
  });

  saveDailyPlans();
  renderAiSummary();

  if (addedCount === 0) {
    showTaskToast("明日任务里已经有这些建议了。");
    return;
  }

  showTaskToast(`已采纳 ${addedCount} 条 AI 建议，明天首页会自动出现。`);
  runCloudSync(uploadLocalTasksToCloud);
}

function getAiTomorrowSuggestions() {
  return Array.isArray(aiSummary.data?.tomorrowPlan)
    ? aiSummary.data.tomorrowPlan.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

function getAiTomorrowAdoptionState(suggestions) {
  const tomorrowTasks = Array.isArray(dailyPlans[getTomorrowKey()]) ? dailyPlans[getTomorrowKey()] : [];
  const existingTitles = new Set(tomorrowTasks.map((task) => task.title.trim().toLowerCase()));
  const total = suggestions.length;
  const remaining = suggestions.filter((suggestion) => {
    return !existingTitles.has(suggestion.slice(0, 60).toLowerCase());
  }).length;

  return { total, remaining };
}

function adoptReviewTomorrowTask() {
  const task = getReviewTomorrowTask();

  if (!task) {
    showTaskToast("暂无可采纳的明日任务，先完成一轮专注再复盘。");
    return;
  }

  const tomorrowTask = addTaskToDate(getTomorrowKey(), task.title, {
    source: "review",
    sourceDateKey: getTodayKey(),
    sourceLabel: "复盘建议",
    carriedFromId: task.id
  });

  if (!tomorrowTask) {
    showTaskToast("明日任务里已经有这件事了。");
    return;
  }

  saveDailyPlans();
  renderReviewPage();
  showTaskToast("已加入明日任务。");
  runCloudSync(async () => {
    const created = await createTaskInCloud(tomorrowTask, getTomorrowKey());
    applyCreatedCloudTask(tomorrowTask, created.task);
    saveDailyPlans();
    renderReviewPage();
  });
}

function addTaskToDate(dateKey, title, metadata = {}) {
  const cleanTitle = String(title).trim().slice(0, 60);

  if (!cleanTitle) {
    return null;
  }

  dailyPlans[dateKey] = Array.isArray(dailyPlans[dateKey]) ? dailyPlans[dateKey] : [];
  const existingTask = dailyPlans[dateKey].find((task) => {
    const sameSource = metadata.carriedFromId && task.carriedFromId === metadata.carriedFromId;
    const sameTitle = task.title.trim().toLowerCase() === cleanTitle.toLowerCase();
    return sameSource || sameTitle;
  });

  if (existingTask) {
    return null;
  }

  const task = normalizeTask({
    id: createTaskId(),
    clientId: "",
    syncedTaskId: "",
    title: cleanTitle,
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
    ...metadata
  });

  if (!task) {
    return null;
  }

  if (metadata.source === "ai") {
    const aiPriorityCount = dailyPlans[dateKey].filter((item) => !item.completed && item.source === "ai").length;
    dailyPlans[dateKey].splice(Math.min(aiPriorityCount, 3), 0, task);
  } else {
    dailyPlans[dateKey].push(task);
  }

  return task;
}

function getReviewTomorrowTask() {
  return getTodayTasks().find((task) => !task.completed) || null;
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
  const insightsPage = document.querySelector('.app-page[data-page="data"]');

  if (!insightsPage) {
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

  insightsPage.appendChild(studyGoalsPanel);
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

  if (!goal || !window.confirm(`确定删除目标「${goal.title}」吗？`)) {
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
  const settingsBody = document.querySelector(".focus-round-settings-body");

  if (!settingsBody) {
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "current-goal-setting";
  wrapper.innerHTML = `
    <label for="currentGoalSelect">当前目标</label>
    <select id="currentGoalSelect" aria-label="选择当前学习目标"></select>
  `;
  settingsBody.appendChild(wrapper);
  currentGoalSelect = wrapper.querySelector("#currentGoalSelect");
  currentGoalSelect.addEventListener("change", updateCurrentGoalSelection);
  updateCurrentGoalOptions();
}

function startNextHomeFocus() {
  const nextTask = getTodayTasks().find((task) => !task.completed);

  if (nextTask) {
    focusTask(nextTask.id);
    return;
  }

  switchPage("home");
}

function focusTask(taskId) {
  const task = getTodayTasks().find((item) => item.id === taskId);

  if (task && !task.completed) {
    todayData.currentTaskId = task.id;
    todayData.currentTask = task.title;
    saveTodayData();
    updateCurrentTaskOptions();
    renderTaskPage();
    renderHomePage();
    updateStartButtonState();
    runCloudSync(syncSettingsToCloud);
  }

  switchPage("home");
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

  await flushDeletedCloudTasks();
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
        dateKey: record.dateKey || getDateKey(new Date(record.endedAt)),
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
      carriedFromId: task.carriedFromId || null,
      source: task.source || "",
      sourceLabel: task.sourceLabel || "",
      sourceDateKey: task.sourceDateKey || "",
      suggestedForDate: task.suggestedForDate || "",
      aiGeneratedAt: task.aiGeneratedAt || ""
    }
  });
}

function applyCreatedCloudTask(localTask, cloudTask) {
  const previousId = localTask.id;
  const normalizedTask = normalizeTask({
    ...cloudTask,
    clientId: cloudTask.clientId || localTask.clientId || localTask.id,
    syncedTaskId: cloudTask.id,
    xpEarned: cloudTask.xpEarned ?? localTask.xpEarned,
    source: cloudTask.source || localTask.source,
    sourceLabel: cloudTask.sourceLabel || localTask.sourceLabel,
    sourceDateKey: cloudTask.sourceDateKey || localTask.sourceDateKey,
    suggestedForDate: cloudTask.suggestedForDate || localTask.suggestedForDate,
    aiGeneratedAt: cloudTask.aiGeneratedAt || localTask.aiGeneratedAt
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
  restDurationSelect.value = todayData.nextRestType;
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
  todayData.todayPetXP = normalizeTodayPetXP(todayData.todayPetXP, todayData.petProgress.totalXP);
  saveTodayData(false);
}

function applyCloudTasks(tasks) {
  if (!Array.isArray(tasks)) {
    return;
  }

  const localTaskMetadata = buildLocalTaskMetadataIndex();
  const cloudPlans = tasks.filter((task) => !deletedCloudTaskIds.has(task.id)).reduce((plans, task) => {
    const dateKey = task.dateKey || getTodayKey();
    const metadata = findLocalTaskMetadata(localTaskMetadata, dateKey, task);

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
      carriedFromId: task.carriedFromId ?? metadata?.carriedFromId,
      xpEarned: metadata?.xpEarned,
      source: task.source || metadata?.source,
      sourceLabel: task.sourceLabel || metadata?.sourceLabel,
      sourceDateKey: task.sourceDateKey || metadata?.sourceDateKey,
      suggestedForDate: task.suggestedForDate || metadata?.suggestedForDate,
      aiGeneratedAt: task.aiGeneratedAt || metadata?.aiGeneratedAt
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

function buildLocalTaskMetadataIndex() {
  const index = new Map();

  Object.entries(dailyPlans).forEach(([dateKey, tasks]) => {
    tasks.forEach((task) => {
      const keys = [
        task.syncedTaskId,
        task.clientId,
        task.id,
        `${dateKey}:${task.title.trim().toLowerCase()}`
      ].filter(Boolean);

      keys.forEach((key) => {
        index.set(key, task);
      });
    });
  });

  return index;
}

function findLocalTaskMetadata(index, dateKey, task) {
  return index.get(task.id)
    || index.get(task.clientId)
    || index.get(`${dateKey}:${String(task.title || "").trim().toLowerCase()}`)
    || null;
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
    .filter((session) => session.mode === "focus" && (session.dateKey || getDateKey(new Date(session.endedAt))) === todayKey)
    .map(focusSessionToRecord);
  const cloudRecordKeys = new Set(cloudRecords.map(getFocusRecordKey));
  const localUnsyncedRecords = todayData.records
    .filter((record) => !record.syncedSessionId && (record.dateKey || getDateKey(new Date(record.endedAt))) === todayKey)
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
    endedAt,
    dateKey: session.dateKey || getDateKey(endedDate)
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

  if (currentMode === "focus") {
    const focusTask = ensureStartableFocusTask();

    if (!focusTask) {
      statusText.textContent = "先写下今天要完成的一件事。";
      newTaskInput.focus();
      return;
    }
  }

  unlockAudio();
  requestNotificationPermission();
  statusText.textContent = currentMode === "focus"
    ? "专注进行中，你的宠物正在积累成长能量。"
    : "休息进行中，恢复也是学习的一部分。";

  timerEndsAt = createTimerDeadline(remainingSeconds);
  timerId = setInterval(updateCountdownFromClock, 500);
  persistActiveTimerState();
  updateStartButtonState();
}

function updateCountdownFromClock() {
  if (timerId === null || !timerEndsAt) {
    return;
  }

  const nextRemainingSeconds = getRemainingSeconds(timerEndsAt);

  if (nextRemainingSeconds === remainingSeconds) {
    return;
  }

  remainingSeconds = nextRemainingSeconds;

  if (remainingSeconds <= 0) {
    finishCurrentMode();
    return;
  }

  renderTimerAndProgress();
}

function pauseTimer() {
  if (timerId === null) {
    return;
  }

  remainingSeconds = timerEndsAt
    ? getRemainingSeconds(timerEndsAt)
    : remainingSeconds;
  clearInterval(timerId);
  timerId = null;
  timerEndsAt = 0;
  clearActiveTimerState();
  updateStartButtonState();

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

function abandonCurrentRound() {
  if (currentMode === "focus" && timerId !== null) {
    const confirmed = window.confirm("确定放弃本轮专注吗？本轮不会获得 XP，也不会写入学习记录。");

    if (!confirmed) {
      return;
    }
  }

  resetTimer();
}

function switchMode(mode) {
  if (!MODES[mode]) {
    return;
  }

  closeFocusCompleteModal();
  pendingRestType = "";

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

function updateRestDuration() {
  setRestType(restDurationSelect.value);
  saveTodayData();

  if (currentMode === "rest" && timerId === null) {
    remainingSeconds = MODES.rest.minutes * 60;
  }

  render();
  runCloudSync(syncSettingsToCloud);
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

function getTomorrowKey() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getRecentPlanSummaries(days = 7) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - index - 1));
    const dateKey = getDateKey(date);
    const tasks = Array.isArray(dailyPlans[dateKey]) ? dailyPlans[dateKey] : [];
    const isToday = dateKey === getTodayKey();

    return {
      dateKey,
      totalTasks: tasks.length,
      completedTasks: tasks.filter((task) => task.completed).length,
      focusMinutes: isToday ? todayData.focusMinutes : 0
    };
  });
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
  todayData.currentTaskId = task.id;
  todayData.currentTask = task.title;

  saveDailyPlans();
  saveTodayData();
  renderTaskPage();
  updateCurrentTaskOptions();
  renderHomePage();
  renderReviewPage();
  updateStartButtonState();
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

  if (!task || !window.confirm(`确定删除任务「${task.title}」吗？`)) {
    return;
  }

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
    rememberDeletedCloudTask(task.syncedTaskId);
    runCloudSync(() => deleteCloudTask(task.syncedTaskId));
  }
}

function loadDeletedCloudTaskIds() {
  try {
    const saved = JSON.parse(localStorage.getItem(DELETED_TASKS_KEY));
    return new Set(Array.isArray(saved) ? saved.filter((id) => typeof id === "string" && id) : []);
  } catch (error) {
    return new Set();
  }
}

function saveDeletedCloudTaskIds() {
  localStorage.setItem(DELETED_TASKS_KEY, JSON.stringify([...deletedCloudTaskIds]));
}

function rememberDeletedCloudTask(taskId) {
  deletedCloudTaskIds.add(taskId);
  saveDeletedCloudTaskIds();
}

function forgetDeletedCloudTask(taskId) {
  deletedCloudTaskIds.delete(taskId);
  saveDeletedCloudTaskIds();
}

async function deleteCloudTask(taskId) {
  try {
    await apiRequest(`/api/tasks/${taskId}`, { method: "DELETE" });
    forgetDeletedCloudTask(taskId);
  } catch (error) {
    if (error.status === 404) {
      forgetDeletedCloudTask(taskId);
      return;
    }

    throw error;
  }
}

async function flushDeletedCloudTasks() {
  for (const taskId of [...deletedCloudTaskIds]) {
    await deleteCloudTask(taskId);
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
  renderCarryOverBanner();
  renderTasksPageView({
    elements: {
      todayDateText,
      planProgressText,
      taskList
    },
    tasks,
    renderTaskCard,
    formatPlanDate,
    currentTaskId: todayData.currentTaskId
  });
  renderHomePlanExpansion();
}

function toggleHomePlanExpanded() {
  isHomePlanExpanded = !isHomePlanExpanded;
  renderHomePlanExpansion();
}

function renderHomePlanExpansion() {
  document.body.classList.toggle("show-full-plan", isHomePlanExpanded);

  if (planExpandBtn) {
    planExpandBtn.textContent = isHomePlanExpanded ? "收起为三件大事" : "展开完整计划";
  }
}

function renderTaskCard(task) {
  const item = document.createElement("li");
  const completedTime = task.completedAt ? formatTaskCompletedTime(task.completedAt) : "";

  item.className = "plan-task-item";
  item.dataset.completed = String(task.completed);
  item.dataset.taskId = task.id;
  item.innerHTML = buildTaskCardHtml({
    task,
    completedTime,
    escapeHtml,
    sourceLabel: getTaskSourceLabel(task)
  });

  if (!task.completed && task.id === todayData.currentTaskId) {
    item.classList.add("is-current-task");
  }

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
  item.querySelectorAll('[data-action="delete"]').forEach((button) => {
    button.addEventListener("click", () => deleteTask(task.id));
  });

  if (task.completed) {
    item.querySelector('[data-action="restore"]').addEventListener("click", () => undoCompleteTask(task.id));
  } else {
    const front = item.querySelector(".task-card-front");

    front.addEventListener("click", (event) => {
      if (front.dataset.ignoreClick === "true" || event.target.closest("button, summary, details")) {
        return;
      }

      focusTask(task.id);
    });
    front.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      if (event.target.closest("button, summary, details")) {
        return;
      }

      event.preventDefault();
      focusTask(task.id);
    });
    initSwipeTaskCard(item, task);
  }

  return item;
}

function getTaskSourceLabel(task) {
  if (task.source === "ai") {
    return task.sourceLabel || "AI 建议";
  }

  if (task.source === "review") {
    return task.sourceLabel || "复盘建议";
  }

  return "";
}

function updateCurrentTaskOptions() {
  const unfinishedTasks = sortExecutableTasks(getTodayTasks().filter((task) => !task.completed));
  const selectedTaskExists = unfinishedTasks.some((task) => task.id === todayData.currentTaskId);

  if (todayData.currentTaskId && !selectedTaskExists) {
    todayData.currentTaskId = "";
    todayData.currentTask = "";
    saveTodayData();
  }

  if (!todayData.currentTaskId && unfinishedTasks.length > 0 && timerId === null && currentMode === "focus") {
    todayData.currentTaskId = unfinishedTasks[0].id;
    todayData.currentTask = unfinishedTasks[0].title;
    saveTodayData();
  }

  currentTaskSelect.innerHTML = "";
  currentTaskSelect.appendChild(createTaskOption("", unfinishedTasks.length ? "暂未选择任务" : "暂无未完成任务"));

  unfinishedTasks.forEach((task) => {
    currentTaskSelect.appendChild(createTaskOption(task.id, task.title));
  });

  currentTaskSelect.value = todayData.currentTaskId || "";
}

function sortExecutableTasks(tasks) {
  return [...tasks].sort((first, second) => {
    const firstIsCurrent = first.id === todayData.currentTaskId;
    const secondIsCurrent = second.id === todayData.currentTaskId;

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
  if (task.completed || event.target.closest("button, summary, details")) {
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

    if (Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
      activeSwipe.isDragging = true;
      activeSwipe.cardElement.classList.add("is-swiping");
    }
  }

  if (!activeSwipe.isDragging) {
    return;
  }

  event.preventDefault();
  const maxSwipe = activeSwipe.cardElement.offsetWidth * 0.55;
  activeSwipe.deltaX = Math.max(-maxSwipe, Math.min(deltaX, maxSwipe));
  scheduleSwipeFrame();
}

function handleTaskPointerUp(event, task) {
  if (!activeSwipe || activeSwipe.taskId !== task.id) {
    return;
  }

  const threshold = activeSwipe.cardElement.offsetWidth * 0.35;
  const shouldComplete = activeSwipe.isDragging && activeSwipe.deltaX <= -threshold;
  const shouldDelay = activeSwipe.isDragging && activeSwipe.deltaX >= threshold;
  const swipe = activeSwipe;

  swipe.front.releasePointerCapture?.(event.pointerId);

  if (shouldComplete) {
    swipe.front.style.transition = "transform 0.18s ease";
    swipe.front.style.transform = `translateX(${-Math.min(96, swipe.cardElement.offsetWidth * 0.42)}px)`;
    swipe.cardElement.classList.add("is-completing");
    window.setTimeout(() => completeTaskWithAnimation(task.id), 150);
  } else if (shouldDelay) {
    swipe.front.style.transition = "transform 0.18s ease";
    swipe.front.style.transform = `translateX(${Math.min(96, swipe.cardElement.offsetWidth * 0.42)}px)`;
    swipe.cardElement.classList.add("is-delaying");
    window.setTimeout(() => delayTaskToTomorrow(task.id), 150);
  } else {
    resetSwipeCard(swipe);
  }

  if (swipe.isDragging) {
    swipe.front.dataset.ignoreClick = "true";
    window.setTimeout(() => {
      delete swipe.front.dataset.ignoreClick;
    }, 220);
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
  swipe.cardElement.classList.remove("is-swiping", "is-completing", "is-delaying");
}

function completeTaskWithAnimation(taskId) {
  const task = getTodayTasks().find((item) => item.id === taskId);

  if (!task || task.completed) {
    return;
  }

  task.completed = true;
  task.completedAt = new Date().toISOString();
  recentlyCompletedTaskId = task.id;
  const xpResult = addPetXP(10);
  task.xpEarned = xpResult.totalXP;
  vibrateTaskDone();

  if (todayData.currentTaskId === task.id) {
    todayData.currentTaskId = "";
    todayData.currentTask = "";
    saveTodayData();
  }

  saveDailyPlans();
  saveTodayData();
  renderTaskPage();
  updateCurrentTaskOptions();
  updatePetUI();
  renderHomePage();
  renderReviewPage();
  updateStartButtonState();
  runCloudSync(async () => {
    await syncTaskPatch(task, { completed: true });
    await syncPetToCloud();
  });
  showTaskToast(`任务完成！宠物获得 +${xpResult.totalXP} XP`, () => undoCompleteTask(task.id));
  switchPage("review");
}

function delayTaskToTomorrow(taskId) {
  const todayKey = getTodayKey();
  const tomorrowKey = getTomorrowKey();
  const todayTasks = getTodayTasks();
  const task = todayTasks.find((item) => item.id === taskId);

  if (!task || task.completed) {
    return;
  }

  dailyPlans[todayKey] = todayTasks.filter((item) => item.id !== taskId);
  dailyPlans[tomorrowKey] = Array.isArray(dailyPlans[tomorrowKey]) ? dailyPlans[tomorrowKey] : [];

  const delayedTask = normalizeTask({
    ...task,
    id: createTaskId(),
    clientId: "",
    syncedTaskId: "",
    completed: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
    carriedFromId: task.id
  });

  if (delayedTask) {
    dailyPlans[tomorrowKey].push(delayedTask);
  }

  if (todayData.currentTaskId === task.id) {
    todayData.currentTaskId = "";
    todayData.currentTask = "";
    saveTodayData();
  }

  saveDailyPlans();
  renderTaskPage();
  updateCurrentTaskOptions();
  renderHomePage();
  renderReviewPage();
  updateStartButtonState();
  vibrateTaskDone();
  showTaskToast("已延期到明天。");
  runCloudSync(async () => {
    if (task.syncedTaskId) {
      await apiRequest(`/api/tasks/${task.syncedTaskId}`, {
        method: "DELETE"
      });
    }

    if (delayedTask) {
      const created = await createTaskInCloud(delayedTask, tomorrowKey);
      applyCreatedCloudTask(delayedTask, created.task);
      saveDailyPlans();
    }
  });
}

function undoCompleteTask(taskId) {
  const task = getTodayTasks().find((item) => item.id === taskId);

  if (!task) {
    return;
  }

  task.completed = false;
  task.completedAt = null;
  const taskXP = normalizeNonNegativeInteger(task.xpEarned);
  task.xpEarned = 0;
  removePetXP(taskXP);
  if (!todayData.currentTaskId) {
    todayData.currentTaskId = task.id;
    todayData.currentTask = task.title;
    saveTodayData();
  }
  recentlyCompletedTaskId = "";
  saveDailyPlans();
  renderTaskPage();
  updateCurrentTaskOptions();
  updatePetUI();
  renderHomePage();
  renderReviewPage();
  updateStartButtonState();
  runCloudSync(async () => {
    await syncTaskPatch(task, { completed: false });
    await syncPetToCloud();
  });
  hideTaskToast();
}

function showTaskToast(message, undoCallback) {
  taskToastText.textContent = message;
  taskToastUndoCallback = undoCallback;
  taskToastUndo.hidden = typeof undoCallback !== "function";
  taskToast.setAttribute("aria-hidden", "false");

  window.clearTimeout(taskToastTimer);
  taskToastTimer = window.setTimeout(hideTaskToast, 3000);
}

function hideTaskToast() {
  taskToast.setAttribute("aria-hidden", "true");
  taskToastUndoCallback = null;
  taskToastUndo.hidden = false;
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

function handleHomeQuickTask() {
  const title = homeQuickTaskInput?.value.trim() || "";

  if (!addTask(title)) {
    homeQuickTaskInput?.focus();
    return;
  }

  homeQuickTaskInput.value = "";
  statusText.textContent = "任务已选好，可以开始这一轮专注。";
  startBtn.focus();
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
  renderHomePage();
  renderReviewPage();
  updateStartButtonState();
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
    xpEarned: normalizeNonNegativeInteger(task.xpEarned),
    carriedFromId: typeof task.carriedFromId === "string" ? task.carriedFromId : undefined,
    source: normalizeTaskSource(task.source),
    sourceLabel: typeof task.sourceLabel === "string" ? task.sourceLabel.slice(0, 24) : "",
    sourceDateKey: typeof task.sourceDateKey === "string" ? task.sourceDateKey : "",
    suggestedForDate: typeof task.suggestedForDate === "string" ? task.suggestedForDate : "",
    aiGeneratedAt: typeof task.aiGeneratedAt === "string" ? task.aiGeneratedAt : ""
  };
}

function normalizeTaskSource(source) {
  return ["ai", "review", "delayed", "carry"].includes(source) ? source : "";
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

function switchPage(pageName, options = {}) {
  const validPages = ["home", "pet", "review", "data"];
  const mappedPageName = ["tasks", "focus"].includes(pageName)
    ? "home"
    : (pageName === "profile" ? "data" : pageName);
  const nextPageName = validPages.includes(mappedPageName) ? mappedPageName : "home";
  const navPageName = nextPageName;

  document.body.dataset.page = nextPageName;

  appPages.forEach((page) => {
    page.classList.toggle("active", page.dataset.page === nextPageName);
  });

  pageButtons.forEach((button) => {
    const isActive = button.dataset.pageTarget === navPageName;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
  });

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (!options.fromHistory) {
    const nextUrl = `${window.location.pathname}${window.location.search}#/${nextPageName}`;

    if (options.pushHistory && window.location.hash !== `#/${nextPageName}`) {
      window.history.pushState({ page: nextPageName }, "", nextUrl);
    } else {
      window.history.replaceState({ page: nextPageName }, "", nextUrl);
    }
  }

  if (nextPageName === "data" && isCloudSyncEnabled() && cloudStats.status === "idle") {
    fetchCloudStats(cloudStats.range);
  }

  if (nextPageName === "review") {
    renderReviewPage();
  }
}

function getPageFromLocation() {
  const pageName = window.location.hash.replace(/^#\/?/, "");
  return ["home", "pet", "review", "data"].includes(pageName) ? pageName : "home";
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

function handleFocusCompleteModalBackdrop(event) {
  if (event.target === focusCompleteModal) {
    skipRestFromCompletionModal();
  }
}

function handleDocumentKeydown(event) {
  if (event.key === "Escape" && settingsDrawer?.getAttribute("aria-hidden") === "false") {
    closeSettingsDrawer();
    return;
  }

  if (event.key === "Escape" && petModal.getAttribute("aria-hidden") === "false") {
    closePetModal();
  }

  if (event.key === "Escape" && focusCompleteModal.getAttribute("aria-hidden") === "false") {
    skipRestFromCompletionModal();
  }
}

function openPetModal() {
  renderEvolutionPreview();
  petModal.inert = false;
  petModal.setAttribute("aria-hidden", "false");
  petModalClose.focus();
}

function closePetModal() {
  petModal.setAttribute("aria-hidden", "true");
  petModal.inert = true;
  petShell.focus();
}

function openFocusCompleteModal(result, nextRestType) {
  const restMinutes = REST_DURATIONS[nextRestType] || REST_DURATIONS.short;
  const progress = todayData.petProgress;
  const petId = normalizePetType(progress.petId || todayData.selectedPet);
  const petType = PET_TYPES[petId];
  const stage = getEvolutionStage(progress.level);
  const levelText = result.leveledUp ? `升级到 Lv.${result.level}` : `${stage.label}继续成长`;
  const evolutionText = result.evolved ? "，解锁了新形态" : "";
  const bonusText = result.bonusPercent > 0 ? `（含连续奖励 +${result.bonusPercent}%）` : "";

  pendingRestType = nextRestType;
  focusCompleteCopy.textContent = buildFocusCompleteMessage(result, nextRestType);
  focusCompleteXp.textContent = `+${result.totalXP} XP${bonusText}`;
  focusCompletePomodoro.textContent = `今日番茄 ${todayData.completedCount} / ${todayData.dailyGoal}`;
  focusCompletePetArt.innerHTML = renderPetImage(petId, stage.id, "choice");
  focusCompletePetText.textContent = `${petType.name}${levelText}${evolutionText}`;
  focusCompleteRestHint.textContent = nextRestType === "long"
    ? `建议长休 ${restMinutes} 分钟`
    : `建议休息 ${restMinutes} 分钟`;
  focusCompleteModal.inert = false;
  focusCompleteModal.setAttribute("aria-hidden", "false");
  startRestFromModalBtn.focus();
}

function closeFocusCompleteModal() {
  focusCompleteModal.setAttribute("aria-hidden", "true");
  focusCompleteModal.inert = true;
}

function startRestFromCompletionModal() {
  const nextRestType = pendingRestType || normalizeRestType(todayData.nextRestType);

  closeFocusCompleteModal();
  setRestType(nextRestType);
  currentMode = "rest";
  remainingSeconds = MODES.rest.minutes * 60;
  statusText.textContent = nextRestType === "long"
    ? "进入长休息。站起来，给大脑一点恢复时间。"
    : "进入休息。放松肩颈，看看远处。";
  render();
}

function skipRestFromCompletionModal() {
  closeFocusCompleteModal();
  pendingRestType = "";
  currentMode = "focus";
  remainingSeconds = MODES.focus.minutes * 60;
  statusText.textContent = "已跳过休息，可以开始下一轮专注。";
  render();
}

function finishCurrentMode(options = {}) {
  pauseTimerSilently();

  if (!options.silent) {
    playFinishSound();
  }

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
          dateKey: focusRecord.dateKey,
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
    if (!options.silent) {
      showNotification("专注完成", `完成 1 个番茄，宠物获得了 ${xpResult.totalXP} XP。`);
    }
    const nextRestType = todayData.completedCount % 4 === 0 ? "long" : "short";
    setRestType(nextRestType);
    render();
    showPetReward(xpResult);
    statusText.textContent = buildFocusCompleteMessage(xpResult, nextRestType);
    openFocusCompleteModal(xpResult, nextRestType);
    return;
  } else {
    if (!options.silent) {
      showNotification("休息结束", "可以回到下一轮专注了。");
    }
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
    endedAt,
    dateKey: getTodayKey()
  });

  saveTodayData();
  return todayData.records[0];
}

function clearTodayRecords() {
  const confirmed = window.confirm("确定清空今日学习记录吗？今日番茄、分钟数和连续计数会归零，宠物总经验会保留。");

  if (!confirmed) {
    return;
  }

  todayData.completedCount = 0;
  todayData.focusMinutes = 0;
  todayData.streak = 0;
  todayData.records = [];
  todayData.todayPetXP = 0;
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
    todayPetXP: 0,
    selectedPet: defaultPetType,
    petProgress: createPetProgress(defaultPetType),
    activeTimer: null
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
        petProgress,
        activeTimer: normalizeActiveTimer(saved.activeTimer)
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
      todayPetXP: normalizeTodayPetXP(saved.todayPetXP ?? inferTodayPetXP(saved.records), petProgress.totalXP),
      selectedPet,
      petProgress,
      activeTimer: normalizeActiveTimer(saved.activeTimer)
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
    endedAt,
    dateKey: typeof record.dateKey === "string" && record.dateKey
      ? record.dateKey
      : getDateKey(new Date(endedAt))
  };
}

function inferTodayPetXP(records) {
  if (!Array.isArray(records)) {
    return 0;
  }

  return records.reduce((total, record) => total + normalizeNonNegativeInteger(record?.xpEarned), 0);
}

function normalizeTodayPetXP(value, totalXP = todayData?.petProgress?.totalXP ?? 0) {
  return Math.min(
    normalizeNonNegativeInteger(value),
    normalizeNonNegativeInteger(totalXP)
  );
}

function render() {
  ensureCurrentTaskSelection();
  renderHomePage();
  renderModePanels();
  renderTimerAndProgress();
  renderModeButtons();
  renderRestPanel();
  renderStats();
  renderGoalProgress();
  renderTaskPage();
  renderReviewPage();
  updateCurrentTaskOptions();
  renderStudyGoals();
  updateCurrentGoalOptions();
  renderRecords();
  renderPetPicker();
  updatePetUI();
  updateStartButtonState();
}

function ensureCurrentTaskSelection() {
  if (timerId !== null || currentMode !== "focus") {
    return;
  }

  const unfinishedTasks = sortExecutableTasks(getTodayTasks().filter((task) => !task.completed));
  const selectedTaskExists = unfinishedTasks.some((task) => task.id === todayData.currentTaskId);
  let changed = false;

  if (todayData.currentTaskId && !selectedTaskExists) {
    todayData.currentTaskId = "";
    todayData.currentTask = "";
    changed = true;
  }

  if (!todayData.currentTaskId && unfinishedTasks.length > 0) {
    todayData.currentTaskId = unfinishedTasks[0].id;
    todayData.currentTask = unfinishedTasks[0].title;
    changed = true;
  }

  if (changed) {
    saveTodayData();
  }
}

function renderHomePage() {
  const tasks = getTodayTasks();
  document.body.classList.toggle("has-no-tasks", tasks.length === 0);
  const progress = todayData.petProgress || createPetProgress(todayData.selectedPet);
  const petId = normalizePetType(progress.petId || todayData.selectedPet);
  const petType = PET_TYPES[petId];
  const evolutionStage = getEvolutionStage(progress.level);
  const xpPercent = Math.min(100, Math.round((progress.currentXP / progress.nextLevelXP) * 100));

  renderHomePageView({
    elements: {
      homeDateText,
      homeTaskProgress,
      homeFocusMinutes,
      homeGoalProgress,
      homeStreakText,
      homePetChip,
      homeNextTaskTitle,
      homeNextTaskHint,
      homeQuickTask
    },
    tasks,
    todayData,
    petName: petType.name,
    petLevel: progress.level,
    formatPlanDate
  });
  renderAiPlanBanner(tasks);

  if (homePetArt) {
    homePetArt.innerHTML = renderPetImage(petId, evolutionStage.id, "choice");
  }

  if (homePetProgressFill) {
    homePetProgressFill.style.width = `${xpPercent}%`;
  }

  if (homePetNextHint) {
    const nextStage = getNextStageProgress(progress);
    homePetNextHint.textContent = nextStage
      ? `距离下一阶段还差 ${nextStage.xp} XP，约 ${nextStage.tomatoes} 个番茄。`
      : "已经是完全体，继续积累长期成长。";
  }
}

function renderAiPlanBanner(tasks) {
  if (!aiPlanBanner) {
    return;
  }

  const aiTasks = tasks.filter((task) => !task.completed && task.source === "ai");

  aiPlanBanner.hidden = aiTasks.length === 0;

  if (aiTasks.length === 0) {
    return;
  }

  aiPlanBannerTitle.textContent = `AI 接上了 ${aiTasks.length} 件今天要做的事`;
  aiPlanBannerText.textContent = aiTasks.length === 1
    ? `建议先做：${aiTasks[0].title}`
    : `建议从「${aiTasks[0].title}」开始，完成后再推进下一件。`;
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
  updateStartButtonState();
}

function updateStartButtonState() {
  const needsTask = currentMode === "focus";
  const hasTask = Boolean(getStartableFocusTask());
  const totalSeconds = MODES[currentMode].minutes * 60;
  const timerState = timerId !== null
    ? "running"
    : (remainingSeconds < totalSeconds ? "paused" : "idle");

  timerCard.dataset.timerState = timerState;
  startBtn.disabled = needsTask && !hasTask;
  startBtn.textContent = timerState === "paused"
    ? "继续"
    : (currentMode === "rest" ? "开始休息" : "开始");

  if (needsTask && !hasTask && timerId === null) {
    statusText.textContent = "先写下今天要完成的一件事";
  }
}

function getStartableFocusTask() {
  if (!todayData.currentTaskId) {
    return null;
  }

  return getTodayTasks().find((task) => task.id === todayData.currentTaskId && !task.completed) || null;
}

function ensureStartableFocusTask() {
  const selectedTask = getStartableFocusTask();

  if (selectedTask) {
    todayData.currentTask = selectedTask.title;
    saveTodayData();
    return selectedTask;
  }

  const nextTask = sortExecutableTasks(getTodayTasks().filter((task) => !task.completed))[0];

  if (!nextTask) {
    todayData.currentTaskId = "";
    todayData.currentTask = "";
    saveTodayData();
    updateCurrentTaskOptions();
    return null;
  }

  todayData.currentTaskId = nextTask.id;
  todayData.currentTask = nextTask.title;
  saveTodayData();
  updateCurrentTaskOptions();
  renderHomePage();
  renderTaskPage();
  return nextTask;
}

function renderModeButtons() {
  modeButtons.forEach((button) => {
    if (button.dataset.mode === "focus") {
      button.textContent = "专注";
    }

    if (button.dataset.mode === "rest") {
      button.textContent = "休息";
    }

    button.classList.toggle("active", button.dataset.mode === currentMode);
  });
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
  renderStudyDiagnosis();
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

function renderReviewPage() {
  if (!reviewCompletedText) {
    return;
  }

  const tasks = getTodayTasks();
  const completedTasks = tasks.filter((task) => task.completed);
  const unfinishedTasks = tasks.filter((task) => !task.completed);
  const focusBySubject = buildFocusBySubject(todayData.records);
  const topSubject = Object.entries(focusBySubject)
    .sort((a, b) => b[1] - a[1])[0];
  const nextTask = getReviewTomorrowTask();

  reviewDateText.textContent = formatPlanDate(new Date());
  reviewCompletedText.textContent = completedTasks.length
    ? completedTasks.slice(0, 3).map((task) => task.title).join("、")
    : (todayData.completedCount > 0 ? `完成了 ${todayData.completedCount} 个番茄钟。` : "今天还没有完成任务，先从一件小事开始。");
  reviewTopSubjectText.textContent = topSubject
    ? `${topSubject[0]}，累计 ${topSubject[1]} 分钟`
    : "暂无专注记录。";
  reviewUnfinishedText.textContent = unfinishedTasks.length
    ? unfinishedTasks.slice(0, 3).map((task) => task.title).join("、")
    : "今天的任务都清掉了。";
  reviewTomorrowText.textContent = nextTask
    ? `优先处理：${nextTask.title}`
    : "明天先安排一件最重要的小任务。";
  reviewEncouragementText.textContent = todayData.completedCount > 0
    ? "稳定推进比临时爆发更可靠，今天的专注已经留下痕迹。"
    : "先写下一件能完成的小事，节奏会从第一个番茄开始。";

  if (reviewAdoptBtn) {
    reviewAdoptBtn.disabled = !nextTask;
    reviewAdoptBtn.textContent = nextTask
      ? "采纳为明日任务"
      : "暂无可采纳任务";
  }
}

function buildFocusBySubject(records) {
  return records.reduce((result, record) => {
    const subject = inferSubject(record.task);
    result[subject] = (result[subject] || 0) + normalizeNonNegativeInteger(record.minutes);
    return result;
  }, {});
}

function inferSubject(title = "") {
  const cleanTitle = String(title).trim();

  if (!cleanTitle) {
    return "未命名任务";
  }

  return cleanTitle.split(/[：:·\-—｜|]/)[0].trim().slice(0, 12) || cleanTitle.slice(0, 12);
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
  const todayXP = normalizeTodayPetXP(todayData.todayPetXP ?? inferTodayPetXP(todayData.records), progress.totalXP);

  petShell.dataset.stage = evolutionStage.state;
  petArt.innerHTML = renderPetImage(petType === undefined ? todayData.selectedPet : progress.petId, evolutionStage.id);
  petStageLabel.textContent = evolutionStage.label;
  petName.textContent = petType.name;
  petLevelLabel.textContent = `Lv.${progress.level}`;
  petStatus.textContent = getPetDescription();
  petProgressFill.style.width = `${xpPercent}%`;
  petXPText.textContent = `当前 ${progress.currentXP} / ${progress.nextLevelXP} XP`;
  const nextStage = getNextStageProgress(progress);
  evolutionHint.textContent = nextStage
    ? `下一阶段还差 ${nextStage.xp} XP / 约 ${nextStage.tomatoes} 个番茄`
    : getEvolutionHint(progress.level);
  petTodayXP.textContent = `今日 ${todayXP} XP`;
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
  todayData.todayPetXP = 0;
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

function getCumulativeXPForLevel(level) {
  let total = 0;

  for (let currentLevel = 1; currentLevel < level; currentLevel += 1) {
    total += getNextLevelXP(currentLevel);
  }

  return total;
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

function getNextStageProgress(progress) {
  const nextStage = EVOLUTION_STAGES.find((stage) => progress.level < stage.minLevel);

  if (!nextStage) {
    return null;
  }

  const currentTotalForStage = getCumulativeXPForLevel(progress.level) + progress.currentXP;
  const neededTotalForStage = getCumulativeXPForLevel(nextStage.minLevel);
  const xp = Math.max(0, neededTotalForStage - currentTotalForStage);
  const averageXP = Math.max(1, todayData.focusDuration || MODES.focus.minutes || DEFAULT_FOCUS_MINUTES);

  return {
    xp,
    tomatoes: Math.max(1, Math.ceil(xp / averageXP))
  };
}

function addPetXP(amount) {
  const baseXP = Math.max(0, Math.floor(Number(amount) || 0));
  const bonusPercent = getStreakBonusPercent(todayData.streak);
  const totalXP = Math.round(baseXP * (1 + bonusPercent / 100));
  const progress = todayData.petProgress;
  const previousStage = getEvolutionStage(progress.level).id;

  progress.currentXP += totalXP;
  progress.totalXP += totalXP;
  todayData.todayPetXP = normalizeNonNegativeInteger(todayData.todayPetXP) + totalXP;

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

function removePetXP(amount) {
  const xp = Math.min(normalizeNonNegativeInteger(amount), todayData.petProgress.totalXP);

  if (xp <= 0) {
    return;
  }

  const petId = todayData.petProgress.petId || todayData.selectedPet;
  const nextProgress = createPetProgressFromTotalXP(todayData.petProgress.totalXP - xp, petId);

  Object.assign(todayData.petProgress, nextProgress, {
    lastUpdated: new Date().toISOString()
  });
  todayData.todayPetXP = normalizeTodayPetXP(
    Math.max(0, normalizeNonNegativeInteger(todayData.todayPetXP) - xp),
    todayData.petProgress.totalXP
  );
  savePetProgress();
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
  const bonusText = result.bonusPercent > 0 ? `连续专注额外奖励 ${result.bonusPercent}%。` : "";

  return `完成一个番茄钟，宠物获得了 ${result.totalXP} XP。${bonusText}${levelText}${evolutionText} ${restText}`;
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

function createPetProgressFromTotalXP(totalXP, petId = PET_TYPE_KEYS[0]) {
  const normalizedPetId = normalizePetType(petId);
  const safeTotalXP = normalizeNonNegativeInteger(totalXP);
  let level = 1;
  let currentXP = safeTotalXP;
  let nextLevelXP = getNextLevelXP(level);

  while (currentXP >= nextLevelXP) {
    currentXP -= nextLevelXP;
    level += 1;
    nextLevelXP = getNextLevelXP(level);
  }

  return {
    petId: normalizedPetId,
    level,
    currentXP,
    nextLevelXP,
    totalXP: safeTotalXP,
    evolutionStage: getEvolutionStage(level).id
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
  let level = Math.max(1, Math.floor(Number(progress.level) || 1));
  let currentXP = Math.max(0, Math.floor(Number(progress.currentXP) || 0));
  let nextLevelXP = getNextLevelXP(level);

  while (currentXP >= nextLevelXP) {
    currentXP -= nextLevelXP;
    level += 1;
    nextLevelXP = getNextLevelXP(level);
  }

  const minimumTotalXP = getCumulativeXPForLevel(level) + currentXP;
  const totalXP = Math.max(minimumTotalXP, Math.floor(Number(progress.totalXP) || 0));
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
  if (timerId !== null) {
    remainingSeconds = timerEndsAt
      ? getRemainingSeconds(timerEndsAt)
      : remainingSeconds;
    clearInterval(timerId);
    timerId = null;
  }

  timerEndsAt = 0;
  clearActiveTimerState();
}

function persistActiveTimerState() {
  todayData.activeTimer = {
    date: todayData.date,
    mode: currentMode,
    endsAt: new Date(timerEndsAt).toISOString()
  };
  saveTodayData(false);
}

function clearActiveTimerState() {
  if (!todayData.activeTimer) {
    return;
  }

  todayData.activeTimer = null;
  saveTodayData(false);
}

function restoreActiveTimerState() {
  const activeTimer = normalizeActiveTimer(todayData.activeTimer);

  if (!activeTimer) {
    todayData.activeTimer = null;
    return;
  }

  timerEndsAt = new Date(activeTimer.endsAt).getTime();

  if (getDateKey(new Date(timerEndsAt)) !== getTodayKey()) {
    todayData.activeTimer = null;
    saveTodayData(false);
    timerEndsAt = 0;
    return;
  }

  currentMode = activeTimer.mode;
  remainingSeconds = getRemainingSeconds(timerEndsAt);

  if (remainingSeconds > 0) {
    timerId = setInterval(updateCountdownFromClock, 500);
    statusText.textContent = currentMode === "focus"
      ? "已恢复正在进行的专注，倒计时按真实时间继续。"
      : "已恢复休息倒计时。";
    return;
  }

  todayData.activeTimer = null;
  saveTodayData(false);
  queueMicrotask(() => finishCurrentMode({ silent: true }));
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
