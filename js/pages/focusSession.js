import { getEvolutionStage, normalizePetType, renderPetImage } from "../pet.js";
import { PET_TYPES } from "../state.js";
import { formatTime } from "../utils.js";

export function createFocusSessionPageView(elements) {
  let completionTimer = null;

  function render({
    mode,
    remainingSeconds,
    totalSeconds,
    running,
    taskTitle,
    progress,
    selectedPet,
  }) {
    const elapsedPercent = Math.min(100, Math.max(0, (1 - remainingSeconds / totalSeconds) * 100));
    const isIdle = !running && remainingSeconds >= totalSeconds;
    const sessionState = running ? "running" : (isIdle ? "idle" : "paused");
    const petId = normalizePetType(progress.petId || selectedPet);
    const petType = PET_TYPES[petId];
    const stage = getEvolutionStage(progress.level);

    elements.shell.dataset.mode = mode;
    elements.shell.dataset.sessionState = sessionState;
    elements.eyebrow.textContent = mode === "rest" ? "正在休息" : (running ? "正在专注" : "专注已暂停");
    elements.task.textContent = mode === "rest" ? "让大脑安静恢复一下" : (taskTitle || "当前专注任务");
    elements.time.textContent = formatTime(remainingSeconds);
    elements.progress.textContent = mode === "rest"
      ? `休息 ${Math.round(elapsedPercent)}%`
      : `本轮 ${Math.round(elapsedPercent)}%`;
    elements.ring.style.setProperty("--session-progress", `${elapsedPercent * 3.6}deg`);
    elements.toggle.textContent = running
      ? "暂停"
      : (mode === "rest" ? "继续休息" : (isIdle ? "开始专注" : "继续专注"));
    elements.pet.innerHTML = renderPetImage(petId, stage.id, "choice");
    elements.petName.textContent = mode === "rest" ? `${petType.name}也在恢复` : `${petType.name}陪你专注`;
    elements.xp.textContent = `当前 ${progress.currentXP} / ${progress.nextLevelXP} XP`;
    document.title = `${formatTime(remainingSeconds)} - ${mode === "rest" ? "休息" : taskTitle || "专注"}`;
  }

  function showCompletion(duration = 1100) {
    window.clearTimeout(completionTimer);
    elements.finish.inert = false;
    elements.finish.setAttribute("aria-hidden", "false");
    return new Promise((resolve) => {
      completionTimer = window.setTimeout(() => {
        hideCompletion();
        resolve();
      }, duration);
    });
  }

  function hideCompletion() {
    window.clearTimeout(completionTimer);
    elements.finish.setAttribute("aria-hidden", "true");
    elements.finish.inert = true;
  }

  return { render, showCompletion, hideCompletion };
}
