import assert from "node:assert/strict";
import test from "node:test";
import { createAuthController } from "../js/authController.js";

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

test("auth controller owns login mode, session persistence, and local access", async () => {
  const storage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  const events = [];
  const repository = {
    authenticate: async (mode, credentials) => {
      events.push(`auth:${mode}:${credentials.email}`);
      return {
        user: { id: "user-1", email: credentials.email },
        token: "token-1",
        expiresAt: "2026-08-01T00:00:00.000Z",
      };
    },
    logout: async () => events.push("logout"),
  };
  const controller = createAuthController({
    storage,
    sessionStorage,
    sessionKey: "auth",
    localAccessKey: "local",
    getRepository: () => repository,
    performSync: async (_message, options) => events.push(`sync:${options.cloudFirst}`),
    onChange: () => events.push("change"),
    setBusy: (value) => events.push(`busy:${value}`),
  });

  controller.enterLocal();
  assert.equal(controller.getState().localAccessGranted, true);
  controller.setMode("register");
  assert.equal(await controller.authenticate({
    email: "student@example.com",
    password: "password123",
    displayName: "Student",
  }), true);
  assert.equal(controller.getState().localAccessGranted, false);
  assert.equal(controller.getSession().token, "token-1");
  assert.equal(JSON.parse(storage.getItem("auth")).session.token, "token-1");
  assert.ok(events.includes("sync:false"));

  controller.markSynced(new Date("2026-07-12T10:00:00.000Z"));
  assert.equal(controller.getSession().lastSyncedAt, "2026-07-12T10:00:00.000Z");
  await controller.logout();
  assert.equal(controller.getSession(), null);
  assert.equal(storage.getItem("auth"), null);
});
