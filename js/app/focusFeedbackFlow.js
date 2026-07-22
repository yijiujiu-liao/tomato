import {
  buildFocusCompleteMessage,
  createFocusCompleteView,
  createPetRewardView,
} from "../components/feedback.js";

export function createFocusFeedbackFlow({
  elements,
  getData,
  getFocusFlow,
  getTimerController,
  getPageLifecycle,
  focusSessionView,
  switchPage,
}) {
  const completionView = createFocusCompleteView({
    root: elements.modal,
    copy: elements.copy,
    xp: elements.xp,
    pomodoro: elements.pomodoro,
    petArt: elements.petArt,
    petText: elements.petText,
    restHint: elements.restHint,
    startRestButton: elements.startRestButton,
  });
  const petRewardView = createPetRewardView({
    toast: elements.xpToast,
    status: elements.petStatus,
  });

  function open(result, nextRestType) {
    const data = getData();
    completionView.open({
      result,
      nextRestType,
      progress: data.petProgress,
      selectedPet: data.selectedPet,
      completedCount: data.completedCount,
      dailyGoal: data.dailyGoal,
    });
  }

  function close() {
    completionView.close();
  }

  function startRest() {
    const restType = getFocusFlow().startRest();
    getTimerController().start();
    switchPage("focus-session", { force: true });
    return restType;
  }

  function skipRest() {
    const result = getFocusFlow().skipRest();
    switchPage("home", { force: true });
    return result;
  }

  function finish(options = {}) {
    const result = getFocusFlow().finish(options);
    if (result.mode === "rest") switchPage("home", { force: true });
    return result;
  }

  function schedule(openCompletion) {
    if (getPageLifecycle().getCurrentPage() !== "focus-session") {
      openCompletion();
      return;
    }
    focusSessionView.showCompletion().then(openCompletion);
  }

  function handleBackdrop(event) {
    if (event.target === elements.modal) skipRest();
  }

  function handleEscape() {
    if (!completionView.isOpen()) return false;
    skipRest();
    return true;
  }

  return {
    open,
    close,
    startRest,
    skipRest,
    finish,
    schedule,
    handleBackdrop,
    handleEscape,
    isOpen: completionView.isOpen,
    showPetReward: petRewardView.show,
    buildCompleteMessage: buildFocusCompleteMessage,
  };
}
