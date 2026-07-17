import assert from "node:assert/strict";
import test from "node:test";
import { buildTaskCardHtml } from "../js/components/taskCard.js";

const escapeHtml = (value) => String(value);

test("unfinished task menu provides non-gesture completion and delay actions", () => {
  const html = buildTaskCardHtml({
    task: { id: "task-1", title: "英语阅读", completed: false },
    completedTime: "",
    escapeHtml,
  });

  assert.match(html, /data-action="complete"/);
  assert.match(html, /data-action="delay"/);
  assert.match(html, /data-action="edit"/);
  assert.match(html, /data-action="delete"/);
});

test("completed task card stays quiet and omits unfinished actions", () => {
  const html = buildTaskCardHtml({
    task: { id: "task-1", title: "英语阅读", completed: true },
    completedTime: "19:30",
    escapeHtml,
  });

  assert.match(html, /data-action="restore"/);
  assert.doesNotMatch(html, /左滑完成|data-action="complete"|完成！/);
});
