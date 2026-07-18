import { createApiClient } from "./js/api.js";
import { createAuthController } from "./js/authController.js";
import { createAiReviewController } from "./js/aiController.js";
import { createAiPlanController } from "./js/aiPlanController.js";
import { createCloudRepository } from "./js/cloudRepository.js";
import { performCloudSync, runCloudAction } from "./js/cloudSync.js";
import { createAiSummaryPanel } from "./js/components/aiSummary.js";
import { createAuthFeatureView } from "./js/components/authFeature.js";
import { createTimerPanel } from "./js/components/timerPanel.js";
import { createTaskSwipeController } from "./js/components/taskSwipe.js";
import { createStudyGoalsView } from "./js/components/studyGoals.js";
import { createPetCompanionController } from "./js/components/petCompanion.js";
import {
  buildFocusCompleteMessage,
  createFocusCompleteView,
  createPetRewardView,
  createTaskToast
} from "./js/components/feedback.js";
import { createAppNavigator, createDrawer } from "./js/navigation.js";
import {
  playFinishSound,
  requestNotificationPermission,
  showNotification,
  unlockAudio,
  vibrateTaskDone
} from "./js/effects.js";
import {
  getAiTomorrowAdoptionState,
  getAiTomorrowSuggestions
} from "./js/aiReview.js";
import {
  addHomeTask,
  renderHomePage as renderHomePageView
} from "./js/pages/home.js";
import { createTasksPageController } from "./js/pages/tasks.js";
import { buildReviewModel, renderRecordsView, renderReviewPageView } from "./js/pages/review.js";
import { createPetPageView } from "./js/pages/pet.js";
import { createDataPageView } from "./js/pages/data.js";
import { createFocusSessionPageView } from "./js/pages/focusSession.js";
import { getPrimaryStudyGoal, normalizeStudyGoal, sortStudyGoals } from "./js/goals.js";
import {
  inferTodayPetXP,
  normalizeTodayPetXP
} from "./js/focusRecords.js";
import {
  addUniqueTask,
  resolveExecutableTaskSelection,
  sortExecutableTasks
} from "./js/tasks.js";
import { createTaskStore } from "./js/taskStore.js";
import { createTodayStore } from "./js/todayStore.js";
import { clearTodaySessionData, completeFocusSession } from "./js/focusSession.js";
import { createFocusFlowController } from "./js/focusFlowController.js";
import { createFocusSessionController } from "./js/focusSessionController.js";
import { createStudySyncController } from "./js/studySyncController.js";
import { createPetController } from "./js/petController.js";
import { createTaskController } from "./js/taskController.js";
import { createTimerController } from "./js/timerController.js";
import { createActiveTimerController } from "./js/activeTimerController.js";
import { createCloudStatsController } from "./js/cloudStatsController.js";
import { createGoalController } from "./js/goalController.js";
import { createCloudStateApplier } from "./js/cloudState.js";
import { placeSettingsUtilities, setupAppLayout } from "./js/components/appLayout.js";
import { createCurrentGoalView } from "./js/components/currentGoal.js";
import { createLongGoalOnboarding } from "./js/components/longGoalOnboarding.js";
import { createTimerEngine } from "./js/timerEngine.js";
import {
  loadStudyGoals as readStudyGoals,
  saveJson
} from "./js/storage.js";
import {
  createClientId,
  formatPlanDate,
  getDateKey,
  getRelativeDateKey,
  normalizeRestType
} from "./js/utils.js";
import {
  AUTH_SESSION_KEY,
  DAILY_PLANS_KEY,
  DELETED_TASKS_KEY,
  DEFAULT_GOAL,
  MODES,
  REST_DURATIONS,
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
const homePetCompanion = document.querySelector("#homePetCompanion");
const homePetArt = document.querySelector("#homePetArt");
const homePetMessage = document.querySelector("#homePetMessage");
const homeNextTaskTitle = document.querySelector("#homeNextTaskTitle");
const homeNextTaskHint = document.querySelector("#homeNextTaskHint");
const homeQuickTask = document.querySelector("#homeQuickTask");
const homeQuickTaskInput = document.querySelector("#homeQuickTaskInput");
const homeQuickTaskBtn = document.querySelector("#homeQuickTaskBtn");
const homeQuickTaskGoalSelect = document.querySelector("#homeQuickTaskGoalSelect");
const homeReviewBtn = document.querySelector("#homeReviewBtn");
const aiPlanBanner = document.querySelector("#aiPlanBanner");
const aiPlanBannerTitle = document.querySelector("#aiPlanBannerTitle");
const aiPlanBannerText = document.querySelector("#aiPlanBannerText");
const homeFocusBtn = document.querySelector("#homeFocusBtn");
const homeAddTaskBtn = document.querySelector("#homeAddTaskBtn");
const homeInsightsBtn = document.querySelector("#homeInsightsBtn");
const focusDurationInput = document.querySelector("#focusDurationInput");
const restDurationSelect = document.querySelector("#restDurationSelect");
const roundSettingsSummary = document.querySelector("#roundSettingsSummary");
const currentTaskSelect = document.querySelector("#currentTaskSelect");
const todayDateText = document.querySelector("#todayDateText");
const planProgressText = document.querySelector("#planProgressText");
const planExpandBtn = document.querySelector("#planExpandBtn");
const carryOverBanner = document.querySelector("#carryOverBanner");
const carryOverText = document.querySelector("#carryOverText");
const carryOverBtn = document.querySelector("#carryOverBtn");
const newTaskInput = document.querySelector("#newTaskInput");
const newTaskGoalSelect = document.querySelector("#newTaskGoalSelect");
const addTaskBtn = document.querySelector("#addTaskBtn");
const taskList = document.querySelector("#taskList");
const taskToast = document.querySelector("#taskToast");
const taskToastText = document.querySelector("#taskToastText");
const taskToastUndo = document.querySelector("#taskToastUndo");
const longGoalOnboarding = document.querySelector("#longGoalOnboarding");
const longGoalOnboardingForm = document.querySelector("#longGoalOnboardingForm");
const goalInput = document.querySelector("#goalInput");
const goalProgressText = document.querySelector("#goalProgressText");
const goalProgressFill = document.querySelector("#goalProgressFill");
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
const focusSessionShell = document.querySelector("#focusSessionShell");
const focusSessionBackBtn = document.querySelector("#focusSessionBackBtn");
const focusSessionEyebrow = document.querySelector("#focusSessionEyebrow");
const focusSessionTask = document.querySelector("#focusSessionTask");
const focusSessionRing = document.querySelector("#focusSessionRing");
const focusSessionTime = document.querySelector("#focusSessionTime");
const focusSessionProgress = document.querySelector("#focusSessionProgress");
const focusSessionPet = document.querySelector("#focusSessionPet");
const focusSessionPetName = document.querySelector("#focusSessionPetName");
const focusSessionXp = document.querySelector("#focusSessionXp");
const focusSessionToggleBtn = document.querySelector("#focusSessionToggleBtn");
const focusSessionResetBtn = document.querySelector("#focusSessionResetBtn");
const focusSessionAbandonBtn = document.querySelector("#focusSessionAbandonBtn");
const focusSessionFinish = document.querySelector("#focusSessionFinish");
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
const timerPanelView = createTimerPanel({
  elements: {
    card: timerCard,
    display: timerDisplay,
    progressFill: timerProgressFill,
    progressText: timerProgressText,
    statusText,
    startButton: startBtn,
    modeButtons,
    restTypeLabel,
    restCopy
  },
  onModeChange: switchMode
});
const focusSessionPageView = createFocusSessionPageView({
  shell: focusSessionShell,
  eyebrow: focusSessionEyebrow,
  task: focusSessionTask,
  ring: focusSessionRing,
  time: focusSessionTime,
  progress: focusSessionProgress,
  pet: focusSessionPet,
  petName: focusSessionPetName,
  xp: focusSessionXp,
  toggle: focusSessionToggleBtn,
  finish: focusSessionFinish,
});
let focusSessionController = null;
const taskSwipeController = createTaskSwipeController({
  onComplete: completeTaskWithAnimation,
  onDelay: delayTaskToTomorrow,
});
const tasksPage = createTasksPageController({
  elements: {
    todayDateText,
    planProgressText,
    taskList,
    planExpandButton: planExpandBtn,
    currentTaskSelect,
    carryOverBanner,
    carryOverText,
  },
  taskSwipeController,
  formatPlanDate,
  onFocus: focusTask,
  onEdit: editTask,
  onDelete: deleteTask,
  onRestore: undoCompleteTask,
  onComplete: completeTaskWithAnimation,
  onDelay: delayTaskToTomorrow,
  getGoalLabel: (goalId) => studyGoals.find((goal) => goal.id === goalId)?.title || "",
});
tasksPage.setRenderCurrent(renderTaskPage);
const appNavigator = createAppNavigator({
  pages: appPages,
  buttons: pageButtons,
  onPageChange: handlePageChange,
  canNavigate: (transition) => focusSessionController?.canNavigate(transition) ?? true,
});
const settingsDrawerView = createDrawer({
  root: settingsDrawer,
  openButton: openSettingsBtn,
  closeButton: closeSettingsBtn,
});
const petPageView = createPetPageView({
  shell: petShell,
  art: petArt,
  picker: petPicker,
  name: petName,
  status: petStatus,
  stageLabel: petStageLabel,
  progressFill: petProgressFill,
  levelLabel: petLevelLabel,
  xpText: petXPText,
  evolutionHint,
  todayXP: petTodayXP,
  streak: streakCount,
  totalXP: petTotalXP,
  modalTitle: petModalTitle,
  modalCopy: petModalCopy,
  evolutionGrid: evolutionPreviewGrid,
  modalRoot: petModal,
  modalClose: petModalClose,
});
const timerEngine = createTimerEngine({
  onTick: renderTimerAndProgress,
  onComplete: () => finishCurrentMode(),
});
const taskToastView = createTaskToast({ root: taskToast, text: taskToastText, undoButton: taskToastUndo });
const petRewardView = createPetRewardView({ toast: xpToast, status: petStatus });
const focusCompleteView = createFocusCompleteView({
  root: focusCompleteModal,
  copy: focusCompleteCopy,
  xp: focusCompleteXp,
  pomodoro: focusCompletePomodoro,
  petArt: focusCompletePetArt,
  petText: focusCompletePetText,
  restHint: focusCompleteRestHint,
  startRestButton: startRestFromModalBtn,
});
const authView = createAuthFeatureView({
  gateElements: {
    root: authGate,
    appRoot,
    form: authGateForm,
    status: authGateStatus,
    submit: authGateSubmit,
    loginTab: gateLoginTab,
    registerTab: gateRegisterTab,
    nameField: gateNameField,
    emailInput: gateEmailInput,
    passwordInput: gatePasswordInput,
    nameInput: gateNameInput,
    localEntry: authLocalEntry,
    eyebrow: authGateEyebrow,
    heading: authGateHeading,
  },
  accountMount: document.querySelector("#accountMount") || document.querySelector(".hero"),
  handlers: {
    onModeChange: setAuthMode,
    onSubmit: authenticateCredentials,
    onLocalEntry: enterLocalMode,
    onLogout: logoutFromCloud,
    onModeToggle: toggleAuthMode,
    onSync: () => performFullCloudSync("正在手动同步...")
      .catch((error) => setSyncStatus(error.message, true)),
  },
});

const authController = createAuthController({
  storage: localStorage,
  sessionStorage,
  sessionKey: AUTH_SESSION_KEY,
  localAccessKey: AUTH_LOCAL_SESSION_KEY,
  getRepository: () => cloudRepository,
  performSync: (message, options) => performFullCloudSync(message, options),
  onChange: refreshAuthUI,
  onReset: resetCloudAccountState,
  setBusy: (busy) => authView.setBusy(busy),
  setFeedback: setAuthFeedback,
  clearPassword: () => authView.clearPassword(),
});
const apiRequest = createApiClient({ getToken: () => authController.getSession()?.token });
const cloudRepository = createCloudRepository(apiRequest);
const aiReviewController = createAiReviewController({
  getRepository: () => cloudRepository,
  isEnabled: isCloudSyncEnabled,
  onChange: renderAiSummary,
});
let dataPageView = null;
let studyGoalsPanel = null;
let studyGoalsView = null;
let currentGoalView = null;
let longGoalOnboardingView = null;
let aiSummaryView = null;

let focusFlowController = null;

const todayStore = createTodayStore({ storage: localStorage, key: STORAGE_KEY, getDateKey });
let todayData = todayStore.load();
let homePetMessageIndex = 0;
const homePetCompanionController = createPetCompanionController({
  element: homePetCompanion,
  isActive: () => (
    !document.hidden
    && authGate.hidden
    && document.body.dataset.page === "home"
    && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ),
  onSpeak: () => {
    homePetMessageIndex += 1;
    renderHomePage();
  },
});
const cloudStatsController = createCloudStatsController({
  isEnabled: isCloudSyncEnabled,
  fetchStats: (range) => cloudRepository.fetchStats(range),
  getView: () => dataPageView,
  getLocalTotals: () => ({
    completedCount: todayData.completedCount,
    focusMinutes: todayData.focusMinutes,
    totalXP: todayData.petProgress.totalXP,
    dailyGoal: todayData.dailyGoal,
    goalBreakdown: studyGoals.filter((goal) => !goal.completed).map((goal) => ({
      id: goal.id,
      title: goal.title,
      isPrimary: goal.isPrimary,
      focusMinutes: todayData.records
        .filter((record) => record.studyGoalId === goal.id)
        .reduce((sum, record) => sum + (Number(record.minutes) || 0), 0),
    })),
  }),
});
const activeTimerController = createActiveTimerController({
  engine: timerEngine,
  getData: () => todayData,
  getTodayKey,
  getDateKey,
  save: saveTodayData,
  setStatus: (message) => { statusText.textContent = message; },
  onExpired: () => finishCurrentMode({ silent: true }),
});
const taskStore = createTaskStore({
  storage: localStorage,
  plansKey: DAILY_PLANS_KEY,
  deletedKey: DELETED_TASKS_KEY,
});
let studyGoals = loadStudyGoals();
const petController = createPetController({
  getData: () => todayData,
  save: () => saveTodayData(),
});
const cloudState = createCloudStateApplier({
  getData: () => todayData,
  taskStore,
  getGoals: () => studyGoals,
  setGoals: (goals) => { studyGoals = goals; },
  getTodayKey,
  modes: MODES,
  timerEngine,
  focusDurationInput,
  restDurationSelect,
  goalInput,
  getRestMinutes,
  applyTheme,
  saveData: saveTodayData,
  savePlans: saveDailyPlans,
  saveGoals: saveStudyGoals,
  renderGoals: renderStudyGoals,
});
const studySyncController = createStudySyncController({
  repository: cloudRepository,
  taskStore,
  isEnabled: isCloudSyncEnabled,
  getTodayData: () => todayData,
  getStudyGoals: () => studyGoals,
  getTodayKey,
  createFocusRecordId,
  onUser: (user) => authController.updateUser(user),
  applySettings: applyCloudSettings,
  applyPet: applyCloudPet,
  applyTasks: applyCloudTasks,
  applyStudyGoals: applyCloudStudyGoals,
  applyFocusSessions: applyCloudFocusSessions,
  replaceStudyGoal,
  onTaskIdentityChanged: (previousId, task) => {
    if (todayData.currentTaskId !== previousId) return;
    todayData.currentTaskId = task.id;
    todayData.currentTask = task.title;
    saveTodayData(false);
  },
  saveToday: saveTodayData,
  savePlans: saveDailyPlans,
  onPulled: render,
});
const aiPlanController = createAiPlanController({
  getAiState: () => aiReviewController.getState(),
  getTodayTasks,
  getTasks: (dateKey) => taskStore.getTasks(dateKey),
  getTodayKey,
  getTomorrowKey,
  addTaskToDate,
  savePlans: saveDailyPlans,
  renderAi: renderAiSummary,
  renderReview: renderReviewPage,
  showToast: showTaskToast,
  runCloudSync,
  uploadTasks: () => studySyncController.uploadTasks(),
  createTask: (task, dateKey) => studySyncController.createTask(task, dateKey),
  applyCreatedTask: (task, remoteTask) => studySyncController.applyCreatedTask(task, remoteTask),
  getStudyGoals: () => studyGoals,
});
const goalController = createGoalController({
  getGoals: () => studyGoals,
  setGoals: (goals) => { studyGoals = goals; },
  getData: () => todayData,
  taskStore,
  createGoalId: createStudyGoalId,
  saveGoals: saveStudyGoals,
  saveData: saveTodayData,
  savePlans: saveDailyPlans,
  renderGoals: renderStudyGoals,
  updateOptions: updateCurrentGoalOptions,
  syncController: studySyncController,
  runCloudSync,
});
const taskController = createTaskController({
  taskStore,
  petController,
  syncController: studySyncController,
  getData: () => todayData,
  getTodayKey,
  getYesterdayKey,
  getTomorrowKey,
  createTaskId,
  savePlans: saveDailyPlans,
  saveData: saveTodayData,
  renderTasks: renderTaskPage,
  renderCurrentOptions: updateCurrentTaskOptions,
  renderHome: renderHomePage,
  renderReview: renderReviewPage,
  renderPet: updatePetUI,
  updateStartButton: updateStartButtonState,
  runCloudSync,
  showToast: showTaskToast,
  hideToast: hideTaskToast,
  switchPage,
  vibrate: vibrateTaskDone,
});
const timerController = createTimerController({
  engine: timerEngine,
  modes: MODES,
  getData: () => todayData,
  getRestMinutes,
  ensureFocusTask: ensureStartableFocusTask,
  statusText,
  newTaskInput,
  focusDurationInput,
  restDurationSelect,
  unlockAudio,
  requestNotificationPermission,
  clearActiveTimer: activeTimerController.clear,
  persistActiveTimer: activeTimerController.persist,
  closeCompletion: closeFocusCompleteModal,
  clearPendingRest: () => focusFlowController?.clearPendingRest(),
  setRestType,
  saveData: saveTodayData,
  render,
  updateStartButton: updateStartButtonState,
  runCloudSync,
  syncSettings: syncSettingsToCloud,
});
focusSessionController = createFocusSessionController({
  engine: timerEngine,
  modes: MODES,
  timerController,
  navigate: switchPage,
  prepareStart: () => {
    if (Number(focusDurationInput.value) !== todayData.focusDuration) {
      timerController.updateFocusDuration();
    }
  },
});
focusFlowController = createFocusFlowController({
  engine: timerEngine,
  modes: MODES,
  getData: () => todayData,
  pauseSilently: () => timerController.pauseSilently(),
  completeSession: completeFocusSession,
  createRecordId: createFocusRecordId,
  getTodayKey,
  saveData: saveTodayData,
  runCloudSync,
  uploadFocusSession: (focusRecord, xpResult) => cloudRepository.createFocusSession({
    clientId: focusRecord.id,
    taskId: todayData.currentTaskId || null,
    studyGoalId: todayData.currentStudyGoalId || null,
    taskTitle: focusRecord.task,
    minutes: focusRecord.minutes,
    startedAt: focusRecord.startedAt,
    endedAt: focusRecord.endedAt,
    dateKey: focusRecord.dateKey,
    streak: focusRecord.streak,
    xpEarned: xpResult.totalXP,
  }),
  syncPet: syncPetToCloud,
  syncSettings: syncSettingsToCloud,
  pullCloudState,
  refreshStats: () => cloudStatsController.load(cloudStatsController.getRange(), { silent: true }),
  generateAiSummary: () => fetchDailyAiSummary({ auto: true }),
  playFinishSound,
  showNotification,
  setRestType,
  normalizeRestType,
  render,
  showPetReward,
  setStatus: (message) => { statusText.textContent = message; },
  openCompletion: openFocusCompleteModal,
  closeCompletion: closeFocusCompleteModal,
  buildCompletionMessage: buildFocusCompleteMessage,
  scheduleCompletion: (open) => {
    if (getPageFromLocation() !== "focus-session") {
      open();
      return;
    }
    focusSessionPageView.showCompletion().then(open);
  },
});

MODES.focus.minutes = todayData.focusDuration;
MODES.rest.minutes = getRestMinutes();
timerEngine.setMode("focus", MODES.focus.minutes * 60);
activeTimerController.restore();
focusDurationInput.value = todayData.focusDuration;
restDurationSelect.value = normalizeRestType(todayData.nextRestType);
goalInput.value = todayData.dailyGoal;
applyTheme(todayData.theme);
setupTodayPageLayout();
render();
switchPage(getInitialPage(), { fromHistory: true, force: true });
setupAiSummaryUI();
setupCloudStatsUI();
setupStudyGoalsUI();
setupLongGoalOnboardingUI();
setupStudyDiagnosisUI();
setupCurrentGoalUI();
placeDataUtilitiesLast();
refreshAuthUI();
bootstrapCloudSession();
homePetCompanionController.start();

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
homeReviewBtn?.addEventListener("click", () => switchPage("review"));
homeQuickTaskInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleHomeQuickTask();
  }
});
carryOverBtn.addEventListener("click", carryOverYesterdayTasks);
planExpandBtn?.addEventListener("click", toggleHomePlanExpanded);
petShell.addEventListener("click", openPetModal);
petShell.addEventListener("keydown", handlePetShellKeydown);
petModalClose.addEventListener("click", closePetModal);
petModal.addEventListener("click", handlePetModalBackdrop);
focusCompleteModal.addEventListener("click", handleFocusCompleteModalBackdrop);
startRestFromModalBtn.addEventListener("click", startRestFromCompletionModal);
skipRestFromModalBtn.addEventListener("click", skipRestFromCompletionModal);
focusSessionBackBtn.addEventListener("click", exitFocusSession);
focusSessionToggleBtn.addEventListener("click", toggleFocusSessionTimer);
focusSessionResetBtn.addEventListener("click", resetFocusSession);
focusSessionAbandonBtn.addEventListener("click", abandonFocusSession);
reviewAdoptBtn?.addEventListener("click", adoptReviewTomorrowTask);
document.addEventListener("keydown", handleDocumentKeydown);
document.addEventListener("visibilitychange", () => {
  if (timerEngine.isRunning()) timerEngine.tick();
});
window.addEventListener("beforeunload", handleBeforeUnload);

