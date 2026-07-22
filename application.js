import { createApiClient } from "./js/api.js";
import { createAuthController } from "./js/authController.js";
import { createAiReviewController } from "./js/aiController.js";
import { createAiPlanController } from "./js/aiPlanController.js";
import { createCloudRepository } from "./js/cloudRepository.js";
import { runCloudAction } from "./js/cloudSync.js";
import { createAuthFeatureView } from "./js/components/authFeature.js";
import { createTimerPanel } from "./js/components/timerPanel.js";
import { createTaskSwipeController } from "./js/components/taskSwipe.js";
import { createPetCompanionController } from "./js/components/petCompanion.js";
import { createTaskToast } from "./js/components/feedback.js";
import { createAppNavigator, createDrawer } from "./js/navigation.js";
import {
  playFinishSound,
  requestNotificationPermission,
  showNotification,
  unlockAudio,
  vibrateTaskDone
} from "./js/effects.js";
import { createPetPageView } from "./js/pages/pet.js";
import { createDataPageView } from "./js/pages/data.js";
import { createFocusSessionPageView } from "./js/pages/focusSession.js";
import { normalizeStudyGoal, sortStudyGoals } from "./js/goals.js";
import {
  addUniqueTask,
} from "./js/tasks.js";
import { createTaskStore } from "./js/taskStore.js";
import { createTodayStore } from "./js/todayStore.js";
import { clearTodaySessionData, completeFocusSession } from "./js/focusSession.js";
import { createFocusFlowController } from "./js/focusFlowController.js";
import { createFocusSessionController } from "./js/focusSessionController.js";
import { createStudySyncController } from "./js/studySyncController.js";
import { createSyncOutbox } from "./js/syncOutbox.js";
import { createPetController } from "./js/petController.js";
import { createTaskController } from "./js/taskController.js";
import { createTimerController } from "./js/timerController.js";
import { createActiveTimerController } from "./js/activeTimerController.js";
import { createCloudStatsController } from "./js/cloudStatsController.js";
import { createGoalController } from "./js/goalController.js";
import { createCloudStateApplier } from "./js/cloudState.js";
import { placeSettingsUtilities, setupAppLayout } from "./js/components/appLayout.js";
import { createAiReviewFlow } from "./js/app/aiReviewFlow.js";
import { createAuthSessionFlow } from "./js/app/authSessionFlow.js";
import { bindAppEvents } from "./js/app/bindEvents.js";
import { createFocusFeedbackFlow } from "./js/app/focusFeedbackFlow.js";
import { createRenderCoordinator } from "./js/app/renderCoordinator.js";
import { createOnboardingFlow } from "./js/app/onboardingFlow.js";
import { createPageLifecycle } from "./js/app/pageLifecycle.js";
import { createStudyGoalsFlow } from "./js/app/studyGoalsFlow.js";
import { createTaskPlanningFlow } from "./js/app/taskPlanningFlow.js";
import {
  configureRuntime,
  registerServiceWorker,
  startApplication,
} from "./js/app/bootstrap.js";
import {
  collectAppElements,
  collectAuthElements,
  collectFeedbackElements,
  collectFocusSessionElements,
  collectHomeElements,
  collectOnboardingElements,
  collectPetElements,
  collectProgressElements,
  collectReviewElements,
  collectSettingsElements,
  collectTaskElements,
  collectTimerElements,
} from "./js/app/dom.js";
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
  STUDY_GOALS_KEY,
  SYNC_OUTBOX_KEY
} from "./js/state.js";

