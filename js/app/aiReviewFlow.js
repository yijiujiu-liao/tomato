import {
  getAiTomorrowAdoptionState,
  getAiTomorrowSuggestions,
} from "../aiReview.js";
import { createAiSummaryPanel } from "../components/aiSummary.js";

export function createAiReviewFlow({
  reviewPage,
  controller,
  planController,
  isCloudEnabled,
  getDateKey,
  openAccount,
}) {
  let view = null;

  function setup() {
    if (!reviewPage) return;
    view = createAiSummaryPanel({
      reviewPage,
      onGenerate: () => generate({ force: true }),
      onAdopt: adoptSuggestions,
      onOpenAccount: openAccount,
      formatGeneratedAt,
    });
    render();
  }

  function load() {
    return controller.load(getDateKey());
  }

  function generate(options = {}) {
    return controller.generate(getDateKey(), options);
  }

  function render() {
    if (!view) return;
    const state = controller.getState();
    const suggestions = getAiTomorrowSuggestions(state.data);
    view.render({
      state,
      cloudEnabled: isCloudEnabled(),
      adoptionState: getAiTomorrowAdoptionState(
        suggestions,
        planController.getAdoptionTasks(),
      ),
    });
  }

  function handleReviewPage(completedCount) {
    const state = controller.getState();
    if (isCloudEnabled() && completedCount > 0 && state.status === "idle") {
      generate({ auto: true });
    }
  }

  function adoptSuggestions() {
    return planController.adoptAiSuggestions();
  }

  return {
    adoptReviewSuggestion: () => planController.adoptReviewSuggestion(),
    adoptSuggestions,
    generate,
    getReviewSuggestion: () => planController.getReviewSuggestion(),
    handleReviewPage,
    load,
    render,
    setup,
  };
}

export function formatGeneratedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
