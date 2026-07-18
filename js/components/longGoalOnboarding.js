import { normalizeNonNegativeInteger } from "../utils.js";

export function createLongGoalOnboarding({ root, form, onSubmit }) {
  const titleInput = root.querySelector("#onboardingGoalTitle");
  const dateInput = root.querySelector("#onboardingGoalDate");
  const weeklyHoursInput = root.querySelector("#onboardingWeeklyHours");
  const descriptionInput = root.querySelector("#onboardingGoalDescription");
  const submitButton = root.querySelector("button[type='submit']");
  const status = root.querySelector("#onboardingGoalStatus");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = titleInput.value.trim();
    const weeklyHours = Math.max(1, Math.min(80, Number(weeklyHoursInput.value) || 0));
    if (!title || !dateInput.value || !weeklyHours) {
      status.textContent = "请填写目标、计划日期和每周可投入时间。";
      (title ? (dateInput.value ? weeklyHoursInput : dateInput) : titleInput).focus();
      return;
    }

    submitButton.disabled = true;
    status.textContent = "正在建立你的长期执行主线...";
    try {
      const accepted = await onSubmit({
        title,
        description: descriptionInput.value.trim(),
        targetDate: dateInput.value,
        weeklyTargetMinutes: normalizeNonNegativeInteger(weeklyHours * 60),
        isPrimary: true,
      });
      if (accepted !== false) close();
    } finally {
      submitButton.disabled = false;
    }
  });

  function open({ title = "", message = "" } = {}) {
    const today = new Date().toISOString().slice(0, 10);
    dateInput.min = today;
    if (!dateInput.value || dateInput.value < today) dateInput.value = getSuggestedTargetDate();
    if (title) titleInput.value = title;
    status.textContent = message;
    root.hidden = false;
    root.inert = false;
    root.setAttribute("aria-hidden", "false");
    document.body.classList.add("long-goal-onboarding-active");
    window.setTimeout(() => titleInput.focus(), 80);
  }

  function close() {
    root.setAttribute("aria-hidden", "true");
    root.inert = true;
    root.hidden = true;
    document.body.classList.remove("long-goal-onboarding-active");
    form.reset();
    dateInput.value = "";
    status.textContent = "";
  }

  return { open, close, isOpen: () => root.getAttribute("aria-hidden") === "false" };
}

function getSuggestedTargetDate() {
  const date = new Date();
  date.setMonth(date.getMonth() + 6);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
