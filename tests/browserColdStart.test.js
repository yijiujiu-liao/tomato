import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { chromium } from "playwright-core";

process.env.DATABASE_PATH = join(mkdtempSync(join(tmpdir(), "tomato-browser-")), "test.sqlite");

const edgePath = findEdgePath();

test("browser cold starts, restores storage, updates PWA cache, reopens offline, and fits mobile", {
  skip: edgePath ? false : "Microsoft Edge is required for browser cold-start tests.",
  timeout: 45_000,
}, async (t) => {
  const { createApp } = await import("../server/app.js");
  const { app } = createApp();
  const server = await listen(app);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: edgePath, headless: true });
  t.after(async () => {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  });

  const emptyContext = await browser.newContext();
  const emptyPage = await emptyContext.newPage();
  const emptyErrors = collectPageErrors(emptyPage);
  await emptyPage.goto(`${baseUrl}/?cold=empty#/home`, { waitUntil: "networkidle" });
  assert.equal(await emptyPage.locator("#authGate").isVisible(), true);
  assert.equal(await emptyPage.locator(".app-page.active").count(), 1);
  assert.deepEqual(emptyErrors, []);
  await emptyContext.close();

  const authContext = await browser.newContext();
  const authPage = await authContext.newPage();
  const authErrors = collectPageErrors(authPage);
  await authPage.goto(`${baseUrl}/?cold=cookie-auth#/home`, { waitUntil: "networkidle" });
  await authPage.locator("#gateRegisterTab").click();
  await authPage.locator("#gateEmailInput").fill(`browser-${Date.now()}@example.com`);
  await authPage.locator("#gatePasswordInput").fill("password123");
  await authPage.locator("#gateNameInput").fill("冷启动同学");
  await authPage.locator("#authGateSubmit").click();
  await authPage.locator("#authGate").waitFor({ state: "hidden", timeout: 8_000 });

  const browserCookies = await authContext.cookies(baseUrl);
  const sessionCookie = browserCookies.find((cookie) => cookie.name.includes("tomato_session"));
  const csrfCookie = browserCookies.find((cookie) => cookie.name.includes("tomato_csrf"));
  assert.equal(sessionCookie.httpOnly, true);
  assert.equal(sessionCookie.sameSite, "Lax");
  assert.equal(csrfCookie.httpOnly, false);
  assert.equal(await authPage.evaluate(() => document.cookie.includes("tomato_session")), false);
  assert.equal(await authPage.evaluate(() => document.cookie.includes("tomato_csrf")), true);
  const storedAuth = await authPage.evaluate(() => JSON.parse(localStorage.getItem("kaoyanPomodoroAuth")));
  assert.equal(storedAuth.session.authMode, "cookie");
  assert.equal(storedAuth.session.token, undefined);

  const setupStatuses = await authPage.evaluate(async () => {
    const csrf = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.includes("tomato_csrf="))
      ?.split("=").slice(1).join("=") || "";
    const headers = { "Content-Type": "application/json", "X-CSRF-Token": decodeURIComponent(csrf) };
    const pet = await fetch("/api/pet", {
      method: "PUT",
      headers,
      body: JSON.stringify({ petId: "penguin", choiceCompleted: true }),
    });
    const settings = await fetch("/api/settings", {
      method: "PUT",
      headers,
      body: JSON.stringify({ longGoalOnboardingCompleted: true }),
    });
    return [pet.status, settings.status];
  });
  assert.deepEqual(setupStatuses, [200, 200]);

  await authPage.reload({ waitUntil: "networkidle" });
  assert.equal(await authPage.locator("#authGate").isVisible(), false);
  assert.equal(await authPage.locator("#accountToggle").innerText(), "退出");
  await authPage.evaluate(() => document.querySelector("#accountToggle").click());
  await authPage.locator("#authGate").waitFor({ state: "visible", timeout: 8_000 });
  assert.equal(await authPage.evaluate(() => localStorage.getItem("kaoyanPomodoroAuth")), null);
  assert.equal((await authContext.cookies(baseUrl)).some((cookie) => cookie.name.includes("tomato_session")), false);
  assert.deepEqual(
    authErrors.filter((message) => !message.startsWith("Failed to load resource:")),
    [],
  );
  await authContext.close();

  const restoredContext = await browser.newContext();
  await restoredContext.addInitScript(seedExistingStudyState, createSeedData());
  const restoredPage = await restoredContext.newPage();
  const restoredErrors = collectPageErrors(restoredPage);
  await restoredPage.goto(`${baseUrl}/?cold=restored#/home`, { waitUntil: "networkidle" });
  assert.equal(await restoredPage.locator("#authGate").isVisible(), false);
  assert.equal(await restoredPage.locator("#homeNextTaskTitle").innerText(), "冷启动恢复任务");
  assert.equal(await restoredPage.locator("#timerDisplay").innerText(), "50:00");
  assert.deepEqual(restoredErrors, []);

  for (const pageName of ["pet", "review", "data", "home"]) {
    await restoredPage.locator(`[data-page-target="${pageName}"]`).click();
    assert.equal(await restoredPage.locator(".app-page.active").getAttribute("data-page"), pageName);
  }
  await restoredPage.locator("#startBtn").click();
  assert.equal(await restoredPage.locator(".app-page.active").getAttribute("data-page"), "focus-session");
  assert.equal(await restoredPage.locator(".bottom-nav").isVisible(), false);
  await restoredPage.locator("#focusSessionToggleBtn").click();
  restoredPage.once("dialog", (dialog) => dialog.accept());
  await restoredPage.locator("#focusSessionBackBtn").click();
  assert.equal(await restoredPage.locator(".app-page.active").getAttribute("data-page"), "home");

  await restoredPage.evaluate(async () => {
    await navigator.serviceWorker.ready;
    await caches.open("kaoyan-pomodoro-old-test-cache");
    const registration = await navigator.serviceWorker.getRegistration();
    await registration.unregister();
  });
  await restoredPage.reload({ waitUntil: "networkidle" });
  await restoredPage.evaluate(() => navigator.serviceWorker.ready);
  await waitFor(async () => restoredPage.evaluate(async () => {
    const keys = await caches.keys();
    return keys.includes("kaoyan-pomodoro-v80")
      && !keys.includes("kaoyan-pomodoro-old-test-cache");
  }));
  await restoredPage.reload({ waitUntil: "networkidle" });
  assert.equal(await restoredPage.evaluate(() => Boolean(navigator.serviceWorker.controller)), true);

  await restoredContext.setOffline(true);
  await restoredPage.reload({ waitUntil: "domcontentloaded" });
  assert.equal(await restoredPage.locator("#homeNextTaskTitle").innerText(), "冷启动恢复任务");
  assert.equal(await restoredPage.locator(".app-page.active").getAttribute("data-page"), "home");
  await restoredContext.setOffline(false);

  await restoredPage.setViewportSize({ width: 390, height: 844 });
  const mobileState = await restoredPage.evaluate(() => ({
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    navPosition: getComputedStyle(document.querySelector(".bottom-nav")).position,
    startButtonBottom: document.querySelector("#startBtn").getBoundingClientRect().bottom,
    viewportHeight: window.innerHeight,
  }));
  assert.equal(mobileState.horizontalOverflow, false);
  assert.equal(mobileState.navPosition, "fixed");
  assert.ok(mobileState.startButtonBottom < mobileState.viewportHeight);
  await restoredPage.locator('[data-page-target="data"]').click();
  assert.equal(await restoredPage.locator(".app-page.active").getAttribute("data-page"), "data");
  assert.equal(await restoredPage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
  assert.deepEqual(restoredErrors, []);
});

