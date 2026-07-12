import {
  addPetExperience,
  createPetProgress,
  getEvolutionStage,
  normalizePetType,
  removePetExperience,
} from "./pet.js";
import { MOTIVATION_TEXTS, PET_TYPES } from "./state.js";
import { normalizeNonNegativeInteger } from "./utils.js";
import { normalizeTodayPetXP } from "./focusRecords.js";

export function createPetController({ getData, save }) {
  function select(typeKey) {
    const data = getData();
    const petId = normalizePetType(typeKey);
    data.selectedPet = petId;
    data.petProgress = createPetProgress(petId);
    data.todayPetXP = 0;
    save();
    return { petId, name: PET_TYPES[petId].name };
  }

  function addXP(amount) {
    const data = getData();
    const { progress, reward } = addPetExperience(data.petProgress, amount, data.streak);
    data.petProgress = progress;
    data.todayPetXP = normalizeNonNegativeInteger(data.todayPetXP) + reward.totalXP;
    save();
    return reward;
  }

  function removeXP(amount) {
    const data = getData();
    const xp = Math.min(normalizeNonNegativeInteger(amount), data.petProgress.totalXP);
    if (xp <= 0) return 0;
    data.petProgress = {
      ...removePetExperience(data.petProgress, xp),
      lastUpdated: new Date().toISOString(),
    };
    data.todayPetXP = normalizeTodayPetXP(
      Math.max(0, normalizeNonNegativeInteger(data.todayPetXP) - xp),
      data.petProgress.totalXP,
    );
    save();
    return xp;
  }

  function getDescription() {
    const progress = getData().petProgress;
    const stage = getEvolutionStage(progress.level);
    const encouragement = MOTIVATION_TEXTS[progress.totalXP % MOTIVATION_TEXTS.length];
    return `${stage.label}成长中。${encouragement}`;
  }

  return { select, addXP, removeXP, getDescription };
}
