import {
  buildStudyDiagnosticItems,
  buildStudyDiagnostics,
  getPrimaryStudyDiagnostic,
} from "../components/diagnostics.js";
import { renderCloudStatMetric } from "../components/stats.js";
import { STATS_RANGES } from "../state.js";
import { escapeHtml } from "../utils.js";
import { inferSubject } from "./review.js";

export function createDataPageView({ page, onRangeChange }) {
  const statsPanel = document.createElement("details");
  statsPanel.className = "card cloud-stats-card";
  statsPanel.innerHTML = `
    <summary class="cloud-stats-summary-toggle">
      <span>长期趋势</span><small>按需查看</small>
    </summary>
    <div class="cloud-stats-content">
      <div class="section-title cloud-stats-head">
        <div><p class="stats-kicker">长期复习节奏</p><h2>云端学习统计</h2></div>
        <div class="stats-range-tabs" role="tablist" aria-label="统计范围">
          <button class="stats-range-btn" type="button" data-stats-range="day">今日</button>
          <button class="stats-range-btn" type="button" data-stats-range="week">本周</button>
          <button class="stats-range-btn" type="button" data-stats-range="month">本月</button>
        </div>
      </div>
      <p class="stats-sync-hint" id="statsSyncHint"></p>
      <div class="cloud-stats-summary" id="cloudStatsSummary"></div>
      <div class="cloud-stats-chart" id="cloudStatsChart" aria-label="学习趋势图"></div>
      <details class="stats-heatmap-wrap">
        <summary class="stats-heatmap-head"><strong>近 30 天稳定度</strong><span id="statsHeatmapCaption"></span></summary>
        <div class="stats-heatmap" id="statsHeatmap" aria-label="近 30 天学习热力图"></div>
      </details>
    </div>
  `;

  const diagnosisPanel = document.createElement("section");
  diagnosisPanel.className = "card study-diagnosis-card";
  diagnosisPanel.innerHTML = `
    <div class="section-title">
      <div><p class="stats-kicker">节奏诊断</p><h2>今天的问题在哪里</h2></div>
      <span class="diagnosis-chip">直接一点</span>
    </div>
    <article class="diagnosis-lead" id="studyDiagnosisLead" data-level="warn">
      <span>当前结论</span>
      <strong>先完成第一轮专注</strong>
      <p>有了第一条记录后，系统才能判断今天的执行节奏。</p>
    </article>
    <details class="diagnosis-details">
      <summary>查看 4 项诊断依据</summary>
      <div class="diagnosis-list" id="studyDiagnosisList"></div>
    </details>
  `;

  page.appendChild(statsPanel);
  page.insertBefore(diagnosisPanel, statsPanel);
  statsPanel.querySelectorAll("[data-stats-range]").forEach((button) => {
    button.addEventListener("click", () => onRangeChange(button.dataset.statsRange));
  });

  function renderStats({ cloudEnabled, stats, localTotals }) {
    statsPanel.querySelectorAll("[data-stats-range]").forEach((button) => {
      const active = button.dataset.statsRange === stats.range;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });

    const hint = statsPanel.querySelector("#statsSyncHint");
    const summary = statsPanel.querySelector("#cloudStatsSummary");
    const chart = statsPanel.querySelector("#cloudStatsChart");
    const heatmap = statsPanel.querySelector("#statsHeatmap");
    const caption = statsPanel.querySelector("#statsHeatmapCaption");

    if (!cloudEnabled) {
      hint.textContent = "登录后可查看跨设备累计的每日、每周、每月学习统计。";
      summary.innerHTML = renderMetrics(localTotals);
      chart.innerHTML = '<p class="cloud-stats-empty">当前是本地模式，登录后专注记录会沉淀为长期曲线。</p>';
      caption.textContent = "本地模式暂不生成跨设备热力图";
      renderHeatmap(heatmap, []);
      return;
    }

    if (stats.status === "loading") {
      hint.textContent = `正在读取${STATS_RANGES[stats.range]}学习数据...`;
    } else if (stats.status === "error") {
      hint.textContent = stats.error || "统计数据暂时读取失败。";
    } else {
      hint.textContent = `${STATS_RANGES[stats.range]}统计来自云端专注记录，会随多设备同步更新。`;
    }

    const totals = stats.data?.totals || { focusMinutes: 0 };
    const rhythm = stats.data?.summary || {
      activeDays: 0,
      averageDailyMinutes: 0,
      currentStreakDays: 0,
      bestDay: null,
    };
    if (stats.status === "ready" && rhythm.bestDay) {
      hint.textContent = `${STATS_RANGES[stats.range]}最高效的一天是 ${formatDateLabel(rhythm.bestDay.date)}，学习了 ${rhythm.bestDay.focusMinutes} 分钟。`;
    }
    summary.innerHTML = renderMetrics({
      focusMinutes: totals.focusMinutes,
      activeDays: rhythm.activeDays,
      averageDailyMinutes: rhythm.averageDailyMinutes,
      currentStreakDays: rhythm.currentStreakDays,
    });
    renderChart(chart, stats.data?.days || []);
    renderHeatmap(heatmap, stats.data?.days || []);
    caption.textContent = buildHeatmapCaption(stats.data?.summary);
  }

  function renderDiagnosis(context) {
    const items = buildStudyDiagnosticItems({
      ...context,
      inferSubject,
    });
    const primary = getPrimaryStudyDiagnostic(items);
    const lead = diagnosisPanel.querySelector("#studyDiagnosisLead");
    lead.dataset.level = primary.level;
    lead.querySelector("strong").textContent = primary.title;
    lead.querySelector("p").textContent = primary.text;
    diagnosisPanel.querySelector("#studyDiagnosisList").innerHTML = buildStudyDiagnostics({
      ...context,
      inferSubject,
      escapeHtml,
    });
  }

  function renderTodayStats(data) {
    const done = page.querySelector("#doneCount");
    const minutes = page.querySelector("#focusMinutes");
    if (done) done.textContent = data.completedCount;
    if (minutes) minutes.textContent = data.focusMinutes;
  }

  return { statsPanel, diagnosisPanel, renderStats, renderDiagnosis, renderTodayStats };
}

