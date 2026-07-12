export async function performCloudSync({
  enabled,
  message,
  cloudFirst = false,
  setBusy,
  setStatus,
  pull,
  push,
  refreshStats,
  loadAi,
  onSynced,
  onRefresh,
}) {
  if (!enabled) return false;

  try {
    setBusy?.(true);
    setStatus?.(message);
    if (cloudFirst) {
      await pull();
      await push();
      await pull();
    } else {
      await push();
      await pull();
    }
    await refreshStats?.();
    await loadAi?.();
    onSynced?.();
    onRefresh?.();
    setStatus?.("同步完成");
    return true;
  } finally {
    setBusy?.(false);
  }
}

export function runCloudAction({ enabled, action, onSuccess, onError }) {
  if (!enabled) return Promise.resolve(false);
  return Promise.resolve()
    .then(action)
    .then(() => {
      onSuccess?.();
      return true;
    })
    .catch((error) => {
      onError?.(error);
      return false;
    });
}