const {
  timerCard, timerDisplay, timerProgressFill, timerProgressText, statusText,
  startBtn, pauseBtn, resetBtn, abandonBtn, modeButtons, focusDurationInput,
  restDurationSelect, restTypeLabel, restCopy,
} = collectTimerElements(document);
const {
  appPages, navigationButtons: pageButtons, accountMount, planCard, reviewPage,
  insightsPage, recordsCard, settingsCard, focusSettingsBody, themeColorMeta,
} = collectAppElements(document);
const {
  themeToggle, profileThemeBtn, settingsDrawer, settingsDrawerMount,
  openSettingsBtn, closeSettingsBtn,
} = collectSettingsElements(document);
const {
  todayTaskMount, todayTimerMount, homeDateText, homePetCompanion, homePetArt,
  homePetMessage, homeNextTaskTitle, homeNextTaskHint, homeQuickTask,
  homeQuickTaskInput, homeQuickTaskBtn, homeQuickTaskGoalSelect, homeReviewBtn,
  aiPlanBanner, aiPlanBannerTitle, aiPlanBannerText, homeFocusBtn, homeAddTaskBtn,
  homeInsightsBtn, roundSettingsSummary, currentTaskSelect,
} = collectHomeElements(document);
const {
  todayDateText, planProgressText, planExpandBtn, carryOverBanner, carryOverText,
  carryOverBtn, newTaskInput, newTaskGoalSelect, addTaskBtn, taskList, taskToast,
  taskToastText, taskToastUndo,
} = collectTaskElements(document);
const {
  petChoiceOnboarding, petOnboardingChoices, petOnboardingConfirm,
  longGoalOnboarding, longGoalOnboardingForm,
} = collectOnboardingElements(document);
const {
  goalInput, goalProgressText, goalProgressFill, recordsList, clearRecordsBtn,
  profileClearRecordsBtn, profileInsightsBtn,
} = collectProgressElements(document);
const {
  petShell, petArt, petPicker, petName, petStatus, petStageLabel,
  petProgressFill, petLevelLabel, petXPText, evolutionHint, petTodayXP,
  streakCount, petTotalXP, xpToast, petModal, petModalClose, petModalTitle,
  petModalCopy, evolutionPreviewGrid,
} = collectPetElements(document);
const {
  focusCompleteModal, focusCompleteCopy, focusCompleteXp, focusCompletePomodoro,
  focusCompletePetArt, focusCompletePetText, focusCompleteRestHint,
  startRestFromModalBtn, skipRestFromModalBtn,
} = collectFeedbackElements(document);
const {
  reviewDateText, reviewCompletedText, reviewTopSubjectText, reviewUnfinishedText,
  reviewTomorrowText, reviewEncouragementText, reviewAdoptBtn,
} = collectReviewElements(document);
const {
  focusSessionShell, focusSessionBackBtn, focusSessionEyebrow, focusSessionTask,
  focusSessionRing, focusSessionTime, focusSessionProgress, focusSessionPet,
  focusSessionPetName, focusSessionXp, focusSessionToggleBtn, focusSessionResetBtn,
  focusSessionAbandonBtn, focusSessionFinish,
} = collectFocusSessionElements(document);
const {
  appRoot, authGate, authGateForm, authGateStatus, authGateSubmit,
  gateLoginTab, gateRegisterTab, gateNameField, gateEmailInput,
  gatePasswordInput, gateNameInput, authLocalEntry, authGateEyebrow,
  authGateHeading,
} = collectAuthElements(document);
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
  onComplete: (taskId) => taskPlanningFlow.complete(taskId),
  onDelay: (taskId) => taskPlanningFlow.delay(taskId),
});
const appNavigator = createAppNavigator({
  pages: appPages,
  buttons: pageButtons,
  onPageChange: (pageName) => pageLifecycle?.handlePageChange(pageName),
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
  onComplete: () => focusFeedbackFlow.finish(),
});
const taskToastView = createTaskToast({ root: taskToast, text: taskToastText, undoButton: taskToastUndo });
let authSessionFlow = null;
let aiReviewFlow = null;
let onboardingFlow = null;
let pageLifecycle = null;
let studyGoalsFlow = null;
let focusFeedbackFlow = null;
let taskPlanningFlow = null;
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
  accountMount,
  handlers: {
    onModeChange: (mode) => authSessionFlow.setMode(mode),
    onSubmit: (credentials) => authSessionFlow.authenticate(credentials),
    onLocalEntry: () => authSessionFlow.enterLocal(),
    onLogout: () => authSessionFlow.logout(),
    onModeToggle: () => authSessionFlow.toggleMode(),
    onSync: () => authSessionFlow.sync("正在手动同步...")
      .catch((error) => authSessionFlow.setSyncStatus(error.message, true)),
  },
});

