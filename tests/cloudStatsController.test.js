import assert from "node:assert/strict";
import test from "node:test";
import { createCloudStatsController } from "../js/cloudStatsController.js";

test("cloud stats controller owns range loading and local fallback", async () => {
  let enabled = true;
  const renders = [];
  const controller = createCloudStatsController({
    isEnabled: () => enabled,
    fetchStats: async (range) => ({ range, totals: { focusMinutes: 80 } }),
    getView: () => ({
      renderStats: (payload) => renders.push(payload),
    }),
    getLocalTotals: () => ({ focusMinutes: 25 }),
  });

  assert.equal(await controller.load("month"), true);
  assert.equal(controller.getState().status, "ready");
  assert.equal(controller.getState().data.range, "month");
  assert.deepEqual(renders.map((item) => item.stats.status), ["loading", "ready"]);

  enabled = false;
  assert.equal(await controller.load("day"), false);
  assert.equal(controller.getState().status, "idle");
  assert.equal(renders.at(-1).cloudEnabled, false);
});

test("cloud stats controller retains the previous data on refresh errors", async () => {
  let shouldFail = false;
  const controller = createCloudStatsController({
    isEnabled: () => true,
    fetchStats: async () => {
      if (shouldFail) throw new Error("暂时不可用");
      return { totals: { focusMinutes: 50 } };
    },
    getView: () => null,
    getLocalTotals: () => ({}),
  });

  await controller.load("week");
  const previousData = controller.getState().data;
  shouldFail = true;
  assert.equal(await controller.load("week", { silent: true }), false);
  assert.equal(controller.getState().status, "error");
  assert.equal(controller.getState().data, previousData);
});
