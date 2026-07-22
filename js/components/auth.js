export function createAuthGateView({ elements, onModeChange, onSubmit, onLocalEntry }) {
  const {
    root,
    appRoot,
    form,
    status,
    submit,
    loginTab,
    registerTab,
    nameField,
    emailInput,
    passwordInput,
    nameInput,
    localEntry,
    eyebrow,
    heading
  } = elements;

  if (!form) {
    return null;
  }

  loginTab.addEventListener("click", () => onModeChange("login"));
  registerTab.addEventListener("click", () => onModeChange("register"));
  localEntry.addEventListener("click", onLocalEntry);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    onSubmit({
      email: emailInput.value.trim(),
      password: passwordInput.value,
      displayName: nameInput.value.trim()
    });
  });

  return {
    render({ session, localAccessGranted, mode }) {
      const isOpen = !session?.user && !localAccessGranted;
      root.hidden = !isOpen;
      root.inert = !isOpen;
      appRoot.inert = isOpen;
      appRoot.setAttribute("aria-hidden", String(isOpen));
      document.body.classList.remove("auth-pending");
      document.body.classList.toggle("auth-locked", isOpen);

      loginTab.classList.toggle("active", mode === "login");
      registerTab.classList.toggle("active", mode === "register");
      loginTab.setAttribute("aria-pressed", String(mode === "login"));
      registerTab.setAttribute("aria-pressed", String(mode === "register"));
      nameField.hidden = mode !== "register";
      passwordInput.autocomplete = mode === "register" ? "new-password" : "current-password";
      submit.textContent = mode === "register" ? "创建账号" : "登录";
      eyebrow.textContent = mode === "register" ? "首次使用" : "欢迎回来";
      heading.textContent = mode === "register" ? "创建学习档案" : "继续今天的学习";
    },
    setBusy(busy) {
      submit.disabled = busy;
    },
    setFeedback(message, isError) {
      status.textContent = message || "";
      status.dataset.error = String(isError);
    },
    clearPassword() {
      passwordInput.value = "";
    }
  };
}

export function createAccountPanel({ mount, onToggle, onModeToggle, onSync, onSubmit }) {
  const panel = document.createElement("section");
  panel.className = "account-panel";
  panel.innerHTML = `
    <div class="account-summary">
      <div>
        <span class="account-kicker">云端同步</span>
        <strong id="accountName">本地模式</strong>
      </div>
      <button class="text-btn account-toggle" id="accountToggle" type="button">登录</button>
    </div>
    <form class="account-form" id="accountForm" hidden>
      <div class="account-field-row">
        <input id="authEmailInput" type="email" autocomplete="email" placeholder="邮箱">
        <input id="authPasswordInput" type="password" autocomplete="current-password" placeholder="密码">
      </div>
      <input id="authNameInput" type="text" autocomplete="nickname" placeholder="昵称（注册时填写）" hidden>
      <div class="account-actions">
        <button class="primary-btn account-submit" id="authSubmitBtn" type="submit">登录</button>
        <button class="text-btn" id="authModeBtn" type="button">注册账号</button>
      </div>
      <p class="sync-status" id="syncStatus" role="status"></p>
    </form>
    <div class="account-sync-tools" id="accountSyncTools" hidden>
      <button class="text-btn manual-sync-btn" id="manualSyncBtn" type="button">立即同步</button>
      <span id="lastSyncText">尚未同步</span>
    </div>
  `;
  mount.appendChild(panel);

  const form = panel.querySelector("#accountForm");
  const submit = panel.querySelector("#authSubmitBtn");
  const syncStatus = panel.querySelector("#syncStatus");
  const manualSyncButton = panel.querySelector("#manualSyncBtn");
  const lastSyncText = panel.querySelector("#lastSyncText");
  const accountName = panel.querySelector("#accountName");
  const accountToggle = panel.querySelector("#accountToggle");
  const modeButton = panel.querySelector("#authModeBtn");
  const nameInput = panel.querySelector("#authNameInput");
  let currentSession = null;

  accountToggle.addEventListener("click", () => {
    if (currentSession?.user) {
      onToggle();
      return;
    }

    form.hidden = !form.hidden;
    accountToggle.textContent = form.hidden ? "登录" : "收起";
  });
  modeButton.addEventListener("click", onModeToggle);
  manualSyncButton.addEventListener("click", onSync);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    onSubmit({
      email: panel.querySelector("#authEmailInput").value.trim(),
      password: panel.querySelector("#authPasswordInput").value,
      displayName: nameInput.value.trim()
    });
  });

  return {
    panel,
    form,
    syncStatus,
    manualSyncButton,
    lastSyncText,
    render({ session, mode }) {
      currentSession = session;

      if (session?.user) {
        accountName.textContent = session.user.displayName || session.user.email;
        accountToggle.textContent = "退出";
        form.hidden = true;
        panel.querySelector("#accountSyncTools").hidden = false;
        return;
      }

      accountName.textContent = "本地模式";
      accountToggle.textContent = form.hidden ? "登录" : "收起";
      panel.querySelector("#accountSyncTools").hidden = true;
      submit.textContent = mode === "register" ? "注册并同步" : "登录";
      modeButton.textContent = mode === "register" ? "已有账号，去登录" : "注册账号";
      nameInput.hidden = mode !== "register";
    },
    setBusy(busy) {
      submit.disabled = busy;
    }
  };
}
