import { escapeHtml } from "../utils.js";

export function createAiSummaryPanel({ reviewPage, onGenerate, onAdopt, formatGeneratedAt }) {
  const panel = document.createElement("section");
  panel.className = "card ai-summary-card";
  panel.innerHTML = `
    <div class="section-title ai-summary-head">
      <div>
        <p class="stats-kicker">AI 学习教练</p>
        <h2>今日总结与明日建议</h2>
      </div>
      <button class="primary-btn ai-summary-generate" type="button">生成今日总结</button>
    </div>
    <p class="ai-summary-hint"></p>
    <div class="ai-summary-body"></div>
  `;
  reviewPage.insertBefore(panel, reviewPage.querySelector(".review-card"));
  panel.querySelector(".ai-summary-generate").addEventListener("click", onGenerate);

  return {
    panel,
    render({ state, cloudEnabled, adoptionState }) {
      renderAiSummaryPanel({ panel, state, cloudEnabled, adoptionState, onAdopt, formatGeneratedAt });
    }
  };
}

export function renderAiSummaryList(title, items, escape = escapeHtml) {
  if (!Array.isArray(items) || items.length === 0) {
    return "";
  }

  return `
    <section class="ai-summary-section">
      <strong>${title}</strong>
      <ul>
        ${items.map((item) => `<li>${escape(item)}</li>`).join("")}
      </ul>
    </section>
  `;
}

function renderAiSummaryPanel({ panel, state, cloudEnabled, adoptionState, onAdopt, formatGeneratedAt }) {
  const hint = panel.querySelector(".ai-summary-hint");
  const body = panel.querySelector(".ai-summary-body");
  const button = panel.querySelector(".ai-summary-generate");
  const localReviewCard = document.querySelector(".review-card");
  button.disabled = state.status === "loading" || !cloudEnabled;

  if (localReviewCard) {
    localReviewCard.hidden = Boolean(state.data);
  }

  if (!cloudEnabled) {
    hint.textContent = "登录后，AI 会基于跨设备同步的任务、专注记录和学习目标生成复盘。";
    body.innerHTML = '<p class="ai-summary-empty">先登录/注册账号，完成一个番茄后，这里会出现当天总结和第二天建议。</p>';
    return;
  }

  if (state.status === "loading") {
    hint.textContent = state.error || "AI 正在读取今天的学习记录...";
    body.innerHTML = '<div class="ai-summary-loading"><span></span><span></span><span></span></div>';
    return;
  }

  if (state.status === "error") {
    hint.textContent = "AI 总结暂时不可用。";
    body.innerHTML = `<p class="ai-summary-empty">${escapeHtml(state.error || "请稍后重试。")}</p>`;
    return;
  }

  if (!state.data) {
    hint.textContent = "完成学习后可自动生成，也可以随时手动刷新今天的 AI 复盘。";
    body.innerHTML = '<p class="ai-summary-empty">还没有生成今日总结。点一下按钮，让 AI 教练帮你把今天收束成明天的行动。</p>';
    return;
  }

  hint.textContent = state.generatedAt
    ? `最近生成：${formatGeneratedAt(state.generatedAt)}`
    : "已生成今日 AI 复盘。";
  const adoptButtonText = adoptionState.total === 0
    ? "暂无可采纳建议"
    : (adoptionState.remaining === 0 ? "明日建议已加入任务" : `采纳 ${adoptionState.remaining} 条明日建议`);

  body.innerHTML = `
    <article class="ai-summary-main">
      <h3>${escapeHtml(state.data.title)}</h3>
      <p>${escapeHtml(state.data.todaySummary)}</p>
    </article>
    ${renderAiSummaryList("亮点", state.data.highlights)}
    ${renderAiSummaryList("风险提醒", state.data.risks)}
    ${renderAiSummaryList("明日建议", state.data.tomorrowPlan)}
    <blockquote class="ai-summary-encouragement">${escapeHtml(state.data.encouragement)}</blockquote>
    <button class="secondary-btn ai-summary-adopt" type="button">${escapeHtml(adoptButtonText)}</button>
  `;

  const adoptButton = body.querySelector(".ai-summary-adopt");
  adoptButton.disabled = adoptionState.total === 0 || adoptionState.remaining === 0;
  adoptButton.addEventListener("click", onAdopt);
}