goalInput.addEventListener("input", () => {
  const nextGoal = Number(goalInput.value);
  todayData.dailyGoal = Number.isFinite(nextGoal) && nextGoal > 0
    ? Math.min(Math.floor(nextGoal), 24)
    : DEFAULT_GOAL;
  goalInput.value = todayData.dailyGoal;
  saveTodayData();
  renderGoalProgress();
});


if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js");
  });
}

function setupTodayPageLayout() {
  setupAppLayout({
    todayTaskMount,
    planCard: document.querySelector(".plan-card"),
    todayTimerMount,
    timerCard,
    reviewPage: document.querySelector('.app-page[data-page="review"]'),
    recordsCard: document.querySelector(".records-card"),
  });
}

function placeDataUtilitiesLast() {
  placeSettingsUtilities({
    mount: settingsDrawerMount,
    accountMount: document.querySelector("#accountMount"),
    settingsCard: document.querySelector(".settings-card"),
    studyGoalsPanel,
  });
}

function openSettingsDrawer() {
  settingsDrawerView.open();
}

function closeSettingsDrawer() {
  settingsDrawerView.close();
}

function setAuthMode(mode) {
  authController.setMode(mode);
}

function enterLocalMode() {
  authController.enterLocal();
  switchPage("home");
  ensureLongGoalOnboarding();
  window.setTimeout(() => homeQuickTaskInput?.focus(), 120);
}

