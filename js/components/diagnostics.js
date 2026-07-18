export function buildStudyDiagnosticItems({
  todayData,
  todayTasks,
  recentPlans,
  studyGoals,
  inferSubject
}) {
  const pendingTasks = todayTasks.filter((task) => !task.completed);
  const completedTasks = todayTasks.filter((task) => task.completed);
  const totalTasks = todayTasks.length;
  const taskRate = totalTasks ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
  const goalRate = todayData.dailyGoal
    ? Math.round((todayData.completedCount / todayData.dailyGoal) * 100)
    : 0;
  const activeDays = recentPlans.filter((plan) => plan.focusMinutes > 0 || plan.completedTasks > 0).length;
  const unstableDays = recentPlans.filter((plan) => plan.focusMinutes === 0 && plan.totalTasks > 0).length;
  const hasRecentEvidence = recentPlans.some((plan) => plan.focusMinutes > 0 || plan.totalTasks > 0);
  const subjectMinutes = buildSubjectMinutes(todayData.records, inferSubject);
  const hasSubjectEvidence = Object.keys(subjectMinutes).length > 0;
  const weakestSubject = hasSubjectEvidence ? findWeakestSubject(studyGoals, subjectMinutes) : null;
  const topSubject = Object.entries(subjectMinutes).sort((a, b) => b[1] - a[1])[0];
  const activeGoals = studyGoals.filter((goal) => !goal.completed);
  const linkedTasks = todayTasks.filter((task) => task.studyGoalId).length;
  const linkedRate = totalTasks ? Math.round((linkedTasks / totalTasks) * 100) : 0;
  const primaryGoal = activeGoals.find((goal) => goal.isPrimary) || activeGoals[0];
  const weeklyTargetMinutes = Number(primaryGoal?.weeklyTargetMinutes) || 0;
  const recentGoalMinutes = Number(primaryGoal?.recentFocusMinutes) || 0;
  const weeklyGoalRate = weeklyTargetMinutes
    ? Math.round((recentGoalMinutes / weeklyTargetMinutes) * 100)
    : null;

  return [
    {
      title: "今天学够了吗",
      level: goalRate >= 100 ? "good" : (goalRate >= 50 ? "warn" : "bad"),
      text: goalRate >= 100
        ? "今天的番茄目标已经打满，剩下重点是收尾和复盘。"
        : `今天只完成 ${todayData.completedCount} / ${todayData.dailyGoal} 个番茄，别急着加任务，先完成当前这一轮。`
    },
    {
      title: "任务有没有变成执行",
      level: taskRate >= 70 ? "good" : (totalTasks === 0 ? "warn" : "bad"),
      text: totalTasks === 0
        ? "今天还没有任务，先写下最重要的一件事。"
        : `任务完成率 ${taskRate}%。${pendingTasks.length ? `还有 ${pendingTasks.length} 件没落地，建议砍到前三件。` : "今天的任务清得很干净。"}`
    },
    {
      title: "这周稳不稳",
      level: !hasRecentEvidence ? "warn" : (activeDays >= 5 ? "good" : (activeDays >= 3 ? "warn" : "bad")),
      text: !hasRecentEvidence
        ? "近 7 天还没有足够记录，暂时不能判断稳定度。"
        : `近 7 天有 ${activeDays} 天留下学习痕迹。${unstableDays ? `其中 ${unstableDays} 天有计划但没记录，可能是假启动。` : (activeDays >= 5 ? "节奏比较稳定。" : "有效学习天数偏少，建议先固定每天第一轮番茄。")}`
    },
    {
      title: "哪里可能偏科",
      level: !hasSubjectEvidence || weakestSubject ? "warn" : "good",
      text: !hasSubjectEvidence
        ? "暂无科目投入数据，先完成一轮带科目名称的任务再判断。"
        : weakestSubject
        ? `${weakestSubject} 最近记录偏少，明天至少安排 1 个番茄补上。`
        : `${topSubject[0]} 投入最多，累计 ${topSubject[1]} 分钟。`
    },
    {
      title: "长期目标有没有推进",
      level: !primaryGoal
        ? "bad"
        : (totalTasks > 0 && linkedRate >= 80 && (weeklyGoalRate === null || weeklyGoalRate >= 50) ? "good" : "warn"),
      text: !primaryGoal
        ? "还没有进行中的长期目标，任务和番茄无法形成长期积累。"
        : totalTasks === 0
        ? `主目标是「${primaryGoal.title}」。先为它安排今天第一件可执行任务。`
        : `${linkedRate}% 的今日任务已绑定长期目标。${linkedRate < 80
          ? "还有任务没有方向，开始前先补全归属。"
          : `近 7 天已为「${primaryGoal.title}」投入 ${recentGoalMinutes}${weeklyTargetMinutes ? ` / ${weeklyTargetMinutes}` : ""} 分钟。`}`
    }
  ];
}

export function getPrimaryStudyDiagnostic(items) {
  const priorities = { bad: 0, warn: 1, good: 2 };
  return [...items].sort((left, right) => priorities[left.level] - priorities[right.level])[0] || {
    title: "先完成第一轮专注",
    level: "warn",
    text: "有了第一条记录后，系统才能判断今天的执行节奏。",
  };
}

export function buildStudyDiagnostics(context) {
  const items = buildStudyDiagnosticItems(context);
  return items.map((item) => `
    <article class="diagnosis-item" data-level="${item.level}">
      <strong>${context.escapeHtml(item.title)}</strong>
      <p>${context.escapeHtml(item.text)}</p>
    </article>
  `).join("");
}

function buildSubjectMinutes(records, inferSubject) {
  return records.reduce((result, record) => {
    const subject = inferSubject(record.task);
    result[subject] = (result[subject] || 0) + Number(record.minutes || 0);
    return result;
  }, {});
}

function findWeakestSubject(studyGoals, subjectMinutes) {
  const subjectHints = studyGoals
    .filter((goal) => !goal.completed)
    .map((goal) => String(goal.title || "").split(/[：:·\-—｜|]/)[0].trim())
    .filter(Boolean)
    .slice(0, 4);

  const recordedSubjects = Object.keys(subjectMinutes);
  return subjectHints.find((subject) => !recordedSubjects.some((recorded) => (
    subject.startsWith(recorded) || recorded.startsWith(subject)
  )));
}
