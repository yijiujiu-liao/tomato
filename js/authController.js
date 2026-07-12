import {
  loadAuthSession,
  loadSessionFlag,
  saveAuthSession,
  saveSessionFlag,
} from "./storage.js";

export function createAuthController({
  storage,
  sessionStorage,
  sessionKey,
  localAccessKey,
  getRepository,
  performSync,
  onChange,
  onReset,
  setBusy,
  setFeedback,
  clearPassword,
}) {
  let session = loadAuthSession(storage, sessionKey);
  let localAccessGranted = loadSessionFlag(sessionStorage, localAccessKey);
  let mode = "login";

  function persistSession() {
    session = saveAuthSession(storage, sessionKey, session);
  }

  function notify() {
    onChange?.(getState());
  }

  function getState() {
    return { session, localAccessGranted, mode };
  }

  function setMode(nextMode) {
    mode = nextMode === "register" ? "register" : "login";
    notify();
  }

  function enterLocal() {
    localAccessGranted = true;
    saveSessionFlag(sessionStorage, localAccessKey, true);
    notify();
  }

  function clearLocalAccess() {
    localAccessGranted = false;
    saveSessionFlag(sessionStorage, localAccessKey, false);
  }

  async function authenticate({ email, password, displayName }) {
    if (!email || password.length < 8) {
      setFeedback?.("请输入有效邮箱和至少 8 位密码", true);
      return false;
    }

    setBusy?.(true);
    try {
      setFeedback?.(mode === "register" ? "正在创建账号..." : "正在登录...");
      session = await getRepository().authenticate(mode, { email, password, displayName });
      clearLocalAccess();
      persistSession();
      notify();
      await performSync?.("正在同步本地与云端...", { cloudFirst: mode === "login" });
      clearPassword?.();
      setFeedback?.("登录成功，学习记录已同步");
      return true;
    } catch (error) {
      setFeedback?.(error.message, true);
      return false;
    } finally {
      setBusy?.(false);
    }
  }

  async function logout() {
    try {
      if (session?.token) await getRepository().logout();
    } catch (error) {
      console.warn(error);
    }
    session = null;
    clearLocalAccess();
    persistSession();
    notify();
    onReset?.();
  }

  async function bootstrap() {
    if (!session?.token) return;
    try {
      await performSync?.("正在恢复云端同步...", { cloudFirst: true });
    } catch (error) {
      setFeedback?.("登录已过期，请重新登录", true);
      session = null;
      persistSession();
      notify();
    }
  }

  function updateUser(user) {
    if (!session || !user) return;
    session.user = user;
    persistSession();
    notify();
  }

  function markSynced(date = new Date()) {
    if (!session) return;
    session.lastSyncedAt = date.toISOString();
    persistSession();
  }

  return {
    getState,
    getSession: () => session,
    isCloudEnabled: () => Boolean(session?.token),
    setMode,
    enterLocal,
    authenticate,
    logout,
    bootstrap,
    updateUser,
    markSynced,
  };
}
