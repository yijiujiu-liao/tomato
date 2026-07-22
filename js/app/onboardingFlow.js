import { createLongGoalOnboarding } from "../components/longGoalOnboarding.js";
import { createPetChoiceOnboarding } from "../components/petChoiceOnboarding.js";

export function createOnboardingFlow({
  elements,
  authController,
  petController,
  getData,
  getGoals,
  addGoal,
  saveData,
  render,
  isCloudEnabled,
  syncPet,
  syncAll,
  showToast,
  window,
}) {
  let petView = null;
  let longGoalView = null;

  function setupPetChoice() {
    petView = createPetChoiceOnboarding({
      root: elements.petRoot,
      choices: elements.petChoices,
      confirmButton: elements.petConfirm,
      onConfirm: submitPetChoice,
    });
  }

  function setupLongGoal() {
    longGoalView = createLongGoalOnboarding({
      root: elements.goalRoot,
      form: elements.goalForm,
      onSubmit: submitLongGoal,
    });
  }

  async function submitPetChoice(petId) {
    const selected = petController.select(petId);
    const data = getData();
    data.petChoiceCompleted = true;
    saveData(false);
    render();
    if (isCloudEnabled()) await syncPet();
    showToast(`${selected.name}成为了你的备考伙伴。`);
    window.setTimeout(ensureLongGoal, 80);
    return true;
  }

  function ensureFirstRun() {
    const authState = authController.getState();
    const hasAccess = authState.localAccessGranted || Boolean(authState.session?.token);
    if (!hasAccess || !petView || !longGoalView) return;
    const data = getData();
    if (!data.petChoiceCompleted) {
      longGoalView.close();
      const currentPet = data.petProgress.totalXP > 0 ? data.selectedPet : "";
      petView.open(currentPet);
      return;
    }
    petView.close();
    ensureLongGoal();
  }

  async function submitLongGoal(input) {
    const deadline = new Date(`${input.targetDate}T00:00:00`);
    const weeks = Math.max(
      1,
      Math.ceil((deadline.getTime() - Date.now()) / (7 * 86400000)),
    );
    const goal = addGoal({
      ...input,
      targetMinutes: Math.min(99999, input.weeklyTargetMinutes * weeks),
    });
    if (!goal) return false;
    const data = getData();
    data.currentStudyGoalId = goal.id;
    data.longGoalOnboardingCompleted = true;
    saveData(false);
    render();
    if (isCloudEnabled()) await syncAll("正在同步你的长期目标...");
    showToast("长期目标已建立。接下来每个番茄都会留下方向。");
    return true;
  }

  function ensureLongGoal() {
    const authState = authController.getState();
    const hasAccess = authState.localAccessGranted || Boolean(authState.session?.token);
    if (!hasAccess || !longGoalView) return;
    const data = getData();
    if (getGoals().some((goal) => !goal.completed)) {
      if (!data.longGoalOnboardingCompleted) {
        data.longGoalOnboardingCompleted = true;
        saveData(false);
      }
      longGoalView.close();
      return;
    }
    longGoalView.open({
      message: data.longGoalOnboardingCompleted
        ? "当前没有进行中的长期目标，请先重新建立方向。"
        : "",
    });
  }

  return {
    ensureFirstRun,
    ensureLongGoal,
    setupLongGoal,
    setupPetChoice,
  };
}
