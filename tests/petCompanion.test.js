import assert from "node:assert/strict";
import test from "node:test";
import {
  createPetCompanionController,
  getPetSpeechDelay,
} from "../js/components/petCompanion.js";

test("pet companion keeps encouragement calm and infrequent", () => {
  assert.equal(getPetSpeechDelay(() => 0, true), 6500);
  assert.equal(getPetSpeechDelay(() => 1, true), 10000);
  assert.equal(getPetSpeechDelay(() => 0), 16000);
  assert.equal(getPetSpeechDelay(() => 1), 28000);
});

test("pet companion walks continuously and speaks on a quiet schedule", () => {
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
  assert.equal(element.dataset.action, "walk");
  assert.equal(element.dataset.speaking, "false");
  assert.equal(timers[0].delay, 6500);

  timers[0].callback();
  assert.equal(element.dataset.action, "walk");
  assert.equal(element.dataset.speaking, "true");
  assert.equal(speechCount, 1);
  assert.ok(timers.some((timer) => timer.delay === 4600));
  assert.ok(timers.some((timer) => timer.delay === 16000));

  const speechTimer = timers.find((timer) => timer.delay === 4600);
  speechTimer.callback();
  assert.equal(element.dataset.speaking, "false");

  controller.stop();
  assert.equal(element.dataset.action, "idle");
  assert.equal(element.dataset.speaking, "false");
  assert.ok(cleared.size > 0);
});
