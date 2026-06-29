export function buildTaskCardHtml({ task, completedTime, escapeHtml }) {
  const title = escapeHtml(task.title);

  if (task.completed) {
    return `
      <div class="task-card-front task-card-front-completed">
        <div class="task-completed-main">
          <span class="task-title">${title}</span>
          <span class="task-completed-time">${completedTime} 完成</span>
        </div>
        <div class="task-actions">
          <button class="task-action-btn" type="button" data-action="restore" data-task-id="${task.id}">恢复</button>
          <button class="task-action-btn task-delete-btn" type="button" data-action="delete" data-task-id="${task.id}">删除</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="task-complete-underlay" aria-hidden="true">
      <span>✓</span>
      <strong>右滑完成</strong>
    </div>
    <div class="task-card-front" role="button" tabindex="0" aria-label="设为当前专注任务：${title}">
      <span class="task-swipe-cue" aria-hidden="true">→</span>
      <span class="task-title">${title}</span>
      <div class="task-meta-actions">
        <span class="task-swipe-hint">点击专注 · 右滑完成</span>
        <div class="task-actions">
          <details class="task-more">
            <summary class="task-action-btn">更多</summary>
            <div class="task-more-menu">
              <button type="button" data-action="edit" data-task-id="${task.id}">编辑</button>
              <button type="button" data-action="delete" data-task-id="${task.id}">删除</button>
            </div>
          </details>
        </div>
      </div>
      <span class="task-done-badge">完成！</span>
    </div>
  `;
}
