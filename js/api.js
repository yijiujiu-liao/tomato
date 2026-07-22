const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function readCsrfCookie(cookieHeader = globalThis.document?.cookie || "") {
  const cookies = String(cookieHeader).split(";").map((part) => part.trim());
  for (const name of ["__Host-tomato_csrf", "tomato_csrf"]) {
    const prefix = `${name}=`;
    const match = cookies.find((part) => part.startsWith(prefix));
    if (match) return decodeURIComponent(match.slice(prefix.length));
  }
  return "";
}

export function createApiClient({ getToken = () => "", getCsrfToken = readCsrfCookie } = {}) {
  return async function apiRequest(path, options = {}) {
    const method = options.method || "GET";
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    const token = getToken();

    if (!options.skipAuth && token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (!options.skipAuth && UNSAFE_METHODS.has(method)) {
      const csrfToken = getCsrfToken();
      if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
    }

    const response = await fetch(path, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: "same-origin",
    });

    if (!response.ok) {
      let message = "请求失败";
      let code = "";
      let details = null;

      try {
        const payload = await response.json();
        message = payload.error || message;
        code = payload.code || "";
        details = payload;
      } catch (error) {
        message = response.statusText || message;
      }

      const requestError = new Error(message);
      requestError.status = response.status;
      requestError.code = code;
      requestError.details = details;
      throw requestError;
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  };
}
