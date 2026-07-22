export function collectAppElements(document) {
  return {
    appRoot: document.querySelector("#appRoot"),
    authGate: document.querySelector("#authGate"),
    petChoiceOnboarding: document.querySelector("#petChoiceOnboarding"),
    longGoalOnboarding: document.querySelector("#longGoalOnboarding"),
    settingsDrawer: document.querySelector("#settingsDrawer"),
    timerCard: document.querySelector(".timer-card"),
    appPages: document.querySelectorAll(".app-page"),
    navigationButtons: document.querySelectorAll(".nav-btn"),
    accountMount: document.querySelector("#accountMount") || document.querySelector(".hero"),
    planCard: document.querySelector(".plan-card"),
    reviewPage: document.querySelector('.app-page[data-page="review"]'),
    insightsPage: document.querySelector('.app-page[data-page="data"]'),
    recordsCard: document.querySelector(".records-card"),
    settingsCard: document.querySelector(".settings-card"),
    focusSettingsBody: document.querySelector(".focus-round-settings-body"),
    themeColorMeta: document.querySelector("meta[name='theme-color']"),
  };
}

export function collectHomeElements(document) {
  return {
    todayTaskMount: document.querySelector("#todayTaskMount"),
    todayTimerMount: document.querySelector("#todayTimerMount"),
    homeDateText: document.querySelector("#homeDateText"),
    homePetCompanion: document.querySelector("#homePetCompanion"),
    homePetArt: document.querySelector("#homePetArt"),
    homePetMessage: document.querySelector("#homePetMessage"),
    homeNextTaskTitle: document.querySelector("#homeNextTaskTitle"),
    homeNextTaskHint: document.querySelector("#homeNextTaskHint"),
    homeQuickTask: document.querySelector("#homeQuickTask"),
    homeQuickTaskInput: document.querySelector("#homeQuickTaskInput"),
    homeQuickTaskBtn: document.querySelector("#homeQuickTaskBtn"),
    homeQuickTaskGoalSelect: document.querySelector("#homeQuickTaskGoalSelect"),
    homeReviewBtn: document.querySelector("#homeReviewBtn"),
    aiPlanBanner: document.querySelector("#aiPlanBanner"),
    aiPlanBannerTitle: document.querySelector("#aiPlanBannerTitle"),
    aiPlanBannerText: document.querySelector("#aiPlanBannerText"),
    homeFocusBtn: document.querySelector("#homeFocusBtn"),
    homeAddTaskBtn: document.querySelector("#homeAddTaskBtn"),
    homeInsightsBtn: document.querySelector("#homeInsightsBtn"),
    roundSettingsSummary: document.querySelector("#roundSettingsSummary"),
    currentTaskSelect: document.querySelector("#currentTaskSelect"),
  };
}

export function collectTaskElements(document) {
  return {
    todayDateText: document.querySelector("#todayDateText"),
    planProgressText: document.querySelector("#planProgressText"),
    planExpandBtn: document.querySelector("#planExpandBtn"),
    carryOverBanner: document.querySelector("#carryOverBanner"),
    carryOverText: document.querySelector("#carryOverText"),
    carryOverBtn: document.querySelector("#carryOverBtn"),
    newTaskInput: document.querySelector("#newTaskInput"),
    newTaskGoalSelect: document.querySelector("#newTaskGoalSelect"),
    addTaskBtn: document.querySelector("#addTaskBtn"),
    taskList: document.querySelector("#taskList"),
    taskToast: document.querySelector("#taskToast"),
    taskToastText: document.querySelector("#taskToastText"),
    taskToastUndo: document.querySelector("#taskToastUndo"),
  };
}

export function collectOnboardingElements(document) {
  return {
    petChoiceOnboarding: document.querySelector("#petChoiceOnboarding"),
    petOnboardingChoices: document.querySelector("#petOnboardingChoices"),
    petOnboardingConfirm: document.querySelector("#petOnboardingConfirm"),
    longGoalOnboarding: document.querySelector("#longGoalOnboarding"),
    longGoalOnboardingForm: document.querySelector("#longGoalOnboardingForm"),
  };
}

export function collectProgressElements(document) {
  return {
    goalInput: document.querySelector("#goalInput"),
    goalProgressText: document.querySelector("#goalProgressText"),
    goalProgressFill: document.querySelector("#goalProgressFill"),
    recordsList: document.querySelector("#recordsList"),
    clearRecordsBtn: document.querySelector("#clearRecordsBtn"),
    profileClearRecordsBtn: document.querySelector("#profileClearRecordsBtn"),
    profileInsightsBtn: document.querySelector("#profileInsightsBtn"),
  };
}

export function collectFeedbackElements(document) {
  return {
    focusCompleteModal: document.querySelector("#focusCompleteModal"),
    focusCompleteCopy: document.querySelector("#focusCompleteCopy"),
    focusCompleteXp: document.querySelector("#focusCompleteXp"),
    focusCompletePomodoro: document.querySelector("#focusCompletePomodoro"),
    focusCompletePetArt: document.querySelector("#focusCompletePetArt"),
    focusCompletePetText: document.querySelector("#focusCompletePetText"),
    focusCompleteRestHint: document.querySelector("#focusCompleteRestHint"),
    startRestFromModalBtn: document.querySelector("#startRestFromModalBtn"),
    skipRestFromModalBtn: document.querySelector("#skipRestFromModalBtn"),
  };
}

