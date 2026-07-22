export function bindAppEvents({ elements, handlers, document, window, timerEngine }) {
  const {
    startBtn,
    pauseBtn,
    resetBtn,
    abandonBtn,
    clearRecordsBtn,
    profileClearRecordsBtn,
    themeToggle,
    profileThemeBtn,
    homeFocusBtn,
    homeAddTaskBtn,
    homeInsightsBtn,
    profileInsightsBtn,
    focusDurationInput,
    restDurationSelect,
    currentTaskSelect,
    addTaskBtn,
    newTaskInput,
    homeQuickTaskBtn,
    homeReviewBtn,
    homeQuickTaskInput,
    carryOverBtn,
    planExpandBtn,
    petShell,
    petModalClose,
    petModal,
    focusCompleteModal,
    startRestFromModalBtn,
    skipRestFromModalBtn,
    focusSessionBackBtn,
    focusSessionToggleBtn,
    focusSessionResetBtn,
    focusSessionAbandonBtn,
    reviewAdoptBtn,
    goalInput,
  } = elements;

  startBtn.addEventListener("click", handlers.startTimer);
  pauseBtn.addEventListener("click", handlers.pauseTimer);
  resetBtn.addEventListener("click", handlers.resetTimer);
  abandonBtn.addEventListener("click", handlers.abandonTimer);
  clearRecordsBtn.addEventListener("click", handlers.clearRecords);
  profileClearRecordsBtn?.addEventListener("click", handlers.clearRecords);
  themeToggle.addEventListener("click", handlers.toggleTheme);
  profileThemeBtn?.addEventListener("click", handlers.toggleTheme);
  homeFocusBtn?.addEventListener("click", handlers.startNextHomeFocus);
  homeAddTaskBtn?.addEventListener("click", () => {
    handlers.switchPage("tasks");
    newTaskInput.focus();
  });
  homeInsightsBtn?.addEventListener("click", () => handlers.switchPage("data"));
  profileInsightsBtn?.addEventListener("click", () => handlers.switchPage("data"));
  focusDurationInput.addEventListener("change", handlers.updateFocusDuration);
  restDurationSelect.addEventListener("change", handlers.updateRestDuration);
  currentTaskSelect.addEventListener("change", handlers.updateCurrentTaskSelection);
  addTaskBtn.addEventListener("click", handlers.addTask);
  newTaskInput.addEventListener("keydown", handlers.handleTaskKeydown);
  homeQuickTaskBtn?.addEventListener("click", handlers.addQuickTask);
  homeReviewBtn?.addEventListener("click", () => handlers.switchPage("review"));
  homeQuickTaskInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") handlers.addQuickTask();
  });
  carryOverBtn.addEventListener("click", handlers.carryOverTasks);
  planExpandBtn?.addEventListener("click", handlers.togglePlan);
  petShell.addEventListener("click", handlers.openPetModal);
  petShell.addEventListener("keydown", handlers.handlePetKeydown);
  petModalClose.addEventListener("click", handlers.closePetModal);
  petModal.addEventListener("click", handlers.handlePetBackdrop);
  focusCompleteModal.addEventListener("click", handlers.handleFocusBackdrop);
  startRestFromModalBtn.addEventListener("click", handlers.startRest);
  skipRestFromModalBtn.addEventListener("click", handlers.skipRest);
  focusSessionBackBtn.addEventListener("click", handlers.exitFocus);
  focusSessionToggleBtn.addEventListener("click", handlers.toggleFocus);
  focusSessionResetBtn.addEventListener("click", handlers.resetFocus);
  focusSessionAbandonBtn.addEventListener("click", handlers.abandonFocus);
  reviewAdoptBtn?.addEventListener("click", handlers.adoptReviewTomorrowTask);
  goalInput.addEventListener("input", handlers.updateDailyGoal);
  document.addEventListener("keydown", handlers.handleDocumentKeydown);
  document.addEventListener("visibilitychange", () => {
    if (timerEngine.isRunning()) timerEngine.tick();
  });
  window.addEventListener("beforeunload", handlers.handleBeforeUnload);
  window.addEventListener("online", handlers.handleOnline);
}
