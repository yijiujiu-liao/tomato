import assert from "node:assert/strict";
import test from "node:test";

import { createSyncOutbox, getRetryDelay } from "../js/syncOutbox.js";

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

test("outbox persists commands and compacts repeated entity writes", () => {
  const storage = new MemoryStorage();
  let id = 0;
  const outbox = createSyncOutbox({
    storage,
    key: "outbox",
    now: () => 100,
    createId: () => `entry-${++id}`,
  });

  outbox.enqueue({ type: "task.upsert", dedupeKey: "task:local-1", payload: { title: "旧标题" } });
  outbox.enqueue({ type: "task.upsert", dedupeKey: "task:local-1", payload: { title: "新标题" } });

  assert.equal(outbox.getEntries().length, 1);
  assert.equal(outbox.getEntries()[0].payload.title, "新标题");
  const restored = createSyncOutbox({ storage, key: "outbox" });
  assert.equal(restored.getEntries()[0].id, "entry-1");
});

test("outbox backs off failed commands without discarding them", () => {
  const storage = new MemoryStorage();
  let timestamp = 1000;
  const outbox = createSyncOutbox({
    storage,
    key: "outbox",
    now: () => timestamp,
    createId: () => "entry-1",
  });
  const entry = outbox.enqueue({ type: "settings.upsert", dedupeKey: "settings", payload: {} });
  outbox.markFailed(entry.id, new Error("offline"));

  assert.equal(outbox.getEntries()[0].attempts, 1);
  assert.equal(outbox.getReady().length, 0);
  timestamp += getRetryDelay(1);
  assert.equal(outbox.getReady().length, 1);
  assert.equal(outbox.getEntries()[0].lastError, "offline");
});

test("outbox never drops commands unless they succeed or are cancelled", () => {
  const storage = new MemoryStorage();
  const outbox = createSyncOutbox({ storage, key: "outbox", createId: () => "entry-1" });
  const entry = outbox.enqueue({ type: "goal.delete", dedupeKey: "goal-delete:1", payload: { goalId: "1" } });
  for (let attempt = 0; attempt < 20; attempt += 1) outbox.markFailed(entry.id, "still offline");
  assert.equal(outbox.getEntries().length, 1);
  outbox.cancel("goal-delete:1");
  assert.equal(outbox.getEntries().length, 0);
});
