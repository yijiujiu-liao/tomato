import { normalizeTodayPetXP } from "./focusRecords.js";
import { normalizePetProgress, normalizePetType } from "./pet.js";
import { mergeCloudStudyGoals, mergeCloudTasks, mergeTodayFocusRecords } from "./sync.js";
import { normalizeFocusDuration, normalizeGoal, normalizeRestType } from "./utils.js";

export function createCloudStateApplier({
  getData,
  taskStore,
  getGoals,
  setGoals,
  getTodayKey,
  modes,
  timerEngine,
  focusDurationInput,
  restDurationSelect,
  goalInput,
  getRestMinutes,
  applyTheme,
  saveData,
  savePlans,
  saveGoals,
  renderGoals,
}) {
  function settings(settingsValue) {
    if (!settingsValue) return;
    const data = getData();
    data.focusDuration = normalizeFocusDuration(settingsValue.focusDuration);
    data.dailyGoal = normalizeGoal(settingsValue.dailyGoal);
    data.theme = settingsValue.theme === "dark" ? "dark" : "light";
    data.nextRestType = normalizeRestType(settingsValue.nextRestType);
    data.currentTaskId = typeof settingsValue.currentTaskId === "string" ? settingsValue.currentTaskId : "";
    data.currentStudyGoalId = typeof settingsValue.currentStudyGoalId === "string" ? settingsValue.currentStudyGoalId : "";
    data.longGoalOnboardingCompleted = Boolean(
      settingsValue.longGoalOnboardingCompleted || data.longGoalOnboardingCompleted
    );
    data.settingsUpdatedAt = typeof settingsValue.updatedAt === "string" ? settingsValue.updatedAt : "";
    modes.focus.minutes = data.focusDuration;
    modes.rest.minutes = getRestMinutes();
    if (timerEngine.getState().mode === "focus" && !timerEngine.isRunning()) {
      timerEngine.setRemaining(modes.focus.minutes * 60);
    }
    focusDurationInput.value = data.focusDuration;
    restDurationSelect.value = data.nextRestType;
    goalInput.value = data.dailyGoal;
    applyTheme(data.theme);
    saveData(false);
  }

  function pet(petValue) {
    if (!petValue) return;
    const data = getData();
    const petId = normalizePetType(petValue.petId);
    data.selectedPet = petId;
    data.petChoiceCompleted = Boolean(petValue.choiceCompleted || data.petChoiceCompleted);
    data.petProgress = normalizePetProgress({
      petId,
      level: petValue.level,
      currentXP: petValue.currentXP,
      totalXP: petValue.totalXP,
      lastUpdated: petValue.updatedAt,
    }, petId);
    data.todayPetXP = normalizeTodayPetXP(data.todayPetXP, data.petProgress.totalXP);
    saveData(false);
  }

  function tasks(tasksValue) {
    if (!Array.isArray(tasksValue)) return;
    taskStore.replacePlans(mergeCloudTasks({
      cloudTasks: tasksValue,
      dailyPlans: taskStore.getPlans(),
      deletedTaskIds: taskStore.getDeletedIds(),
      todayKey: getTodayKey(),
    }));
    savePlans();
  }

  function studyGoals(goalsValue) {
    if (!Array.isArray(goalsValue)) return;
    setGoals(mergeCloudStudyGoals(goalsValue, getGoals()));
    saveGoals();
    renderGoals();
  }

  function focusSessions(sessions) {
    if (!Array.isArray(sessions)) return;
    Object.assign(getData(), mergeTodayFocusRecords(sessions, getData().records, getTodayKey()));
    saveData(false);
  }

  return { settings, pet, tasks, studyGoals, focusSessions };
}