function refreshAuthUI() {
  const authState = authController.getState();
  authView.render(authState);

  if (authState.session?.user) {
    updateLastSyncText();
    setSyncStatus("已开启云端同步");
  }

  cloudStatsController.render();
}

function toggleAuthMode() {
  const { mode } = authController.getState();
  setAuthMode(mode === "login" ? "register" : "login");
}

async function authenticateCredentials({ email, password, displayName }) {
  const authenticated = await authController.authenticate({ email, password, displayName });
  if (authenticated) ensureLongGoalOnboarding();
  return authenticated;
}

function setAuthFeedback(message, isError = false) {
  setSyncStatus(message, isError);
  authView.setFeedback(message, isError);
}

async function logoutFromCloud() {
  return authController.logout();
}

function resetCloudAccountState() {
  cloudStatsController.reset();
  aiReviewController.reset();
  setSyncStatus("已回到本地模式");
}

async function bootstrapCloudSession() {
  const restored = await authController.bootstrap();
  ensureLongGoalOnboarding();
  return restored;
}

function isCloudSyncEnabled() {
  return authController.isCloudEnabled();
}

function setSyncStatus(message, isError = false) {
  authView.setSyncStatus(message, isError);
}

async function performFullCloudSync(message = "正在同步...", options = {}) {
  return performCloudSync({
    enabled: isCloudSyncEnabled(),
    message,
    cloudFirst: options.cloudFirst,
    setBusy: (busy) => authView.setManualSyncBusy(busy),
    setStatus: setSyncStatus,
    pull: pullCloudState,
    push: syncLocalStateToCloud,
    refreshStats: () => cloudStatsController.load(cloudStatsController.getRange(), { silent: true }),
    loadAi: loadStoredAiSummary,
    onSynced: markCloudSynced,
    onRefresh: () => {
      refreshAuthUI();
      renderAiSummary();
    },
  });
}