const authController = createAuthController({
  storage: localStorage,
  sessionStorage,
  sessionKey: AUTH_SESSION_KEY,
  localAccessKey: AUTH_LOCAL_SESSION_KEY,
  getRepository: () => cloudRepository,
  performSync: (message, options) => authSessionFlow.sync(message, options),
  onChange: (state) => authSessionFlow.refreshUI(state),
  onReset: () => authSessionFlow.resetCloudState(),
  setBusy: (busy) => authView.setBusy(busy),
  setFeedback: (message, isError) => authSessionFlow.setFeedback(message, isError),
  clearPassword: () => authView.clearPassword(),
});
const apiRequest = createApiClient({ getToken: () => authController.getSession()?.token });
const cloudRepository = createCloudRepository(apiRequest);
authSessionFlow = createAuthSessionFlow({
  getController: () => authController,
  view: authView,
  getCloudStats: () => cloudStatsController,
  getAiReview: () => aiReviewController,
  getAiFlow: () => aiReviewFlow,
  getOnboarding: () => onboardingFlow,
  getData: () => todayData,
  switchPage: (...args) => switchPage(...args),
  quickTaskInput: homeQuickTaskInput,
  pull: pullCloudState,
  push: syncLocalStateToCloud,
  window,
});
const aiReviewController = createAiReviewController({
  getRepository: () => cloudRepository,
  isEnabled: () => authSessionFlow.isCloudEnabled(),
  onChange: () => aiReviewFlow?.render(),
});
let dataPageView = null;
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
  isEnabled: () => authSessionFlow.isCloudEnabled(),
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
  onExpired: () => focusFeedbackFlow.finish({ silent: true }),
});
const taskStore = createTaskStore({
  storage: localStorage,
  plansKey: DAILY_PLANS_KEY,
  deletedKey: DELETED_TASKS_KEY,
});
const syncOutbox = createSyncOutbox({ storage: localStorage, key: SYNC_OUTBOX_KEY });
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
  renderGoals: () => studyGoalsFlow.render(),
});
const studySyncController = createStudySyncController({
  repository: cloudRepository,
  outbox: syncOutbox,
  taskStore,
  isEnabled: () => authSessionFlow.isCloudEnabled(),
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
  getTodayTasks: () => taskPlanningFlow.getTodayTasks(),
  getTasks: (dateKey) => taskStore.getTasks(dateKey),
  getTodayKey,
  getTomorrowKey,
  addTaskToDate,
  savePlans: saveDailyPlans,
  renderAi: () => aiReviewFlow?.render(),
  renderReview: renderReviewPage,
  showToast: showTaskToast,
  runCloudSync,
  uploadTasks: () => studySyncController.uploadTasks(),
  createTask: (task, dateKey) => studySyncController.createTask(task, dateKey),
  applyCreatedTask: (task, remoteTask) => studySyncController.applyCreatedTask(task, remoteTask),
  getStudyGoals: () => studyGoals,
});
aiReviewFlow = createAiReviewFlow({
  reviewPage,
  controller: aiReviewController,
  planController: aiPlanController,
  isCloudEnabled: () => authSessionFlow.isCloudEnabled(),
  getDateKey: getTodayKey,
  openAccount: openSettingsDrawer,
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
  renderGoals: () => studyGoalsFlow?.render(),
  updateOptions: () => studyGoalsFlow?.updateCurrentOptions(),
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
  renderTasks: () => taskPlanningFlow.render(),
  renderCurrentOptions: () => taskPlanningFlow.updateCurrentOptions({
    canChange: !timerEngine.getState().running && timerEngine.getState().mode === "focus",
  }),
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
taskPlanningFlow = createTaskPlanningFlow({
  elements: {
    todayDateText,
    planProgressText,
    taskList,
    planExpandButton: planExpandBtn,
    currentTaskSelect,
    carryOverBanner,
    carryOverText,
    newTaskInput,
    newTaskGoalSelect,
    homeQuickTaskInput,
    homeQuickTaskGoalSelect,
  },
  taskStore,
  taskSwipeController,
  getTaskController: () => taskController,
  getData: () => todayData,
  getGoals: () => studyGoals,
  getTodayKey,
  getYesterdayKey,
  formatPlanDate,
  saveData: saveTodayData,
  ensureLongGoal: () => onboardingFlow.ensureLongGoal(),
  showToast: showTaskToast,
  switchPage,
});
studyGoalsFlow = createStudyGoalsFlow({
  listMount: insightsPage,
  currentGoalMount: focusSettingsBody,
  getController: () => goalController,
  getGoals: () => studyGoals,
  getData: () => todayData,
  saveData: saveTodayData,
  ensureLongGoal: () => onboardingFlow.ensureLongGoal(),
  taskController,
  syncSettings: syncSettingsToCloud,
  runCloudSync,
  taskGoalSelects: [homeQuickTaskGoalSelect, newTaskGoalSelect],
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
  closeCompletion: () => focusFeedbackFlow.close(),
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
  uploadFocusSession: (focusRecord) => studySyncController.syncFocusRecord(focusRecord),
  syncPet: syncPetToCloud,
  syncSettings: syncSettingsToCloud,
  pullCloudState,
  refreshStats: () => cloudStatsController.load(cloudStatsController.getRange(), { silent: true }),
  generateAiSummary: () => aiReviewFlow.generate({ auto: true }),
  playFinishSound,
  showNotification,
  setRestType,
  normalizeRestType,
  render,
  showPetReward: (result) => focusFeedbackFlow.showPetReward(result),
  setStatus: (message) => { statusText.textContent = message; },
  openCompletion: (result, restType) => focusFeedbackFlow.open(result, restType),
  closeCompletion: () => focusFeedbackFlow.close(),
  buildCompletionMessage: (...args) => focusFeedbackFlow.buildCompleteMessage(...args),
  scheduleCompletion: (open) => focusFeedbackFlow.schedule(open),
});

focusFeedbackFlow = createFocusFeedbackFlow({
  elements: {
    modal: focusCompleteModal,
    copy: focusCompleteCopy,
    xp: focusCompleteXp,
    pomodoro: focusCompletePomodoro,
    petArt: focusCompletePetArt,
    petText: focusCompletePetText,
    restHint: focusCompleteRestHint,
    startRestButton: startRestFromModalBtn,
    xpToast,
    petStatus,
  },
  getData: () => todayData,
  getFocusFlow: () => focusFlowController,
  getTimerController: () => timerController,
  getPageLifecycle: () => pageLifecycle,
  focusSessionView: focusSessionPageView,
  switchPage,
});

const renderCoordinator = createRenderCoordinator({
  elements: {
    home: {
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
      aiPlanBannerText,
    },
    review: {
      dateText: reviewDateText,
      completedText: reviewCompletedText,
      topSubjectText: reviewTopSubjectText,
      unfinishedText: reviewUnfinishedText,
      tomorrowText: reviewTomorrowText,
      encouragementText: reviewEncouragementText,
      adoptButton: reviewAdoptBtn,
    },
    timerSummary: roundSettingsSummary,
    goalProgressText,
    goalProgressFill,
    records: recordsList,
    getDataView: () => dataPageView,
    getReviewTask: () => aiReviewFlow.getReviewSuggestion(),
    onSelectPet: selectPetType,
    getPetDescription,
  },
  timerEngine,
  timerView: timerPanelView,
  focusSessionView: focusSessionPageView,
  petView: petPageView,
  statsController: cloudStatsController,
  getData: () => todayData,
  getGoals: () => studyGoals,
  getTasks: () => taskPlanningFlow.getTodayTasks(),
  getModes: () => MODES,
  getRestMinutes,
  getMessageIndex: () => homePetMessageIndex,
  formatDate: formatPlanDate,
  saveData: saveTodayData,
  renderTasks: () => taskPlanningFlow.render(),
  renderGoals: () => studyGoalsFlow?.render(),
  updateTaskOptions: () => taskPlanningFlow.updateCurrentOptions({
    canChange: !timerEngine.getState().running && timerEngine.getState().mode === "focus",
  }),
  updateGoalOptions: () => studyGoalsFlow.updateCurrentOptions(),
  renderDiagnosis: renderStudyDiagnosis,
  renderAi: () => aiReviewFlow.render(),
  showToast: showTaskToast,
  document,
});

onboardingFlow = createOnboardingFlow({
  elements: {
    petRoot: petChoiceOnboarding,
    petChoices: petOnboardingChoices,
    petConfirm: petOnboardingConfirm,
    goalRoot: longGoalOnboarding,
    goalForm: longGoalOnboardingForm,
  },
  authController,
  petController,
  getData: () => todayData,
  getGoals: () => studyGoals,
  addGoal: (...args) => studyGoalsFlow.add(...args),
  saveData: saveTodayData,
  render,
  isCloudEnabled: () => authSessionFlow.isCloudEnabled(),
  syncPet: syncPetToCloud,
  syncAll: (...args) => authSessionFlow.sync(...args),
  showToast: showTaskToast,
  window,
});

pageLifecycle = createPageLifecycle({
  navigator: appNavigator,
  focusSession: focusSessionController,
  isCloudEnabled: () => authSessionFlow.isCloudEnabled(),
  statsController: cloudStatsController,
  renderReview: renderReviewPage,
  aiFlow: aiReviewFlow,
  getCompletedCount: () => todayData.completedCount,
});

configureRuntime({
  modes: MODES,
  data: todayData,
  getRestMinutes,
  timerEngine,
  activeTimerController,
  focusDurationInput,
  restDurationSelect,
  goalInput,
  normalizeRestType,
  applyTheme,
});
startApplication({
  setupLayout: setupTodayPageLayout,
  render,
  switchPage,
  initialPage: pageLifecycle.getInitialPage(),
  setupViews: [
    aiReviewFlow.setup,
    setupCloudStatsUI,
    studyGoalsFlow.setupList,
    onboardingFlow.setupPetChoice,
    onboardingFlow.setupLongGoal,
    setupStudyDiagnosisUI,
    studyGoalsFlow.setupCurrentGoal,
  ],
  placeUtilities: placeDataUtilitiesLast,
  refreshAuth: authSessionFlow.refreshUI,
  bootstrapSession: authSessionFlow.bootstrap,
  startCompanion: () => homePetCompanionController.start(),
});

bindAppEvents({
  elements: {
    startBtn, pauseBtn, resetBtn, abandonBtn, clearRecordsBtn, profileClearRecordsBtn,
    themeToggle, profileThemeBtn, homeFocusBtn, homeAddTaskBtn, homeInsightsBtn,
    profileInsightsBtn, focusDurationInput, restDurationSelect, currentTaskSelect,
    addTaskBtn, newTaskInput, homeQuickTaskBtn, homeReviewBtn, homeQuickTaskInput,
    carryOverBtn, planExpandBtn, petShell, petModalClose, petModal, focusCompleteModal,
    startRestFromModalBtn, skipRestFromModalBtn, focusSessionBackBtn,
    focusSessionToggleBtn, focusSessionResetBtn, focusSessionAbandonBtn, reviewAdoptBtn,
    goalInput,
  },
  handlers: {
    startTimer,
    pauseTimer,
    resetTimer,
    abandonTimer: abandonCurrentRound,
    clearRecords: clearTodayRecords,
    toggleTheme,
    startNextHomeFocus: taskPlanningFlow.startNext,
    switchPage,
    updateFocusDuration,
    updateRestDuration,
    updateCurrentTaskSelection: taskPlanningFlow.updateCurrentSelection,
    addTask: taskPlanningFlow.handleAdd,
    handleTaskKeydown: taskPlanningFlow.handleNewTaskKeydown,
    addQuickTask: taskPlanningFlow.handleQuickAdd,
    carryOverTasks: taskPlanningFlow.carryOver,
    togglePlan: taskPlanningFlow.toggleExpansion,
    openPetModal,
    handlePetKeydown: handlePetShellKeydown,
    closePetModal,
    handlePetBackdrop: handlePetModalBackdrop,
    handleFocusBackdrop: focusFeedbackFlow.handleBackdrop,
    startRest: focusFeedbackFlow.startRest,
    skipRest: focusFeedbackFlow.skipRest,
    exitFocus: exitFocusSession,
    toggleFocus: toggleFocusSessionTimer,
    resetFocus: resetFocusSession,
    abandonFocus: abandonFocusSession,
    adoptReviewTomorrowTask: () => aiReviewFlow.adoptReviewSuggestion(),
    updateDailyGoal: () => {},
    handleDocumentKeydown,
    handleBeforeUnload: pageLifecycle.handleBeforeUnload,
    handleOnline: () => authSessionFlow.sync("网络已恢复，正在补传离线记录...")
      .catch((error) => authSessionFlow.setSyncStatus(error.message, true)),
  },
  document,
  window,
  timerEngine,
});
homeAddTaskBtn?.addEventListener("click", () => {
  switchPage("tasks");
  newTaskInput.focus();
});
// Remaining UI events are registered by bindAppEvents above.
// Home quick-add keyboard handling is registered in bindEvents.
// Remaining controls are bound by bindAppEvents().

function updateDailyGoal() {
  const nextGoal = Number(goalInput.value);
  todayData.dailyGoal = Number.isFinite(nextGoal) && nextGoal > 0
    ? Math.min(Math.floor(nextGoal), 24)
    : DEFAULT_GOAL;
  goalInput.value = todayData.dailyGoal;
  saveTodayData();
  renderGoalProgress();
}


registerServiceWorker(navigator, window);

function setupTodayPageLayout() {
  setupAppLayout({
    todayTaskMount,
    planCard,
    todayTimerMount,
    timerCard,
    reviewPage,
    recordsCard,
  });
}

function placeDataUtilitiesLast() {
  placeSettingsUtilities({
    mount: settingsDrawerMount,
    accountMount,
    settingsCard,
    studyGoalsPanel: studyGoalsFlow.getPanel(),
  });
}

function openSettingsDrawer() {
  settingsDrawerView.open();
}

function closeSettingsDrawer() {
  settingsDrawerView.close();
}

function setupCloudStatsUI() {
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
    todayTasks: taskPlanningFlow.getTodayTasks(),
    recentPlans: getRecentPlanSummaries(7),
    studyGoals: goalsWithLocalProgress,
  });
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
    enabled: authSessionFlow.isCloudEnabled(),
    action,
    onSuccess: () => authSessionFlow.setSyncStatus("已同步"),
    onError: (error) => authSessionFlow.setSyncStatus(error.message, true),
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

function showTaskToast(message, undoCallback) {
  taskToastView.show(message, undoCallback);
}

function hideTaskToast() {
  taskToastView.hide();
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
  return pageLifecycle.switchPage(pageName, options);
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

function handleDocumentKeydown(event) {
  if (event.key === "Escape" && settingsDrawerView.isOpen()) {
    closeSettingsDrawer();
    return;
  }

  if (event.key === "Escape" && petPageView.isPreviewOpen()) {
    closePetModal();
  }

  if (event.key === "Escape") focusFeedbackFlow.handleEscape();
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
  return renderCoordinator.renderAll();
}

function ensureCurrentTaskSelection() {
  return renderCoordinator.ensureCurrentTask();
}

function renderHomePage() {
  return renderCoordinator.renderHome();
}

function renderTimerAndProgress() {
  return renderCoordinator.renderTimer();
}

function updateStartButtonState() {
  renderTimerAndProgress();
}

function getStartableFocusTask() {
  return renderCoordinator.getStartableTask();
}

function ensureStartableFocusTask() {
  return renderCoordinator.ensureStartableTask();
}

function renderStats() {
  return renderCoordinator.renderStats();
}

function renderGoalProgress() {
  return renderCoordinator.renderGoalProgress();
}

function renderRecords() {
  return renderCoordinator.renderRecords();
}

function renderReviewPage() {
  return renderCoordinator.renderReview();
}

function renderPetPicker() {
  return renderCoordinator.renderPetPicker();
}

function updatePetUI() {
  return renderCoordinator.renderPet();
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
  themeColorMeta?.setAttribute(
    "content",
    isDark ? "#111c1a" : "#25635a"
  );
}
