import { normalizeFocusRecord, inferTodayPetXP, normalizeTodayPetXP } from "./focusRecords.js";
import { createPetProgress, loadPetProgress, normalizePetType } from "./pet.js";
import { DEFAULT_FOCUS_MINUTES, DEFAULT_GOAL, PET_TYPE_KEYS } from "./state.js";
import { saveJson } from "./storage.js";
import { normalizeActiveTimer } from "./timer.js";
import {
  normalizeFocusDuration,
  normalizeGoal,
  normalizeNonNegativeInteger,
  normalizeRestType,
} from "./utils.js";

export function createTodayStore({ storage, key, getDateKey }) {
  function createDefaultData(date = getDateKey()) {
    const selectedPet = PET_TYPE_KEYS[0];
    return {
      date,
      completedCount: 0,
      focusMinutes: 0,
      streak: 0,
      currentTask: "",
      currentTaskId: "",
      currentStudyGoalId: "",
      longGoalOnboardingCompleted: false,
      dailyGoal: DEFAULT_GOAL,
      focusDuration: DEFAULT_FOCUS_MINUTES,
      nextRestType: "short",
      theme: "light",
      records: [],
      todayPetXP: 0,
      selectedPet,
      petProgress: createPetProgress(selectedPet),
      activeTimer: null,
    };
  }

  function load() {
    const today = getDateKey();
    const defaultData = createDefaultData(today);
    try {
      const saved = JSON.parse(storage.getItem(key));
      if (!saved) return defaultData;
      const selectedPet = normalizePetType(saved.selectedPet || saved.petProgress?.petId || saved.pet?.type);
      const petProgress = loadPetProgress(saved, selectedPet);
      if (saved.date !== today) {
        return {
          ...defaultData,
          dailyGoal: normalizeGoal(saved.dailyGoal),
          focusDuration: normalizeFocusDuration(saved.focusDuration),
          theme: saved.theme === "dark" ? "dark" : "light",
          selectedPet,
          petProgress,
          activeTimer: normalizeActiveTimer(saved.activeTimer),
          longGoalOnboardingCompleted: Boolean(saved.longGoalOnboardingCompleted),
        };
      }
      return {
        ...defaultData,
        ...saved,
        streak: normalizeNonNegativeInteger(saved.streak),
        currentTaskId: typeof saved.currentTaskId === "string" ? saved.currentTaskId : "",
        currentStudyGoalId: typeof saved.currentStudyGoalId === "string" ? saved.currentStudyGoalId : "",
        longGoalOnboardingCompleted: Boolean(saved.longGoalOnboardingCompleted),
        dailyGoal: normalizeGoal(saved.dailyGoal),
        focusDuration: normalizeFocusDuration(saved.focusDuration),
        nextRestType: normalizeRestType(saved.nextRestType),
        theme: saved.theme === "dark" ? "dark" : "light",
        records: Array.isArray(saved.records) ? saved.records.map(normalizeFocusRecord).filter(Boolean) : [],
        todayPetXP: normalizeTodayPetXP(saved.todayPetXP ?? inferTodayPetXP(saved.records), petProgress.totalXP),
        selectedPet,
        petProgress,
        activeTimer: normalizeActiveTimer(saved.activeTimer),
      };
    } catch (error) {
      return defaultData;
    }
  }

  return {
    load,
    save: (data) => saveJson(storage, key, data),
    createDefaultData,
  };
}