function markCloudSynced() {
  authController.markSynced();
  updateLastSyncText();
}

function updateLastSyncText() {
  const lastSyncedAt = authController.getSession()?.lastSyncedAt;
  authView.setLastSyncText(lastSyncedAt
    ? `上次同步 ${formatLastSyncTime(lastSyncedAt)}`
    : "尚未同步");
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
  if (!insightsPage) return;
  dataPageView = createDataPageView({
    page: insightsPage,
    onRangeChange: cloudStatsController.load,
  });
  cloudStatsController.render();
}

function setupStudyDiagnosisUI() {
  renderStudyDiagnosis();
}

function renderStudyDiagnosis() {
  const goalsWithLocalProgress = studyGoals.map((goal) => ({
    ...goal,
    recentFocusMinutes: Math.max(
      Number(goal.recentFocusMinutes) || 0,
      todayData.records
        .filter((record) => record.studyGoalId === goal.id)
        .reduce((sum, record) => sum + (Number(record.minutes) || 0), 0),
    ),
  }));
  dataPageView?.renderDiagnosis({
    todayData,
    todayTasks: getTodayTasks(),
    recentPlans: getRecentPlanSummaries(7),
    studyGoals: goalsWithLocalProgress,
  });
}

function setupAiSummaryUI() {
  const reviewPage = document.querySelector('.app-page[data-page="review"]');

  if (!reviewPage) {
    return;
  }

  aiSummaryView = createAiSummaryPanel({
    reviewPage,
    onGenerate: () => fetchDailyAiSummary({ force: true }),
    onAdopt: adoptAiTomorrowPlan,
    onOpenAccount: openSettingsDrawer,
    formatGeneratedAt: formatAiGeneratedAt
  });
  renderAiSummary();
}

