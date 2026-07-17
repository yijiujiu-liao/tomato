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

  function clearSession() {
    session = null;
    persistSession();
    notify();
  }

  function isAuthenticationFailure(error) {
    return error?.status === 401 || error?.status === 403;
  }

  async function authenticate({ email, password, displayName }) {
    const candidatePassword = typeof password === "string" ? password : "";
    if (!email || candidatePassword.length < 8 || candidatePassword.length > 128) {
      setFeedback?.("请输入有效邮箱和至少 8 位密码", true);
      return false;
    }

    setBusy?.(true);
    try {
      setFeedback?.(mode === "register" ? "正在创建账号..." : "正在登录...");
      try {
        session = await getRepository().authenticate(mode, {
          email,
          password: candidatePassword,
          displayName,
        });
      } catch (error) {
        setFeedback?.(error.message, true);
        return false;
      }

      clearLocalAccess();
      persistSession();
      notify();

      try {
        await performSync?.("正在同步本地与云端...", { cloudFirst: mode === "login" });
      } catch (error) {
        if (isAuthenticationFailure(error)) {
          clearSession();
          setFeedback?.("登录状态验证失败，请重新登录", true);
          return false;
        }

        clearPassword?.();
        setFeedback?.("登录成功，云端同步暂时失败，稍后会自动重试", true);
        return true;
      }

      clearPassword?.();
      setFeedback?.("登录成功，学习记录已同步");
      return true;
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
      return true;
    } catch (error) {
      if (isAuthenticationFailure(error)) {
        setFeedback?.("登录已过期，请重新登录", true);
        clearSession();
        return false;
      }

      setFeedback?.("已保留登录状态，云端同步暂时不可用", true);
      return false;
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
