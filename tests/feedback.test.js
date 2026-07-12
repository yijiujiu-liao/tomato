import assert from "node:assert/strict";
import test from "node:test";
import { buildFocusCompleteMessage } from "../js/components/feedback.js";

test("focus completion feedback includes XP, streak bonus, level, and rest guidance", () => {
  const message = buildFocusCompleteMessage({
    totalXP: 55,
    bonusPercent: 10,
    leveledUp: true,
    level: 3,
    evolved: true,
  }, "long");
  assert.match(message, /55 XP/);
  assert.match(message, /10%/);
  assert.match(message, /Lv\.3/);
  assert.match(message, /进化/);
  assert.match(message, /10 分钟长休息/);
});