async function loadStoredAiSummary() {
  return aiReviewController.load(getTodayKey());
}

async function fetchDailyAiSummary(options = {}) {
  return aiReviewController.generate(getTodayKey(), options);
}

function renderAiSummary() {
  if (!aiSummaryView) {
    return;
  }

  const aiSummary = aiReviewController.getState();
  const suggestions = getAiTomorrowSuggestions(aiSummary.data);
  aiSummaryView.render({
    state: aiSummary,
    cloudEnabled: isCloudSyncEnabled(),
    adoptionState: getAiTomorrowAdoptionState(suggestions, aiPlanController.getAdoptionTasks())
  });
}

function adoptAiTomorrowPlan() {
  return aiPlanController.adoptAiSuggestions();
}

function adoptReviewTomorrowTask() {
  return aiPlanController.adoptReviewSuggestion();
}

function addTaskToDate(dateKey, title, metadata = {}) {
  return addUniqueTask({
    store: taskStore,
    dateKey,
    title,
    metadata,
    id: createTaskId(),
  });
}

function getReviewTomorrowTask() {
  return aiPlanController.getReviewSuggestion();
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
  if (!insightsPage) return;
  studyGoalsView = createStudyGoalsView({
    mount: insightsPage,
    onAdd: addStudyGoal,
    onToggle: toggleStudyGoal,
    onDelete: deleteStudyGoal,
    onUpdate: updateStudyGoal,
  });
  studyGoalsPanel = studyGoalsView.panel;
  renderStudyGoals();
}

function addStudyGoal(goalInput) {
  const goal = goalController.add(goalInput);
  if (!goal) return null;
  todayData.longGoalOnboardingCompleted = true;
  if (!todayData.currentStudyGoalId) todayData.currentStudyGoalId = goal.id;
  saveTodayData();
  refreshGoalSelectors();
  return goal;
}

function updateStudyGoal(goalId, patch) {
  return goalController.update(goalId, patch);
}

function toggleStudyGoal(goalId) {
  const changed = goalController.toggle(goalId);
  if (changed) ensureLongGoalOnboarding();
  return changed;
}

function deleteStudyGoal(goalId) {
  const removed = goalController.remove(goalId);
  if (removed) ensureLongGoalOnboarding();
  return removed;
}

function renderStudyGoals() {
  studyGoalsView?.render(studyGoals);
  refreshGoalSelectors();
}

function setupLongGoalOnboardingUI() {
  longGoalOnboardingView = createLongGoalOnboarding({
    root: longGoalOnboarding,
    form: longGoalOnboardingForm,
    onSubmit: submitLongGoalOnboarding,
  });
}

async function submitLongGoalOnboarding(input) {
  const deadline = new Date(`${input.targetDate}T00:00:00`);
  const weeks = Math.max(1, Math.ceil((deadline.getTime() - Date.now()) / (7 * 86400000)));
  const goal = addStudyGoal({
    ...input,
    targetMinutes: Math.min(99999, input.weeklyTargetMinutes * weeks),
  });
  if (!goal) return false;
  todayData.currentStudyGoalId = goal.id;
  todayData.longGoalOnboardingCompleted = true;
  saveTodayData(false);
  render();
  if (isCloudSyncEnabled()) await performFullCloudSync("正在同步你的长期目标...");
  showTaskToast("长期目标已建立。接下来每个番茄都会留下方向。");
  return true;
}

