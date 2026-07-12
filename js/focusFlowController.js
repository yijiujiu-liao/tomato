export function createFocusFlowController({
  engine,
  modes,
  getData,
  pauseSilently,
  completeSession,
  createRecordId,
  getTodayKey,
  saveData,
  runCloudSync,
  uploadFocusSession,
  syncPet,
  syncSettings,
  pullCloudState,
  refreshStats,
  generateAiSummary,
  playFinishSound,
  showNotification,
  setRestType,
  normalizeRestType,
  render,
  showPetReward,
  setStatus,
  openCompletion,
  closeCompletion,
  buildCompletionMessage,
}) {
  let pendingRestType = "";

  function finish({ silent = false } = {}) {
    const completedMode = engine.getState().mode;
    pauseSilently();
    if (!silent) playFinishSound();

    if (completedMode !== "focus") {
      if (!silent) showNotification("休息结束", "可以回到下一轮专注了。");
      setRestType("short");
      engine.setMode("focus", modes.focus.minutes * 60);
      setStatus("休息结束，回到专注模式。");
      render();
      return { mode: "rest" };
    }

    const data = getData();
    const result = completeSession({
      data,
      minutes: modes.focus.minutes,
      recordId: createRecordId(),
      dateKey: getTodayKey(),
    });
    saveData();
    runCloudSync(async () => {
      const created = await uploadFocusSession(result.record, result.reward);
      result.record.syncedSessionId = created.focusSession.id;
      await syncPet();
      await syncSettings();
      await pullCloudState();
      await refreshStats();
      await generateAiSummary();
      saveData(false);
    });

    if (!silent) {
      showNotification("专注完成", `完成 1 个番茄，宠物获得了 ${result.reward.totalXP} XP。`);
    }
    setRestType(result.nextRestType);
    render();
    showPetReward(result.reward);
    setStatus(buildCompletionMessage(result.reward, result.nextRestType));
    pendingRestType = result.nextRestType;
    openCompletion(result.reward, result.nextRestType);
    return { mode: "focus", ...result };
  }

  function startRest() {
    const data = getData();
    const restType = pendingRestType || normalizeRestType(data.nextRestType);
    closeCompletion();
    setRestType(restType);
    engine.setMode("rest", modes.rest.minutes * 60);
    setStatus(restType === "long"
      ? "进入长休息。站起来，给大脑一点恢复时间。"
      : "进入休息。放松肩颈，看看远处。");
    render();
    return restType;
  }

  function skipRest() {
    closeCompletion();
    pendingRestType = "";
    engine.setMode("focus", modes.focus.minutes * 60);
    setStatus("已跳过休息，可以开始下一轮专注。");
    render();
  }

  function clearPendingRest() {
    pendingRestType = "";
  }

  return { finish, startRest, skipRest, clearPendingRest };
}
