import { EVOLUTION_STAGES, PET_TYPE_KEYS, PET_TYPES } from "../state.js";
import {
  getEvolutionHint,
  getEvolutionStage,
  getNextStageProgress,
  normalizePetType,
  renderPetImage,
} from "../pet.js";

export function createPetPageView(elements) {
  function renderPicker({ selectedPet, isLocked, onSelect }) {
    elements.picker.innerHTML = "";
    PET_TYPE_KEYS.forEach((typeKey) => {
      const petType = PET_TYPES[typeKey];
      const button = document.createElement("button");
      button.className = "pet-choice";
      button.type = "button";
      button.disabled = isLocked;
      button.setAttribute("aria-pressed", String(selectedPet === typeKey));
      button.innerHTML = `
        <span class="pet-choice-art">${renderPetImage(typeKey, 4, "choice")}</span>
        <span>${petType.name}</span>
      `;
      button.addEventListener("click", () => onSelect(typeKey));
      elements.picker.appendChild(button);
    });
  }

  function renderProgress({ progress, selectedPet, todayXP, streak, focusMinutes, description }) {
    const petId = normalizePetType(progress.petId || selectedPet);
    const petType = PET_TYPES[petId];
    const evolutionStage = getEvolutionStage(progress.level);
    const xpPercent = Math.min(100, Math.round((progress.currentXP / progress.nextLevelXP) * 100));
    const nextStage = getNextStageProgress(progress, focusMinutes);

    elements.shell.dataset.stage = evolutionStage.state;
    elements.art.innerHTML = renderPetImage(petId, evolutionStage.id);
    elements.stageLabel.textContent = evolutionStage.label;
    elements.name.textContent = petType.name;
    elements.levelLabel.textContent = `Lv.${progress.level}`;
    elements.status.textContent = description;
    elements.progressFill.style.width = `${xpPercent}%`;
    elements.xpText.textContent = `当前 ${progress.currentXP} / ${progress.nextLevelXP} XP`;
    elements.evolutionHint.textContent = nextStage
      ? `下一阶段还差 ${nextStage.xp} XP / 约 ${nextStage.tomatoes} 个番茄`
      : getEvolutionHint(progress.level);
    elements.todayXP.textContent = `今日 ${todayXP} XP`;
    elements.streak.textContent = `今日连续 ${streak}`;
    elements.totalXP.textContent = `累计 ${progress.totalXP} XP`;
  }

  function renderEvolutionPreview({ progress, selectedPet }) {
    const petId = normalizePetType(progress.petId || selectedPet);
    const petType = PET_TYPES[petId];
    const currentStage = getEvolutionStage(progress.level);
    elements.modalTitle.textContent = `${petType.name} · Lv.${progress.level}`;
    elements.modalCopy.textContent = `当前阶段：${currentStage.label}。完整完成番茄钟，继续解锁后续形态。`;
    elements.evolutionGrid.innerHTML = "";

    EVOLUTION_STAGES.forEach((stage) => {
      const isUnlocked = progress.level >= stage.minLevel;
      const item = document.createElement("article");
      item.className = "evolution-preview-item";
      item.dataset.unlocked = String(isUnlocked);
      item.dataset.current = String(currentStage.id === stage.id);
      item.innerHTML = `
        <div class="evolution-preview-art">${renderPetImage(petId, stage.id, "preview")}</div>
        <div class="evolution-preview-info">
          <strong>${stage.label}</strong>
          <span>Lv.${stage.minLevel}</span>
        </div>
        <em>${isUnlocked ? "已解锁" : "未解锁"}</em>
      `;
      elements.evolutionGrid.appendChild(item);
    });
  }

  function openPreview(state) {
    renderEvolutionPreview(state);
    elements.modalRoot.inert = false;
    elements.modalRoot.setAttribute("aria-hidden", "false");
    elements.modalClose.focus();
  }

  function closePreview() {
    elements.modalRoot.setAttribute("aria-hidden", "true");
    elements.modalRoot.inert = true;
    elements.shell.focus();
  }

  return {
    renderPicker,
    renderProgress,
    renderEvolutionPreview,
    openPreview,
    closePreview,
    isPreviewOpen: () => elements.modalRoot.getAttribute("aria-hidden") === "false",
  };
}
