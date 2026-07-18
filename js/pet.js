import { EVOLUTION_STAGES, PET_TYPE_KEYS, PET_TYPES } from "./state.js";
import { normalizeNonNegativeInteger } from "./utils.js";

export function normalizePetType(typeKey) {
  return PET_TYPES[typeKey] ? typeKey : PET_TYPE_KEYS[0];
}

export function getNextLevelXP(level) {
  return 100 + (Math.max(1, Number(level) || 1) - 1) * 50;
}

export function getCumulativeXPForLevel(level) {
  let total = 0;

  for (let currentLevel = 1; currentLevel < level; currentLevel += 1) {
    total += getNextLevelXP(currentLevel);
  }

  return total;
}

export function getEvolutionStage(level) {
  return EVOLUTION_STAGES.find((stage) => level >= stage.minLevel && level <= stage.maxLevel)
    || EVOLUTION_STAGES[EVOLUTION_STAGES.length - 1];
}

export function getEvolutionHint(level) {
  const nextStage = EVOLUTION_STAGES.find((stage) => level < stage.minLevel);
  return nextStage
    ? `距离下一阶段还差 ${nextStage.minLevel - level} 级`
    : "已经是完全体，继续积累 XP";
}

export function getNextStageProgress(progress, focusMinutes) {
  const nextStage = EVOLUTION_STAGES.find((stage) => progress.level < stage.minLevel);

  if (!nextStage) {
    return null;
  }

  const currentTotal = getCumulativeXPForLevel(progress.level) + progress.currentXP;
  const requiredTotal = getCumulativeXPForLevel(nextStage.minLevel);
  const xp = Math.max(0, requiredTotal - currentTotal);
  const averageXP = Math.max(1, Number(focusMinutes) || 1);
  return { xp, tomatoes: Math.max(1, Math.ceil(xp / averageXP)) };
}

export function createPetProgress(petId = PET_TYPE_KEYS[0]) {
  const normalizedPetId = normalizePetType(petId);
  return {
    petId: normalizedPetId,
    level: 1,
    currentXP: 0,
    nextLevelXP: getNextLevelXP(1),
    totalXP: 0,
    evolutionStage: getEvolutionStage(1).id,
    lastUpdated: new Date().toISOString()
  };
}

export function createPetProgressFromTotalXP(totalXP, petId = PET_TYPE_KEYS[0]) {
  const safeTotalXP = normalizeNonNegativeInteger(totalXP);
  let level = 1;
  let currentXP = safeTotalXP;
  let nextLevelXP = getNextLevelXP(level);

  while (currentXP >= nextLevelXP) {
    currentXP -= nextLevelXP;
    level += 1;
    nextLevelXP = getNextLevelXP(level);
  }

  return {
    petId: normalizePetType(petId),
    level,
    currentXP,
    nextLevelXP,
    totalXP: safeTotalXP,
    evolutionStage: getEvolutionStage(level).id
  };
}

export function normalizePetProgress(progress, fallbackPetId = PET_TYPE_KEYS[0]) {
  const reconstructed = createPetProgressFromTotalXP(
    Math.max(
      normalizeNonNegativeInteger(progress?.totalXP),
      getCumulativeXPForLevel(Math.max(1, Number(progress?.level) || 1))
        + normalizeNonNegativeInteger(progress?.currentXP)
    ),
    progress?.petId || fallbackPetId
  );

  return {
    ...reconstructed,
    lastUpdated: typeof progress?.lastUpdated === "string"
      ? progress.lastUpdated
      : new Date().toISOString()
  };
}

export function loadPetProgress(saved, fallbackPetId = PET_TYPE_KEYS[0]) {
  if (saved?.petProgress && typeof saved.petProgress === "object") {
    return normalizePetProgress(saved.petProgress, fallbackPetId);
  }

  return convertLegacyPetProgress(saved, fallbackPetId);
}

export function convertLegacyPetProgress(saved, fallbackPetId = PET_TYPE_KEYS[0]) {
  const petId = normalizePetType(saved?.selectedPet || saved?.pet?.type || fallbackPetId);
  const legacyValue = Number(
    saved?.hatchProgress
    ?? saved?.eggProgress
    ?? saved?.pet?.hatchProgress
    ?? saved?.pet?.progress
  );
  const progress = createPetProgress(petId);

  if (Number.isFinite(legacyValue) && legacyValue > 0) {
    progress.currentXP = Math.min(99, Math.round(Math.min(1, legacyValue) * 100));
    progress.totalXP = progress.currentXP;
  }

  return progress;
}

export function getStreakBonusPercent(streak) {
  return Math.min(Math.max(0, normalizeNonNegativeInteger(streak) - 1) * 5, 20);
}

export function addPetExperience(progress, amount, streak) {
  const baseXP = normalizeNonNegativeInteger(amount);
  const bonusPercent = getStreakBonusPercent(streak);
  const totalXP = Math.round(baseXP * (1 + bonusPercent / 100));
  const previousStage = getEvolutionStage(progress.level).id;
  const nextProgress = createPetProgressFromTotalXP(progress.totalXP + totalXP, progress.petId);
  nextProgress.lastUpdated = new Date().toISOString();
  const nextStage = nextProgress.evolutionStage;

  return {
    progress: nextProgress,
    reward: {
      baseXP,
      bonusPercent,
      totalXP,
      levelsGained: nextProgress.level - progress.level,
      leveledUp: nextProgress.level > progress.level,
      evolved: nextStage !== previousStage,
      level: nextProgress.level,
      evolutionStage: nextStage
    }
  };
}

export function removePetExperience(progress, amount) {
  const xp = Math.min(normalizeNonNegativeInteger(amount), progress.totalXP);
  return createPetProgressFromTotalXP(progress.totalXP - xp, progress.petId);
}

export function renderPetImage(typeKey, evolutionStageId, renderMode) {
  const pet = PET_TYPES[normalizePetType(typeKey)];
  const stageIndex = Math.max(0, Math.min(3, Number(evolutionStageId) - 1));
  const className = renderMode === "choice" ? "pet-sprite pet-sprite-small" : "pet-sprite";

  return `
    <span class="pet-frame" style="--pet-accent: ${pet.accent};">
      <img class="${className}" src="${pet.src}" alt="${pet.name}" style="--pet-stage: ${stageIndex};">
    </span>
  `;
}

export function renderPetActivity(typeKey, evolutionStageId) {
  const pet = PET_TYPES[normalizePetType(typeKey)];
  const stageIndex = Math.max(0, Math.min(3, Number(evolutionStageId) - 1));
  const stagePosition = stageIndex === 0 ? 0 : (stageIndex / 3) * 100;

  return `
    <span
      class="pet-activity-sprite"
      role="img"
      aria-label="${pet.name}正在向右走"
      style="--pet-activity-image: url('${pet.walkSrc}'); --pet-stage-position: ${stagePosition}%;"
    ></span>
  `;
}