function renderMetrics(values) {
  if ("activeDays" in values) {
    return [
      renderCloudStatMetric(values.focusMinutes, "专注分钟"),
      renderCloudStatMetric(values.activeDays, "学习天数"),
      renderCloudStatMetric(values.averageDailyMinutes, "日均分钟"),
      renderCloudStatMetric(values.currentStreakDays, "连续天数"),
    ].join("");
  }
  return [
    renderCloudStatMetric(values.completedCount, "今日次数"),
    renderCloudStatMetric(values.focusMinutes, "今日分钟"),
    renderCloudStatMetric(values.totalXP, "宠物 XP"),
    renderCloudStatMetric(values.dailyGoal, "今日目标"),
  ].join("");
}

function renderChart(container, days) {
  container.innerHTML = "";
  if (!Array.isArray(days) || days.length === 0) {
    container.innerHTML = '<p class="cloud-stats-empty">这个范围还没有云端专注记录。完成一个番茄后，这里会长出第一根柱子。</p>';
    return;
  }
  const maxMinutes = Math.max(...days.map((day) => Number(day.focusMinutes) || 0), 1);
  days.forEach((day) => {
    const minutes = Number(day.focusMinutes) || 0;
    const bar = document.createElement("div");
    bar.className = "cloud-stat-bar";
    bar.title = `${formatDateLabel(day.date)}：${minutes} 分钟，${Number(day.completedCount) || 0} 次专注，${Number(day.xpEarned) || 0} XP`;
    bar.style.setProperty("--bar-height", `${Math.max(8, Math.round((minutes / maxMinutes) * 100))}%`);
    bar.innerHTML = `<span class="cloud-stat-bar-fill"></span><strong>${minutes}</strong><small>${formatDateLabel(day.date)}</small>`;
    container.appendChild(bar);
  });
}

function renderHeatmap(container, days) {
  container.innerHTML = "";
  if (!Array.isArray(days) || days.length === 0) {
    container.innerHTML = '<p class="cloud-stats-empty">还没有足够的数据生成热力图。</p>';
    return;
  }
  const maxMinutes = Math.max(...days.map((day) => Number(day.focusMinutes) || 0), 1);
  days.slice(-30).forEach((day) => {
    const minutes = Number(day.focusMinutes) || 0;
    const cell = document.createElement("span");
    cell.className = "stats-heat-cell";
    cell.dataset.level = String(minutes === 0 ? 0 : Math.max(1, Math.ceil((minutes / maxMinutes) * 4)));
    cell.title = `${formatDateLabel(day.date)}：${minutes} 分钟`;
    cell.textContent = new Date(day.date).getDate();
    container.appendChild(cell);
  });
}

function buildHeatmapCaption(summary) {
  if (!summary || summary.activeDays === 0) return "这个范围还没有形成学习节奏";
  return `${summary.activeDays} 天有学习记录，当前连续 ${summary.currentStreakDays} 天`;
}

function formatDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "";
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
