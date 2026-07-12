import { createAccountPanel, createAuthGateView } from "./auth.js";

export function createAuthFeatureView({ gateElements, accountMount, handlers }) {
  const gate = createAuthGateView({
    elements: gateElements,
    onModeChange: handlers.onModeChange,
    onSubmit: handlers.onSubmit,
    onLocalEntry: handlers.onLocalEntry,
  });
  const account = createAccountPanel({
    mount: accountMount,
    onToggle: handlers.onLogout,
    onModeToggle: handlers.onModeToggle,
    onSync: handlers.onSync,
    onSubmit: handlers.onSubmit,
  });

  function render(state) {
    gate.render(state);
    account.render({ session: state.session, mode: state.mode });
  }

  function setBusy(busy) {
    gate.setBusy(busy);
    account.setBusy(busy);
  }

  function setSyncStatus(message, isError = false) {
    account.syncStatus.textContent = message || "";
    account.syncStatus.dataset.error = String(isError);
  }

  return {
    render,
    setBusy,
    setFeedback: (message, isError) => gate.setFeedback(message, isError),
    setSyncStatus,
    clearPassword: () => gate.clearPassword(),
    setManualSyncBusy: (busy) => { account.manualSyncButton.disabled = busy; },
    setLastSyncText: (text) => { account.lastSyncText.textContent = text; },
  };
}
