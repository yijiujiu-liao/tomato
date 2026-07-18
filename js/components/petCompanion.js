export function getPetSpeechDelay(random = Math.random, initial = false) {
  const minimum = initial ? 6500 : 16000;
  const range = initial ? 3500 : 12000;
  return Math.round(minimum + Math.max(0, Math.min(1, random())) * range);
}

export function createPetCompanionController({
  element,
  isActive = () => true,
  onSpeak = () => {},
  random = Math.random,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
} = {}) {
  let running = false;
  let scheduleTimer = null;
  let speechTimer = null;

  function clearTimer(timerId) {
    if (timerId !== null) clearTimeoutFn(timerId);
  }

  function setIdle() {
    if (element) element.dataset.action = "idle";
  }

  function hideSpeech() {
    if (element) element.dataset.speaking = "false";
  }

  function scheduleNext(initial = false) {
    clearTimer(scheduleTimer);
    if (!running) return;
    scheduleTimer = setTimeoutFn(playNext, getPetSpeechDelay(random, initial));
  }

  function playNext() {
    scheduleTimer = null;
    if (!running) return;

    if (!element || !isActive()) {
      scheduleNext();
      return;
    }

    element.dataset.action = "walk";
    onSpeak();
    element.dataset.speaking = "true";
    clearTimer(speechTimer);
    speechTimer = setTimeoutFn(() => {
      speechTimer = null;
      hideSpeech();
    }, 4600);
    scheduleNext();
  }

  function start() {
    if (running) return;
    running = true;
    if (element) element.dataset.action = "walk";
    hideSpeech();
    scheduleNext(true);
  }

  function stop() {
    running = false;
    clearTimer(scheduleTimer);
    clearTimer(speechTimer);
    scheduleTimer = null;
    speechTimer = null;
    setIdle();
    hideSpeech();
  }

  return {
    start,
    stop,
    playNext,
  };
}