function createSeedData() {
  const date = new Date().toLocaleDateString("en-CA");
  return {
    date,
    today: {
      date,
      completedCount: 0,
      focusMinutes: 0,
      streak: 0,
      currentTask: "冷启动恢复任务",
      currentTaskId: "cold-task",
      currentStudyGoalId: "cold-goal",
      longGoalOnboardingCompleted: true,
      settingsUpdatedAt: "",
      dailyGoal: 8,
      focusDuration: 50,
      nextRestType: "short",
      theme: "light",
      petChoiceCompleted: true,
      records: [],
      todayPetXP: 0,
      selectedPet: "penguin",
      petProgress: { petId: "penguin", level: 1, currentXP: 0, totalXP: 0 },
      activeTimer: null,
    },
    plans: {
      [date]: [{
        id: "cold-task", clientId: "cold-task", syncedTaskId: "",
        title: "冷启动恢复任务", studyGoalId: "cold-goal", completed: false,
        createdAt: new Date().toISOString(), completedAt: null,
      }],
    },
    goals: [{
      id: "cold-goal", clientId: "cold-goal", syncedGoalId: "",
      title: "冷启动学习目标", completed: false, isPrimary: true,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }],
  };
}

function seedExistingStudyState(seed) {
  localStorage.setItem("kaoyanPomodoroData", JSON.stringify(seed.today));
  localStorage.setItem("kaoyanDailyPlans", JSON.stringify(seed.plans));
  localStorage.setItem("kaoyanStudyGoals", JSON.stringify(seed.goals));
  sessionStorage.setItem("kaoyanLocalSessionAccess", "true");
}

function collectPageErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

function listen(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
    server.on("error", reject);
  });
}

async function waitFor(check, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Timed out waiting for browser state.");
}

function findEdgePath() {
  const candidates = [
    process.env.EDGE_PATH,
    join(process.env["PROGRAMFILES(X86)"] || "", "Microsoft", "Edge", "Application", "msedge.exe"),
    join(process.env.PROGRAMFILES || "", "Microsoft", "Edge", "Application", "msedge.exe"),
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate)) || "";
}
