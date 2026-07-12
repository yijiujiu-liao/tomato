import { getEvolutionStage, normalizePetType, renderPetImage } from "../pet.js";
import { PET_TYPES, REST_DURATIONS } from "../state.js";

export function createTaskToast({ root, text, undoButton }) {
  let timer = null;
  let undo = null;
  function hide() {
    root.setAttribute("aria-hidden", "true");
    undo = null;
    undoButton.hidden = false;
    window.clearTimeout(timer);
  }
  function show(message, undoCallback) {
    text.textContent = message;
    undo = typeof undoCallback === "function" ? undoCallback : null;
    undoButton.hidden = !undo;
    root.setAttribute("aria-hidden", "false");
    window.clearTimeout(timer);
    timer = window.setTimeout(hide, 3000);
  }
  undoButton.addEventListener("click", () => undo?.());
  return { show, hide };
}

export function createFocusCompleteView(elements) {
  function open({ result, nextRestType, progress, selectedPet, completedCount, dailyGoal }) {
    const restMinutes = REST_DURATIONS[nextRestType] || REST_DURATIONS.short;
    const petId = normalizePetType(progress.petId || selectedPet);
    const petType = PET_TYPES[petId];
    const stage = getEvolutionStage(progress.level);
    const levelText = result.leveledUp ? `升级到 Lv.${result.level}` : `${stage.label}继续成长`;
    const evolutionText = result.evolved ? "，解锁了新形态" : "";
    const bonusText = result.bonusPercent > 0 ? `（含连续奖励 +${result.bonusPercent}%）` : "";
    elements.copy.textContent = buildFocusCompleteMessage(result, nextRestType);
    elements.xp.textContent = `+${result.totalXP} XP${bonusText}`;
    elements.pomodoro.textContent = `今日番茄 ${completedCount} / ${dailyGoal}`;
    elements.petArt.innerHTML = renderPetImage(petId, stage.id, "choice");
    elements.petText.textContent = `${petType.name}${levelText}${evolutionText}`;
    elements.restHint.textContent = nextRestType === "long" ? `建议长休 ${restMinutes} 分钟` : `建议休息 ${restMinutes} 分钟`;
    elements.root.inert = false;
    elements.root.setAttribute("aria-hidden", "false");
    elements.startRestButton.focus();
  }
  function close() {
    elements.root.setAttribute("aria-hidden", "true");
    elements.root.inert = true;
  }
  return { open, close, isOpen: () => elements.root.getAttribute("aria-hidden") === "false" };
}

export function createPetRewardView({ toast, status }) {
  let timer = null;
  return {
    show(result) {
      const bonus = result.bonusPercent > 0 ? `，连续专注加成 ${result.bonusPercent}%` : "";
      const level = result.leveledUp ? ` 宠物升级到 Lv.${result.level}！` : "";
      const evolution = result.evolved ? " 宠物进化了！" : "";
      toast.textContent = `+${result.totalXP} XP${bonus}`;
      toast.classList.remove("show");
      void toast.offsetWidth;
      toast.classList.add("show");
      status.textContent = `完成一个番茄钟，宠物获得了 ${result.totalXP} XP。${level}${evolution}`;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => toast.classList.remove("show"), 1800);
    },
  };
}

export function buildFocusCompleteMessage(result, nextRestType) {
  const rest = nextRestType === "long" ? "奖励自己一个 10 分钟长休息。" : "休息 5 分钟吧。";
  const level = result.leveledUp ? `宠物升级到 Lv.${result.level}！` : "距离下一次进化更近了。";
  const evolution = result.evolved ? "宠物进化了！" : "";
  const bonus = result.bonusPercent > 0 ? `连续专注额外奖励 ${result.bonusPercent}%。` : "";
  return `完成一个番茄钟，宠物获得了 ${result.totalXP} XP。${bonus}${level}${evolution} ${rest}`;
}
