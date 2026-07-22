export function createPageLifecycle({
  navigator,
  focusSession,
  isCloudEnabled,
  statsController,
  renderReview,
  aiFlow,
  getCompletedCount,
}) {
  function switchPage(pageName, options = {}) {
    return navigator.switchPage(pageName, options);
  }

  function handlePageChange(pageName) {
    if (pageName === "data" && isCloudEnabled() && statsController.isIdle()) {
      statsController.load();
    }
    if (pageName === "review") {
      renderReview();
      aiFlow.handleReviewPage(getCompletedCount());
    }
  }

  function getCurrentPage() {
    return navigator.getCurrentPage();
  }

  function getInitialPage() {
    return focusSession.getInitialPage(getCurrentPage());
  }

  function handleBeforeUnload(event) {
    if (getCurrentPage() !== "focus-session" || !focusSession.hasInProgressSession()) {
      return;
    }
    event.preventDefault();
    event.returnValue = "";
  }

  return {
    getCurrentPage,
    getInitialPage,
    handleBeforeUnload,
    handlePageChange,
    switchPage,
  };
}
