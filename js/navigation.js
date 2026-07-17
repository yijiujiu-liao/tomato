const PAGE_ALIASES = {
  tasks: "home",
  focus: "home",
  profile: "data",
};

const VALID_PAGES = new Set(["home", "pet", "review", "data", "focus-session"]);

export function getPageFromHash(hash = window.location.hash) {
  const requestedPage = hash.replace(/^#\/?/, "");
  const page = PAGE_ALIASES[requestedPage] || requestedPage;
  return VALID_PAGES.has(page) ? page : "home";
}

export function createAppNavigator({ pages, buttons, onPageChange, canNavigate }) {
  function switchPage(pageName, options = {}) {
    const nextPageName = getPageFromHash(`#/${pageName}`);
    const currentPageName = document.body.dataset.page || getPageFromHash();

    if (
      currentPageName !== nextPageName
      && !options.force
      && canNavigate?.({ from: currentPageName, to: nextPageName, options }) === false
    ) {
      const currentUrl = `${window.location.pathname}${window.location.search}#/${currentPageName}`;
      window.history.replaceState({ page: currentPageName }, "", currentUrl);
      return currentPageName;
    }

    document.body.dataset.page = nextPageName;

    pages.forEach((page) => {
      page.classList.toggle("active", page.dataset.page === nextPageName);
    });
    buttons.forEach((button) => {
      const isActive = button.dataset.pageTarget === nextPageName;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-current", isActive ? "page" : "false");
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
    if (!options.fromHistory) {
      const nextHash = `#/${nextPageName}`;
      const nextUrl = `${window.location.pathname}${window.location.search}${nextHash}`;
      if (options.pushHistory && window.location.hash !== nextHash) {
        window.history.pushState({ page: nextPageName }, "", nextUrl);
      } else {
        window.history.replaceState({ page: nextPageName }, "", nextUrl);
      }
    }

    onPageChange?.(nextPageName);
    return nextPageName;
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      switchPage(button.dataset.pageTarget, { pushHistory: true });
    });
  });
  window.addEventListener("popstate", () => {
    switchPage(getPageFromHash(), { fromHistory: true });
  });

  return { switchPage, getCurrentPage: getPageFromHash };
}

export function createDrawer({ root, openButton, closeButton }) {
  function open() {
    root.hidden = false;
    root.inert = false;
    root.setAttribute("aria-hidden", "false");
    document.body.classList.add("drawer-open");
    closeButton.focus();
  }

  function close({ restoreFocus = true } = {}) {
    root.setAttribute("aria-hidden", "true");
    root.inert = true;
    root.hidden = true;
    document.body.classList.remove("drawer-open");
    if (restoreFocus) openButton?.focus();
  }

  openButton?.addEventListener("click", open);
  closeButton?.addEventListener("click", () => close());
  root?.addEventListener("click", (event) => {
    if (event.target === root) close();
  });

  return {
    open,
    close,
    isOpen: () => root?.getAttribute("aria-hidden") === "false",
  };
}