function ensureLongGoalOnboarding() {
  const authState = authController.getState();
  const hasAccess = authState.localAccessGranted || Boolean(authState.session?.token);
  if (!hasAccess || !longGoalOnboardingView) return;
  if (studyGoals.some((goal) => !goal.completed)) {
    if (!todayData.longGoalOnboardingCompleted) {
      todayData.longGoalOnboardingCompleted = true;
      saveTodayData(false);
    }
    longGoalOnboardingView.close();
    return;
  }
  longGoalOnboardingView.open({
    message: todayData.longGoalOnboardingCompleted
      ? "当前没有进行中的长期目标，请先重新建立方向。"
      : "",
  });
}

function setupCurrentGoalUI() {
  const settingsBody = document.querySelector(".focus-round-settings-body");
  currentGoalView = createCurrentGoalView({
    mount: settingsBody,
    onChange: updateCurrentGoalSelection,
  });
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
  return taskController.select(taskId, { navigate: true });
}

async function pullCloudState() {
  return studySyncController.pull();
}

async function syncLocalStateToCloud() {
  return studySyncController.push();
}

async function syncSettingsToCloud() {
  return studySyncController.syncSettings();
}

async function syncPetToCloud() {
  return studySyncController.syncPet();
}


function applyCloudSettings(settings) {
  return cloudState.settings(settings);
}

function applyCloudPet(pet) {
  return cloudState.pet(pet);
}

function applyCloudTasks(tasks) {
  return cloudState.tasks(tasks);
}

function applyCloudStudyGoals(goals) {
  return cloudState.studyGoals(goals);
}

function applyCloudFocusSessions(focusSessions) {
  return cloudState.focusSessions(focusSessions);
}

function runCloudSync(action) {
  return runCloudAction({
    enabled: isCloudSyncEnabled(),
    action,
    onSuccess: () => setSyncStatus("已同步"),
    onError: (error) => setSyncStatus(error.message, true),
  });
}

function startTimer() {
  return focusSessionController.start();
}

function pauseTimer() {
  return timerController.pause();
}

function resetTimer() {
  return timerController.reset();
}

function abandonCurrentRound() {
  return timerController.abandon();
}

function switchMode(mode) {
  return timerController.switchMode(mode);
}

function updateFocusDuration() {
  return timerController.updateFocusDuration();
}

function updateRestDuration() {
  return timerController.updateRestDuration();
}

function getTodayKey() {
  return getDateKey();
}

function getYesterdayKey() {
  return getRelativeDateKey(-1);
}

function getTomorrowKey() {
  return getRelativeDateKey(1);
}

function getRecentPlanSummaries(days = 7) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - index - 1));
    const dateKey = getDateKey(date);
    const tasks = taskStore.getTasks(dateKey);
    const isToday = dateKey === getTodayKey();

    return {
      dateKey,
      totalTasks: tasks.length,
      completedTasks: tasks.filter((task) => task.completed).length,
      focusMinutes: isToday ? todayData.focusMinutes : 0
    };
  });
}

function saveDailyPlans() {
  taskStore.savePlans();
}

function loadStudyGoals() {
  const goals = readStudyGoals(localStorage, STUDY_GOALS_KEY, normalizeStudyGoal, sortStudyGoals);
  if (goals.some((goal) => !goal.completed) && !goals.some((goal) => !goal.completed && goal.isPrimary)) {
    const firstActive = goals.find((goal) => !goal.completed);
    firstActive.isPrimary = true;
    saveJson(localStorage, STUDY_GOALS_KEY, goals);
  }
  return goals.sort(sortStudyGoals);
}

function saveStudyGoals() {
  saveJson(localStorage, STUDY_GOALS_KEY, studyGoals);
}

function replaceStudyGoal(currentId, nextGoal) {
  return goalController.replace(currentId, nextGoal);
}

function getTodayTasks() {
  return taskStore.getTasks(getTodayKey(), { create: true });
}

function addTask(title, studyGoalId) {
  const goal = studyGoals.find((item) => item.id === studyGoalId && !item.completed);
  if (!goal) {
    ensureLongGoalOnboarding();
    showTaskToast("先选择这个任务要推进的长期目标。");
    return false;
  }
  return taskController.add(title, goal.id);
}

function editTask(taskId, newTitle) {
  return taskController.edit(taskId, newTitle);
}

function deleteTask(taskId) {
  return taskController.remove(taskId);
}

function getYesterdayUnfinishedTasks() {
  return taskStore.getTasks(getYesterdayKey()).filter((task) => !task.completed);
}

function carryOverYesterdayTasks() {
  return taskController.carryOver();
}

function renderTaskPage() {
  const tasks = getTodayTasks();
  tasksPage.renderCarryOver(getYesterdayUnfinishedTasks(), tasks);
  tasksPage.render(tasks, todayData.currentTaskId);
}

function toggleHomePlanExpanded() {
  tasksPage.toggleExpansion();
}

function updateCurrentTaskOptions() {
  const timerState = timerEngine.getState();
  const result = tasksPage.renderCurrentTaskOptions(
    getTodayTasks(),
    todayData.currentTaskId,
    !timerState.running && timerState.mode === "focus"
  );
  if (result.changed) {
    todayData.currentTaskId = result.selected?.id || "";
    todayData.currentTask = result.selected?.title || "";
    todayData.currentStudyGoalId = result.selected?.studyGoalId || "";
    saveTodayData();
  }
}

function updateCurrentGoalOptions() {
  if (!currentGoalView) return;
  const result = currentGoalView.render(studyGoals, todayData.currentStudyGoalId);
  if (result.changed) {
    todayData.currentStudyGoalId = "";
    saveTodayData();
  }
}

