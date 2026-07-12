import assert from "node:assert/strict";
import test from "node:test";
import { createAiReviewController } from "../js/aiController.js";

test("AI review controller owns loading, ready, and reset states", async () => {
  const states = [];
  const repository = {
    getDailySummary: async () => ({ summary: { overview: "steady" }, generatedAt: "2026-07-12T10:00:00Z" }),
    generateDailySummary: async (_dateKey, force) => ({ summary: { tomorrowPlan: [force ? "数学" : "英语"] } }),
  };
  const controller = createAiReviewController({
    getRepository: () => repository,
    isEnabled: () => true,
    onChange: (state) => states.push(state.status),
  });

  assert.equal(await controller.load("2026-07-12"), true);
  assert.equal(controller.getState().data.overview, "steady");
  assert.equal(await controller.generate("2026-07-12", { force: true }), true);
  assert.deepEqual(controller.getState().data.tomorrowPlan, ["数学"]);
  assert.deepEqual(states, ["ready", "loading", "ready"]);
  controller.reset();
  assert.equal(controller.getState().status, "idle");
});

test("AI review controller translates missing server configuration into user copy", async () => {
  const repository = {
    generateDailySummary: async () => {
      const error = new Error("internal");
      error.code = "AI_NOT_CONFIGURED";
      throw error;
    },
  };
  const controller = createAiReviewController({
    getRepository: () => repository,
    isEnabled: () => true,
  });
  assert.equal(await controller.generate("2026-07-12"), false);
  assert.match(controller.getState().error, /AI 复盘尚未开启/);
});
