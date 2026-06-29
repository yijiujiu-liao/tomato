export function createApiClient({ getToken }) {
  return async function apiRequest(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    const token = getToken();

    if (!options.skipAuth && token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(path, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      let message = "请求失败";
      let code = "";

      try {
        const payload = await response.json();
        message = payload.error || message;
        code = payload.code || "";
      } catch (error) {
        message = response.statusText || message;
      }

      const requestError = new Error(message);
      requestError.status = response.status;
      requestError.code = code;
      throw requestError;
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  };
}
