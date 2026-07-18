const PET_ACTIONS = Object.freeze({
  walk: { name: "walk", duration: 3600 },
  glance: { name: "glance", duration: 1600 },
  stretch: { name: "stretch", duration: 1900 },
  hop: { name: "hop", duration: 1750 },
  celebrate: { name: "celebrate", duration: 2200 },
});

const ACTIONS_BY_MOOD = Object.freeze({
  waiting: ["walk", "walk", "glance", "stretch"],
  ready: ["walk", "walk", "glance", "stretch", "hop"],
  happy: ["walk", "walk", "glance", "stretch", "hop", "celebrate"],
  celebrate: ["walk", "hop", "celebrate", "glance"],
});

export function getPetActionDelay(random = Math.random, initial = false) {
  const minimum = initial ? 4200 : 8500;
  const range = initial ? 2800 : 6500;
  return Math.round(minimum + Math.max(0, Math.min(1, random())) * range);
}

export function pickPetAction({
  mood = "ready",
  previousAction = "",
  random = Math.random,
} = {}) {
  const pool = ACTIONS_BY_MOOD[mood] || ACTIONS_BY_MOOD.ready;
  const available = pool.filter((name) => name !== previousAction);
  const candidates = available.length > 0 ? available : pool;
  const index = Math.min(
    candidates.length - 1,
    Math.floor(Math.max(0, Math.min(0.999999, random())) * candidates.length)
  );
  return PET_ACTIONS[candidates[index]];
}

export function shouldShowPetSpeech(actionsSinceSpeech, random = Math.random) {
  if (actionsSinceSpeech >= 3) return true;
  return actionsSinceSpeech >= 2 && random() < 0.35;
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
  let actionTimer = null;
  let speechTimer = null;
  let previousAction = "";
  let actionsSinceSpeech = 1;

  function clearTimer(timerId) {
    if (timerId !== null) clearTimeoutFn(timerId);
  }

  function setIdle() {
    if (!element) return;
    element.dataset.action = "idle";
  }

  function hideSpeech() {
    if (!element) return;
    element.dataset.speaking = "false";
  }

  function scheduleNext(initial = false) {
    clearTimer(scheduleTimer);
    if (!running) return;
    scheduleTimer = setTimeoutFn(playNext, getPetActionDelay(random, initial));
  }

  function playNext() {
    scheduleTimer = null;
    if (!running) return;

    if (!element || !isActive()) {
      scheduleNext();
      return;
    }

    const action = pickPetAction({
      mood: element.dataset.mood,
      previousAction,
      random,
    });
    previousAction = action.name;
    actionsSinceSpeech += 1;
    element.dataset.action = action.name;

    if (action.name !== "walk" && shouldShowPetSpeech(actionsSinceSpeech, random)) {
      actionsSinceSpeech = 0;
      onSpeak();
      element.dataset.speaking = "true";
      clearTimer(speechTimer);
      speechTimer = setTimeoutFn(() => {
        speechTimer = null;
        hideSpeech();
      }, 4600);
    }

    clearTimer(actionTimer);
    actionTimer = setTimeoutFn(() => {
      actionTimer = null;
      setIdle();
      scheduleNext();
    }, action.duration);
  }

  function start() {
    if (running) return;
    running = true;
    setIdle();
    hideSpeech();
    scheduleNext(true);
  }

  function stop() {
    running = false;
    clearTimer(scheduleTimer);
    clearTimer(actionTimer);
    clearTimer(speechTimer);
    scheduleTimer = null;
    actionTimer = null;
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
