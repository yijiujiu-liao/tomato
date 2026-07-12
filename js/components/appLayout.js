export function setupAppLayout({
  todayTaskMount,
  planCard,
  todayTimerMount,
  timerCard,
  reviewPage,
  recordsCard,
}) {
  if (todayTaskMount && planCard && planCard.parentElement !== todayTaskMount) todayTaskMount.appendChild(planCard);
  if (todayTimerMount && timerCard && timerCard.parentElement !== todayTimerMount) todayTimerMount.appendChild(timerCard);
  if (reviewPage && recordsCard && recordsCard.parentElement !== reviewPage) {
    const disclosure = document.createElement("details");
    disclosure.className = "review-records-disclosure";
    disclosure.innerHTML = "<summary>今日学习记录</summary>";
    disclosure.appendChild(recordsCard);
    reviewPage.appendChild(disclosure);
  }
}

export function placeSettingsUtilities({ mount, accountMount, settingsCard, studyGoalsPanel }) {
  if (!mount) return;
  if (accountMount) mount.appendChild(accountMount);
  if (settingsCard) mount.appendChild(settingsCard);
  if (studyGoalsPanel) {
    const disclosure = document.createElement("details");
    disclosure.className = "settings-goals-disclosure";
    disclosure.innerHTML = "<summary>长期学习目标</summary>";
    disclosure.appendChild(studyGoalsPanel);
    mount.appendChild(disclosure);
  }
}
