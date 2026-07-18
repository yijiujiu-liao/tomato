import assert from "node:assert/strict";
import test from "node:test";
import {
  createPetCompanionController,
  getPetActionDelay,
  pickPetAction,
  shouldShowPetSpeech,
} from "../js/components/petCompanion.js";

test("pet companion chooses finite actions without an immediate repeat", () => {
  const first = pickPetAction({ mood: "ready", random: () => 0 });
  const second = pickPetAction({
    mood: "ready",
    previousAction: first.name,
    random: () => 0,
  });

  assert.equal(first.name, "walk");
  assert.equal(first.duration, 3600);
  assert.notEqual(second.name, first.name);
});

test("pet companion keeps action delays calm and speech infrequent", () => {
  assert.equal(getPetActionDelay(() => 0, true), 4200);
  assert.equal(getPetActionDelay(() => 1, true), 7000);
  assert.equal(getPetActionDelay(() => 0), 8500);
  assert.equal(getPetActionDelay(() => 1), 15000);
  assert.equal(shouldShowPetSpeech(1, () => 0), false);
  assert.equal(shouldShowPetSpeech(2, () => 0), true);
  assert.equal(shouldShowPetSpeech(3, () => 1), true);
});

test("pet companion returns to a still idle state after each action", () => {
  const timers = [];
  const cleared = new Set();
  const element = { dataset: { mood: "ready" } };
  let speechCount = 0;
  const controller = createPetCompanionController({
    element,
    random: () => 0,
    onSpeak: () => { speechCount += 1; },
    setTimeoutFn: (callback, delay) => {
      const id = timers.length;
      timers.push({ callback, delay });
      return id;
    },
    clearTimeoutFn: (id) => cleared.add(id),
  });

  controller.start();
  assert.equal(element.dataset.action, "idle");
  assert.equal(element.dataset.speaking, "false");
  assert.equal(timers[0].delay, 4200);

  timers[0].callback();
  assert.equal(element.dataset.action, "walk");
  assert.equal(element.dataset.speaking, "false");
  assert.equal(speechCount, 0);

  const actionTimer = timers.find((timer) => timer.delay === 3600);
  actionTimer.callback();
  assert.equal(element.dataset.action, "idle");
  assert.ok(timers.some((timer) => timer.delay === 8500));

  controller.stop();
  assert.equal(element.dataset.action, "idle");
  assert.equal(element.dataset.speaking, "false");
  assert.ok(cleared.size > 0);
});