function refreshGoalSelectors() {
  const activeGoals = studyGoals.filter((goal) => !goal.completed);
  const preferredId = todayData.currentStudyGoalId || getPrimaryStudyGoal(activeGoals)?.id || "";
  [homeQuickTaskGoalSelect, newTaskGoalSelect].forEach((select) => {
    if (!select) return;
    const previous = select.value;
    select.replaceChildren();
    if (activeGoals.length === 0) {
      select.appendChild(new Option("先建立长期目标", ""));
      select.disabled = true;
      return;
    }
    select.disabled = false;
    activeGoals.forEach((goal) => {
      select.appendChild(new Option(`${goal.isPrimary ? "主目标 · " : ""}${goal.title}`, goal.id));
    });
    select.value = activeGoals.some((goal) => goal.id === previous) ? previous : preferredId;
  });
}

function completeTaskWithAnimation(taskId) {
  tasksPage.markRecentlyCompleted(taskId);
  return taskController.complete(taskId);
}

function delayTaskToTomorrow(taskId) {
  return taskController.delay(taskId);
}

function undoCompleteTask(taskId) {
  tasksPage.clearRecentlyCompleted();
  return taskController.restore(taskId);
}

function showTaskToast(message, undoCallback) {
  taskToastView.show(message, undoCallback);
}

function hideTaskToast() {
  taskToastView.hide();
}

function handleAddTask() {
  const added = addTask(newTaskInput.value, newTaskGoalSelect?.value);

  if (!added) {
    newTaskInput.focus();
    return;
  }

  newTaskInput.value = "";
  newTaskInput.focus();
}

function handleHomeQuickTask() {
  const title = homeQuickTaskInput?.value.trim() || "";
  const result = addHomeTask({
    title,
    addTask: (taskTitle) => addTask(taskTitle, homeQuickTaskGoalSelect?.value),
  });

  if (!result.added) {
    homeQuickTaskInput?.focus();
    return;
  }

  homeQuickTaskInput.value = "";
}

function handleNewTaskKeydown(event) {
  if (event.key === "Enter") {
    handleAddTask();
  }
}

function updateCurrentTaskSelection() {
  return taskController.select(currentTaskSelect.value);
}

function updateCurrentGoalSelection(goalId) {
  const goal = studyGoals.find((item) => item.id === goalId);
  if (!goal) return;
  if (todayData.currentTaskId) {
    taskController.assignGoal(todayData.currentTaskId, goal.id);
    return;
  }
  todayData.currentStudyGoalId = goal.id;
  saveTodayData();
  runCloudSync(syncSettingsToCloud);
}

function createTaskId() {
  return createClientId("task");
}

function createFocusRecordId() {
  return createClientId("focus");
}

function createStudyGoalId() {
  return createClientId("goal");
}

function switchPage(pageName, options = {}) {
  return appNavigator.switchPage(pageName, options);
}

function handlePageChange(pageName) {
  if (pageName === "data" && isCloudSyncEnabled() && cloudStatsController.isIdle()) {
    cloudStatsController.load();
  }

  if (pageName === "review") {
    renderReviewPage();
    const aiState = aiReviewController.getState();
    if (isCloudSyncEnabled() && todayData.completedCount > 0 && aiState.status === "idle") {
      fetchDailyAiSummary({ auto: true });
    }
  }
}

function getPageFromLocation() {
  return appNavigator.getCurrentPage();
}

function getInitialPage() {
  return focusSessionController.getInitialPage(getPageFromLocation());
}

function handleBeforeUnload(event) {
  if (getPageFromLocation() !== "focus-session" || !focusSessionController.hasInProgressSession()) {
    return;
  }
  event.preventDefault();
  event.returnValue = "";
}

function exitFocusSession() {
  focusSessionController.exit();
}

function toggleFocusSessionTimer() {
  focusSessionController.toggle();
}

function resetFocusSession() {
  focusSessionController.reset();
}

function abandonFocusSession() {
  focusSessionController.abandon();
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
  if (event.key === "Escape" && settingsDrawerView.isOpen()) {
    closeSettingsDrawer();
    return;
  }

  if (event.key === "Escape" && petPageView.isPreviewOpen()) {
    closePetModal();
  }

  if (event.key === "Escape" && focusCompleteView.isOpen()) {
    skipRestFromCompletionModal();
  }
}

function openPetModal() {
  petPageView.openPreview({
    progress: todayData.petProgress,
    selectedPet: todayData.selectedPet,
  });
}

function closePetModal() {
  petPageView.closePreview();
}

function openFocusCompleteModal(result, nextRestType) {
  focusCompleteView.open({
    result,
    nextRestType,
    progress: todayData.petProgress,
    selectedPet: todayData.selectedPet,
    completedCount: todayData.completedCount,
    dailyGoal: todayData.dailyGoal,
  });
}

function closeFocusCompleteModal() {
  focusCompleteView.close();
}

function startRestFromCompletionModal() {
  const restType = focusFlowController.startRest();
  timerController.start();
  switchPage("focus-session", { force: true });
  return restType;
}

function skipRestFromCompletionModal() {
  const result = focusFlowController.skipRest();
  switchPage("home", { force: true });
  return result;
}

function finishCurrentMode(options = {}) {
  const result = focusFlowController.finish(options);
  if (result.mode === "rest") {
    switchPage("home", { force: true });
  }
  return result;
}

