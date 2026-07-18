import { createPetProgress, getEvolutionStage, normalizePetType, renderPetActivity } from "../pet.js";
import { PET_TYPES } from "../state.js";

const PET_COMPANION_MESSAGES = [
  "别着急，我陪你把这一轮稳稳完成。",
  "再专注一个番茄，我们都会更接近目标。",
  "今天的努力没有消失，它正在变成我的成长。",
  "肩膀放松，先做好眼前这一件事。",
];

export function addHomeTask({ title, addTask }) {
  const cleanTitle = String(title || "").trim();
  return { added: Boolean(addTask(cleanTitle)) };
}

export function getHomePetCompanionState({ tasks, todayData, messageIndex = 0 }) {
  const unfinishedTasks = tasks.filter((task) => !task.completed);
  const allTasksCompleted = tasks.length > 0 && unfinishedTasks.length === 0;
  const goalReached = todayData.completedCount > 0
    && todayData.completedCount >= todayData.dailyGoal;
  const safeIndex = Math.abs(Number(messageIndex) || 0);

  if (tasks.length === 0) {
    return {
      mood: "waiting",
      message: "先写下一件今天要做的事，我会在这里等你。",
    };
  }

  if (allTasksCompleted || goalReached) {
    return {
      mood: "celebrate",
      message: "今天已经很棒啦，记得把这份节奏带到明天。",
    };
  }

  return {
    mood: todayData.completedCount > 0 ? "happy" : "ready",
    message: PET_COMPANION_MESSAGES[safeIndex % PET_COMPANION_MESSAGES.length],
  };
}

export function renderHomePage({ elements, tasks, todayData, formatPlanDate, messageIndex = 0 }) {
  document.body.classList.toggle("has-no-tasks", tasks.length === 0);
  const progress = todayData.petProgress || createPetProgress(todayData.selectedPet);
  const petId = normalizePetType(progress.petId || todayData.selectedPet);
  const petType = PET_TYPES[petId];
  const stage = getEvolutionStage(progress.level);
  const companionState = getHomePetCompanionState({ tasks, todayData, messageIndex });

  renderHomePageView({
    elements,
    tasks,
    todayData,
    formatPlanDate,
  });
  renderAiPlanBanner(elements, tasks);
  if (elements.homePetCompanion) {
    elements.homePetCompanion.dataset.mood = companionState.mood;
    elements.homePetCompanion.style.setProperty("--companion-accent", petType.accent);
  }
  if (elements.homePetMessage) elements.homePetMessage.textContent = companionState.message;
  if (elements.homePetArt) elements.homePetArt.innerHTML = renderPetActivity(petId, stage.id);
}

export function getHomeReviewState({ tasks, completedCount, dailyGoal }) {
  const hasTasks = tasks.length > 0;
  const allTasksCompleted = hasTasks && tasks.every((task) => task.completed);
  const goalReached = completedCount > 0 && completedCount >= dailyGoal;

  if (!allTasksCompleted && !goalReached) {
    return { visible: false, label: "" };
  }

  return {
    visible: true,
    label: allTasksCompleted
      ? "今日任务已完成，生成明日计划"
      : "今日番茄已达标，进入复盘",
  };
}

function renderAiPlanBanner(elements, tasks) {
  if (!elements.aiPlanBanner) return;
  const aiTasks = tasks.filter((task) => !task.completed && task.source === "ai");
  elements.aiPlanBanner.hidden = aiTasks.length === 0;
  if (aiTasks.length === 0) return;
  elements.aiPlanBannerTitle.textContent = `AI 接上了 ${aiTasks.length} 件今天要做的事`;
  elements.aiPlanBannerText.textContent = aiTasks.length === 1
    ? `建议先做：${aiTasks[0].title}`
    : `建议从「${aiTasks[0].title}」开始，完成后再推进下一件。`;
}

export function renderHomePageView({
  elements,
  tasks,
  todayData,
  formatPlanDate
}) {
  if (!elements.homeDateText) {
    return;
  }

  const nextTask = tasks.find((task) => !task.completed);
  const selectedTask = tasks.find((task) => task.id === todayData.currentTaskId && !task.completed);

  elements.homeDateText.textContent = formatPlanDate(new Date());
  elements.homeQuickTask.hidden = tasks.length > 0;
  if (elements.homeReviewBtn) {
    const reviewState = getHomeReviewState({
      tasks,
      completedCount: todayData.completedCount,
      dailyGoal: todayData.dailyGoal,
    });
    elements.homeReviewBtn.hidden = !reviewState.visible;
    elements.homeReviewBtn.textContent = reviewState.label;
  }

  if (selectedTask) {
    elements.homeNextTaskTitle.textContent = selectedTask.title;
    elements.homeNextTaskHint.textContent = selectedTask.source === "ai"
      ? "来自 AI 明日建议，已经准备好开始。"
      : "已选为当前专注任务，可以开始番茄钟。";
    return;
  }

  if (nextTask) {
    elements.homeNextTaskTitle.textContent = nextTask.title;
    elements.homeNextTaskHint.textContent = nextTask.source === "ai"
      ? "这是 AI 帮你承接的任务，点击选择后开始。"
      : "点击任务卡片选择它，再开始番茄钟。";
    return;
  }

  if (tasks.length > 0) {
    elements.homeNextTaskTitle.textContent = "今天的任务都完成了";
    elements.homeNextTaskHint.textContent = "可以去复盘页整理今天的节奏。";
    return;
  }

  elements.homeNextTaskTitle.textContent = "先写下今天要完成的一件事";
  elements.homeNextTaskHint.textContent = "添加或选择任务后，才能开始番茄钟。";
}