export function collectReviewElements(document) {
  return {
    reviewDateText: document.querySelector("#reviewDateText"),
    reviewCompletedText: document.querySelector("#reviewCompletedText"),
    reviewTopSubjectText: document.querySelector("#reviewTopSubjectText"),
    reviewUnfinishedText: document.querySelector("#reviewUnfinishedText"),
    reviewTomorrowText: document.querySelector("#reviewTomorrowText"),
    reviewEncouragementText: document.querySelector("#reviewEncouragementText"),
    reviewAdoptBtn: document.querySelector("#reviewAdoptBtn"),
  };
}

export function collectSettingsElements(document) {
  return {
    themeToggle: document.querySelector("#themeToggle"),
    profileThemeBtn: document.querySelector("#profileThemeBtn"),
    settingsDrawer: document.querySelector("#settingsDrawer"),
    settingsDrawerMount: document.querySelector("#settingsDrawerMount"),
    openSettingsBtn: document.querySelector("#openSettingsBtn"),
    closeSettingsBtn: document.querySelector("#closeSettingsBtn"),
  };
}

export function collectTimerElements(document) {
  return {
    timerCard: document.querySelector(".timer-card"),
    timerDisplay: document.querySelector("#timerDisplay"),
    timerProgressFill: document.querySelector("#timerProgressFill"),
    timerProgressText: document.querySelector("#timerProgressText"),
    statusText: document.querySelector("#statusText"),
    startBtn: document.querySelector("#startBtn"),
    pauseBtn: document.querySelector("#pauseBtn"),
    resetBtn: document.querySelector("#resetBtn"),
    abandonBtn: document.querySelector("#abandonBtn"),
    modeButtons: document.querySelectorAll(".mode-btn"),
    focusDurationInput: document.querySelector("#focusDurationInput"),
    restDurationSelect: document.querySelector("#restDurationSelect"),
    restTypeLabel: document.querySelector("#restTypeLabel"),
    restCopy: document.querySelector("#restCopy"),
  };
}

export function collectFocusSessionElements(document) {
  return {
    focusSessionShell: document.querySelector("#focusSessionShell"),
    focusSessionBackBtn: document.querySelector("#focusSessionBackBtn"),
    focusSessionEyebrow: document.querySelector("#focusSessionEyebrow"),
    focusSessionTask: document.querySelector("#focusSessionTask"),
    focusSessionRing: document.querySelector("#focusSessionRing"),
    focusSessionTime: document.querySelector("#focusSessionTime"),
    focusSessionProgress: document.querySelector("#focusSessionProgress"),
    focusSessionPet: document.querySelector("#focusSessionPet"),
    focusSessionPetName: document.querySelector("#focusSessionPetName"),
    focusSessionXp: document.querySelector("#focusSessionXp"),
    focusSessionToggleBtn: document.querySelector("#focusSessionToggleBtn"),
    focusSessionResetBtn: document.querySelector("#focusSessionResetBtn"),
    focusSessionAbandonBtn: document.querySelector("#focusSessionAbandonBtn"),
    focusSessionFinish: document.querySelector("#focusSessionFinish"),
  };
}

export function collectAuthElements(document) {
  return {
    appRoot: document.querySelector("#appRoot"),
    authGate: document.querySelector("#authGate"),
    authGateForm: document.querySelector("#authGateForm"),
    authGateStatus: document.querySelector("#authGateStatus"),
    authGateSubmit: document.querySelector("#authGateSubmit"),
    gateLoginTab: document.querySelector("#gateLoginTab"),
    gateRegisterTab: document.querySelector("#gateRegisterTab"),
    gateNameField: document.querySelector("#gateNameField"),
    gateEmailInput: document.querySelector("#gateEmailInput"),
    gatePasswordInput: document.querySelector("#gatePasswordInput"),
    gateNameInput: document.querySelector("#gateNameInput"),
    authLocalEntry: document.querySelector("#authLocalEntry"),
    authGateEyebrow: document.querySelector("#authGateEyebrow"),
    authGateHeading: document.querySelector("#authGateHeading"),
  };
}

export function collectPetElements(document) {
  return {
    petShell: document.querySelector("#petShell"),
    petArt: document.querySelector("#petArt"),
    petPicker: document.querySelector("#petPicker"),
    petName: document.querySelector("#petName"),
    petStatus: document.querySelector("#petStatus"),
    petStageLabel: document.querySelector("#petStageLabel"),
    petProgressFill: document.querySelector("#petProgressFill"),
    petLevelLabel: document.querySelector("#petLevelLabel"),
    petXPText: document.querySelector("#petXPText"),
    evolutionHint: document.querySelector("#evolutionHint"),
    petTodayXP: document.querySelector("#petTodayXP"),
    streakCount: document.querySelector("#streakCount"),
    petTotalXP: document.querySelector("#petTotalXP"),
    xpToast: document.querySelector("#xpToast"),
    petModal: document.querySelector("#petModal"),
    petModalClose: document.querySelector("#petModalClose"),
    petModalTitle: document.querySelector("#petModalTitle"),
    petModalCopy: document.querySelector("#petModalCopy"),
    evolutionPreviewGrid: document.querySelector("#evolutionPreviewGrid"),
  };
}