function clearTodayRecords() {
  const confirmed = window.confirm("确定清空今日学习记录吗？今日番茄、分钟数和连续计数会归零，宠物总经验会保留。");

  if (!confirmed) {
    return;
  }

  clearTodaySessionData(todayData);
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

function saveTodayData(syncCloud = true) {
  todayStore.save(todayData);

  if (syncCloud) {
    runCloudSync(async () => {
      await syncSettingsToCloud();
      await syncPetToCloud();
    });
  }
}

function render() {
  ensureCurrentTaskSelection();
  renderHomePage();
  renderTimerAndProgress();
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
}

function ensureCurrentTaskSelection() {
  if (timerEngine.isRunning() || timerEngine.getState().mode !== "focus") {
    return;
  }

  const selection = resolveExecutableTaskSelection(getTodayTasks(), todayData.currentTaskId);
  if (!selection.changed) return;

  todayData.currentTaskId = selection.task?.id || "";
  todayData.currentTask = selection.task?.title || "";
  todayData.currentStudyGoalId = selection.task?.studyGoalId || "";
  saveTodayData();
}

function renderHomePage() {
  const tasks = getTodayTasks();
  renderHomePageView({
    elements: {
      homeDateText,
      homePetCompanion,
      homePetMessage,
      homeNextTaskTitle,
      homeNextTaskHint,
      homeQuickTask,
      homeReviewBtn,
      homePetArt,
      aiPlanBanner,
      aiPlanBannerTitle,
      aiPlanBannerText
    },
    tasks,
    todayData,
    studyGoals,
    formatPlanDate,
    messageIndex: homePetMessageIndex
  });
}

function renderTimerAndProgress() {
  const timerState = timerEngine.getState();
  const totalSeconds = MODES[timerState.mode].minutes * 60;
  const currentTask = getTodayTasks().find((task) => task.id === todayData.currentTaskId);
  const currentGoalTitle = studyGoals.find((goal) => goal.id === currentTask?.studyGoalId)?.title || "";
  if (roundSettingsSummary) {
    roundSettingsSummary.textContent = `${todayData.focusDuration} 分钟 · 休息 ${getRestMinutes()} 分钟`;
  }
  timerPanelView.render({
    mode: timerState.mode,
    remainingSeconds: timerState.remainingSeconds,
    totalSeconds,
    hasTask: Boolean(getStartableFocusTask()),
    running: timerState.running,
    restType: todayData.nextRestType,
    restMinutes: MODES.rest.minutes
  });
  focusSessionPageView.render({
    mode: timerState.mode,
    remainingSeconds: timerState.remainingSeconds,
    totalSeconds,
    running: timerState.running,
    taskTitle: todayData.currentTask,
    goalTitle: currentGoalTitle,
    progress: todayData.petProgress,
    selectedPet: todayData.selectedPet,
  });
}

function updateStartButtonState() {
  renderTimerAndProgress();
}

function getStartableFocusTask() {
  if (!todayData.currentTaskId) {
    return null;
  }

  return getTodayTasks().find((task) => (
    task.id === todayData.currentTaskId
    && !task.completed
    && task.studyGoalId
    && studyGoals.some((goal) => goal.id === task.studyGoalId && !goal.completed)
  )) || null;
}

function ensureStartableFocusTask() {
  const selectedTask = getStartableFocusTask();

  if (selectedTask) {
    todayData.currentTask = selectedTask.title;
    saveTodayData();
    return selectedTask;
  }

  const selectedWithoutGoal = getTodayTasks().find((task) => (
    task.id === todayData.currentTaskId && !task.completed && !task.studyGoalId
  ));
  if (selectedWithoutGoal) {
    document.querySelector(".focus-round-settings")?.setAttribute("open", "");
    showTaskToast("先在“设置本轮”里选择这个任务所属的长期目标。");
    return null;
  }

  const nextTask = sortExecutableTasks(
    getTodayTasks().filter((task) => !task.completed),
    todayData.currentTaskId
  )[0];

  if (!nextTask) {
    todayData.currentTaskId = "";
    todayData.currentTask = "";
    saveTodayData();
    updateCurrentTaskOptions();
    return null;
  }

  todayData.currentTaskId = nextTask.id;
  todayData.currentTask = nextTask.title;
  todayData.currentStudyGoalId = nextTask.studyGoalId || "";
  saveTodayData();
  updateCurrentTaskOptions();
  renderHomePage();
  renderTaskPage();
  if (!nextTask.studyGoalId || !studyGoals.some((goal) => goal.id === nextTask.studyGoalId && !goal.completed)) {
    document.querySelector(".focus-round-settings")?.setAttribute("open", "");
    showTaskToast("先给当前任务选择一个长期目标。");
    return null;
  }
  return nextTask;
}

function renderStats() {
  dataPageView?.renderTodayStats(todayData);
  renderStudyDiagnosis();
  cloudStatsController.render();
  renderAiSummary();
}

function renderGoalProgress() {
  const percent = Math.min(100, Math.round((todayData.completedCount / todayData.dailyGoal) * 100));

  goalProgressText.textContent = `${todayData.completedCount} / ${todayData.dailyGoal} 个番茄`;
  goalProgressFill.style.width = `${percent}%`;
}

function renderRecords() {
  renderRecordsView(
    recordsList,
    todayData.records,
    (goalId) => studyGoals.find((goal) => goal.id === goalId)?.title || "",
  );
}

function renderReviewPage() {
  const model = buildReviewModel({
    tasks: getTodayTasks(),
    records: todayData.records,
    completedCount: todayData.completedCount,
    nextTask: getReviewTomorrowTask(),
  });
  renderReviewPageView({
    dateText: reviewDateText,
    completedText: reviewCompletedText,
    topSubjectText: reviewTopSubjectText,
    unfinishedText: reviewUnfinishedText,
    tomorrowText: reviewTomorrowText,
    encouragementText: reviewEncouragementText,
    adoptButton: reviewAdoptBtn,
  }, model);
}

function renderPetPicker() {
  const timerState = timerEngine.getState();
  petPageView.renderPicker({
    selectedPet: todayData.selectedPet,
    isLocked: timerState.running && timerState.mode === "focus",
    onSelect: selectPetType,
  });
}

function updatePetUI() {
  const progress = todayData.petProgress;
  const todayXP = normalizeTodayPetXP(todayData.todayPetXP ?? inferTodayPetXP(todayData.records), progress.totalXP);
  petPageView.renderProgress({
    progress,
    selectedPet: todayData.selectedPet,
    todayXP,
    streak: todayData.streak,
    focusMinutes: todayData.focusDuration || MODES.focus.minutes,
    description: getPetDescription(),
  });
}

function selectPetType(typeKey) {
  const timerState = timerEngine.getState();
  if (timerState.running && timerState.mode === "focus") {
    statusText.textContent = "这轮正在专注中，下一轮再换宠物。";
    return;
  }

  const selected = petController.select(typeKey);
  renderPetPicker();
  updatePetUI();
  renderHomePage();
  statusText.textContent = `已切换为 ${selected.name}，从 Lv.1 开始培养。`;
}

function getPetDescription() {
  return petController.getDescription();
}

function showPetReward(result) {
  petRewardView.show(result);
}

function pauseTimerSilently() {
  return timerController.pauseSilently();
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
