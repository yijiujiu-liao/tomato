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
        session: {
          authMode: "cookie",
          expiresAt: "2026-08-01T00:00:00.000Z",
        },
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
  assert.equal(controller.getSession().authMode, "cookie");
  assert.equal(JSON.parse(storage.getItem("auth")).session.token, undefined);
  assert.ok(events.includes("sync:false"));

  controller.markSynced(new Date("2026-07-12T10:00:00.000Z"));
  assert.equal(controller.getSession().lastSyncedAt, "2026-07-12T10:00:00.000Z");
  await controller.logout();
  assert.equal(controller.getSession(), null);
  assert.equal(storage.getItem("auth"), null);
});

function createStoredSession(storage) {
  storage.setItem("auth", JSON.stringify({
    user: { id: "user-1", email: "student@example.com" },
    session: { token: "token-1", expiresAt: "2026-08-01T00:00:00.000Z" },
  }));
}

test("temporary sync failures keep a valid login session", async () => {
  const storage = new MemoryStorage();
  createStoredSession(storage);
  const feedback = [];
  const controller = createAuthController({
    storage,
    sessionStorage: new MemoryStorage(),
    sessionKey: "auth",
    localAccessKey: "local",
    getRepository: () => ({
      getSession: async () => { throw new Error("service warming up"); },
    }),
    performSync: async () => { throw new Error("service warming up"); },
    setFeedback: (message) => feedback.push(message),
  });

  assert.equal(await controller.bootstrap(), false);
  assert.equal(controller.getSession().token, "token-1");
  assert.match(feedback.at(-1), /保留登录状态/);
});

test("authentication failures clear an expired session", async () => {
  const storage = new MemoryStorage();
  createStoredSession(storage);
  const error = Object.assign(new Error("unauthorized"), { status: 401 });
  const controller = createAuthController({
    storage,
    sessionStorage: new MemoryStorage(),
    sessionKey: "auth",
    localAccessKey: "local",
    getRepository: () => ({
      getSession: async () => { throw error; },
    }),
  });

  assert.equal(await controller.bootstrap(), false);
  assert.equal(controller.getSession(), null);
  assert.equal(storage.getItem("auth"), null);
});

test("successful login survives a temporary first sync failure", async () => {
  const storage = new MemoryStorage();
  const controller = createAuthController({
    storage,
    sessionStorage: new MemoryStorage(),
    sessionKey: "auth",
    localAccessKey: "local",
    getRepository: () => ({
      authenticate: async () => ({
        user: { id: "user-1", email: "student@example.com" },
        session: {
          authMode: "cookie",
          expiresAt: "2026-08-01T00:00:00.000Z",
        },
      }),
    }),
    performSync: async () => { throw new Error("temporary sync failure"); },
  });

  assert.equal(await controller.authenticate({
    email: "student@example.com",
    password: "password123",
    displayName: "",
  }), true);
  assert.equal(controller.getSession().authMode, "cookie");
});

test("cookie session is restored on a browser cold start", async () => {
  const storage = new MemoryStorage();
  const controller = createAuthController({
    storage,
    sessionStorage: new MemoryStorage(),
    sessionKey: "auth",
    localAccessKey: "local",
    getRepository: () => ({
      getSession: async () => ({
        user: { id: "user-1", email: "student@example.com" },
        session: { authMode: "cookie", expiresAt: "2026-08-01T00:00:00.000Z" },
      }),
    }),
    performSync: async () => {},
  });

  assert.equal(await controller.bootstrap(), true);
  assert.equal(controller.isCloudEnabled(), true);
  assert.equal(controller.getSession().authMode, "cookie");
  assert.equal(JSON.parse(storage.getItem("auth")).session.token, undefined);
});

test("authentication rejects malformed passwords before calling the API", async () => {
  let requestCount = 0;
  const feedback = [];
  const controller = createAuthController({
    storage: new MemoryStorage(),
    sessionStorage: new MemoryStorage(),
    sessionKey: "auth",
    localAccessKey: "local",
    getRepository: () => ({
      authenticate: async () => {
        requestCount += 1;
        return {
          user: { id: "user-1", email: "student@example.com" },
          token: "token-1",
        };
      },
    }),
    setFeedback: (message, isError) => feedback.push({ message, isError }),
  });

  assert.equal(await controller.authenticate({
    email: "student@example.com",
    password: null,
  }), false);
  assert.equal(requestCount, 0);
  assert.equal(feedback.at(-1).isError, true);
});
