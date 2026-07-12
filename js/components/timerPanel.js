import { formatTime, normalizeRestType } from "../utils.js";

export function createTimerPanel({ elements, onModeChange }) {
  const {
    card,
    display,
    progressFill,
    progressText,
    statusText,
    startButton,
    modeButtons,
    restTypeLabel,
    restCopy
  } = elements;

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => onModeChange(button.dataset.mode));
  });

  return {
    render({ mode, remainingSeconds, totalSeconds, hasTask, running, restType, restMinutes }) {
      const text = formatTime(remainingSeconds);
      const progress = Math.min(100, Math.max(0, (1 - remainingSeconds / totalSeconds) * 100));
      const timerState = running ? "running" : (remainingSeconds < totalSeconds ? "paused" : "idle");

      card.dataset.mode = mode;
      card.dataset.timerState = timerState;
      display.textContent = text;
      progressFill.style.width = `${progress}%`;
      progressText.textContent = `本轮已完成 ${Math.round(progress)}%`;
      document.title = `${text} - 考研番茄钟`;
      startButton.disabled = mode === "focus" && !hasTask;
      startButton.textContent = timerState === "paused"
        ? "继续"
        : (mode === "rest" ? "开始休息" : "开始");

      if (mode === "focus" && !hasTask && !running) {
        statusText.textContent = "先写下今天要完成的一件事";
      }

      renderModeButtons(modeButtons, mode);
      renderRestCopy({ restTypeLabel, restCopy, restType, restMinutes });
    }
  };
}

function renderModeButtons(buttons, mode) {
  buttons.forEach((button) => {
    button.textContent = button.dataset.mode === "focus" ? "专注" : "休息";
    button.classList.toggle("active", button.dataset.mode === mode);
  });
}

function renderRestCopy({ restTypeLabel, restCopy, restType, restMinutes }) {
  const normalizedType = normalizeRestType(restType);
  restTypeLabel.textContent = normalizedType === "long"
    ? `长休 ${restMinutes} 分钟`
    : `短休 ${restMinutes} 分钟`;
  restCopy.textContent = normalizedType === "long"
    ? "这是一段认真赢来的长休息。站起来，伸展一下，让眼睛离开屏幕。"
    : "把手机放低一点，肩膀松开，慢慢呼吸。";
}
