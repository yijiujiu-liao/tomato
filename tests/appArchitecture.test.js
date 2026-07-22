import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { bindAppEvents } from "../js/app/bindEvents.js";
import { createAiReviewFlow } from "../js/app/aiReviewFlow.js";
import { createAuthSessionFlow } from "../js/app/authSessionFlow.js";
import { configureRuntime, startApplication } from "../js/app/bootstrap.js";
import { collectAppElements, collectHomeElements } from "../js/app/dom.js";
import { createFocusFeedbackFlow } from "../js/app/focusFeedbackFlow.js";
import { createOnboardingFlow } from "../js/app/onboardingFlow.js";
import { createPageLifecycle } from "../js/app/pageLifecycle.js";
import { createRenderCoordinator } from "../js/app/renderCoordinator.js";
import { createStudyGoalsFlow } from "../js/app/studyGoalsFlow.js";
import { createTaskPlanningFlow } from "../js/app/taskPlanningFlow.js";

test("application composition modules expose a valid import graph", () => {
  assert.equal(typeof bindAppEvents, "function");
  assert.equal(typeof createAiReviewFlow, "function");
  assert.equal(typeof createAuthSessionFlow, "function");
  assert.equal(typeof configureRuntime, "function");
  assert.equal(typeof startApplication, "function");
  assert.equal(typeof collectAppElements, "function");
  assert.equal(typeof collectHomeElements, "function");
  assert.equal(typeof createRenderCoordinator, "function");
  assert.equal(typeof createFocusFeedbackFlow, "function");
  assert.equal(typeof createOnboardingFlow, "function");
  assert.equal(typeof createPageLifecycle, "function");
  assert.equal(typeof createStudyGoalsFlow, "function");
  assert.equal(typeof createTaskPlanningFlow, "function");
});

test("application remains a composition root instead of reclaiming feature UI", () => {
  const source = readFileSync(resolve("application.js"), "utf8");

  assert.match(source, /createTaskPlanningFlow/);
  assert.match(source, /createStudyGoalsFlow/);
  assert.match(source, /createFocusFeedbackFlow/);
  assert.doesNotMatch(source, /createTasksPageController/);
  assert.doesNotMatch(source, /createStudyGoalsView/);
  assert.doesNotMatch(source, /function renderTaskPage/);
  assert.doesNotMatch(source, /function openFocusCompleteModal/);
});

test("stylesheet entrypoint uses owned layers without a catch-all override file", () => {
  const source = readFileSync(resolve("style.css"), "utf8");
  const expectedLayers = [
    "css/foundation/surface.css",
    "css/components/navigation.css",
    "css/components/drawer.css",
    "css/pages/home.css",
    "css/pages/pet.css",
    "css/pages/insights.css",
    "css/pages/auth.css",
  ];

  expectedLayers.forEach((layer) => assert.match(source, new RegExp(layer.replaceAll("/", "\\/"))));
  assert.doesNotMatch(source, /product-surface\.css/);
});
