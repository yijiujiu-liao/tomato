export function renderAiSummaryList(title, items, escapeHtml) {
  if (!Array.isArray(items) || items.length === 0) {
    return "";
  }

  return `
    <section class="ai-summary-section">
      <strong>${title}</strong>
      <ul>
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </section>
  `;
}
