import assert from "node:assert/strict";
import test from "node:test";
import { createFocusFlowController } from "../js/focusFlowController.js";

test("focus flow delegates the completion transaction and opens rest feedback", () => {
  const calls = [];
  const data = { nextRestType: "short" };
  const engine = {
    getState: () => ({ mode: "focus" }),
    setMode: (...args) => calls.push(["mode", ...args]),
  };
  const controller = createFocusFlowController({
    engine,
    modes: { focus: { minutes: 50 }, rest: { minutes: 5 } },
    getData: () => data,
    pauseSilently: () => calls.push(["pause"]),
    completeSession: () => ({ record: { id: "focus" }, reward: { totalXP: 50 }, nextRestType: "short" }),
    createRecordId: () => "focus",
    getTodayKey: () => "2026-07-12",
    saveData: () => calls.push(["save"]),
    runCloudSync: () => calls.push(["sync"]),
    uploadFocusSession: async () => ({ focusSession: { id: "server" } }),
    syncPet: async () => {},
    syncSettings: async () => {},
    pullCloudState: async () => {},
    refreshStats: async () => {},
    generateAiSummary: async () => {},
    playFinishSound: () => calls.push(["sound"]),
    showNotification: () => calls.push(["notification"]),
    setRestType: (type) => calls.push(["restType", type]),
    normalizeRestType: (type) => type,
    render: () => calls.push(["render"]),
    showPetReward: () => calls.push(["reward"]),
    setStatus: (message) => calls.push(["status", message]),
    openCompletion: () => calls.push(["open"]),
    closeCompletion: () => calls.push(["close"]),
    buildCompletionMessage: () => "完成",
    scheduleCompletion: (open) => {
      calls.push(["schedule"]);
      open();
    },
  });

  const result = controller.finish();
  assert.equal(result.mode, "focus");
  assert.ok(calls.some(([name]) => name === "sync"));
  assert.ok(calls.some(([name]) => name === "open"));
  assert.ok(calls.findIndex(([name]) => name === "schedule") < calls.findIndex(([name]) => name === "open"));
  assert.ok(calls.some(([name, value]) => name === "status" && value === "完成"));
  assert.equal(controller.startRest(), "short");
  assert.ok(calls.some(([name, mode, seconds]) => name === "mode" && mode === "rest" && seconds === 300));
});
