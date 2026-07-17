import { escapeHtml } from "../utils.js";

export function createAiSummaryPanel({ reviewPage, onGenerate, onAdopt, onOpenAccount, formatGeneratedAt }) {
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
      renderAiSummaryPanel({
        panel,
        state,
        cloudEnabled,
        adoptionState,
        onAdopt,
        onOpenAccount,
        formatGeneratedAt,
      });
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

export function renderAiDiagnosis(diagnosis, escape = escapeHtml) {
  if (!diagnosis?.headline) {
    return "";
  }

  return `
    <section class="ai-diagnosis-card">
      <span>AI 执行判断</span>
      <h3>${escape(diagnosis.headline)}</h3>
      <p>${escape(diagnosis.evidence || "诊断依据来自今日任务与专注记录。")}</p>
      <div>
        <strong>明天第一步</strong>
        <em>${escape(diagnosis.nextAction || "先完成第一轮番茄。")}</em>
      </div>
    </section>
  `;
}

function renderAiSummaryPanel({
  panel,
  state,
  cloudEnabled,
  adoptionState,
  onAdopt,
  onOpenAccount,
  formatGeneratedAt,
}) {
  const hint = panel.querySelector(".ai-summary-hint");
  const body = panel.querySelector(".ai-summary-body");
  const button = panel.querySelector(".ai-summary-generate");
  const localReviewCard = document.querySelector(".review-card");
  button.disabled = state.status === "loading" || !cloudEnabled;
  button.hidden = !cloudEnabled;
  panel.dataset.mode = cloudEnabled ? "cloud" : "local";

  if (localReviewCard) {
    localReviewCard.hidden = Boolean(state.data);
  }

  if (!cloudEnabled) {
    hint.textContent = "登录后，复盘会自动承接今天的记录，并生成可采纳的明日任务。";
    body.innerHTML = `
      <div class="ai-summary-empty">
        <p>本机记录会保留，不会因为登录而丢失。</p>
        <button class="primary-btn ai-summary-login" type="button">登录并开启 AI 复盘</button>
      </div>
    `;
    body.querySelector(".ai-summary-login")?.addEventListener("click", onOpenAccount);
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
    ${renderAiDiagnosis(state.data.diagnosis)}
    <article class="ai-summary-main">
      <h3>${escapeHtml(state.data.title)}</h3>
      <p>${escapeHtml(state.data.todaySummary)}</p>
    </article>
    ${renderAiSummaryList("亮点", state.data.highlights)}
    ${renderAiSummaryList("风险提醒", state.data.risks)}
    ${renderAiSummaryList("明日可执行任务", state.data.tomorrowPlan)}
    <blockquote class="ai-summary-encouragement">${escapeHtml(state.data.encouragement)}</blockquote>
    <button class="secondary-btn ai-summary-adopt" type="button">${escapeHtml(adoptButtonText)}</button>
    <p class="ai-follow-through-note">采纳后的完成情况会进入下一次 AI 复盘，用来调整后续任务数量和范围。</p>
  `;

  const adoptButton = body.querySelector(".ai-summary-adopt");
  adoptButton.disabled = adoptionState.total === 0 || adoptionState.remaining === 0;
  adoptButton.addEventListener("click", onAdopt);
}
