export function renderCloudStatMetric(value, label) {
  return `
    <article class="cloud-stat-metric">
      <strong>${Number(value) || 0}</strong>
      <span>${label}</span>
    </article>
  `;
}
