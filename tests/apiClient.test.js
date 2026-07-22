import assert from "node:assert/strict";
import test from "node:test";
import { createApiClient, readCsrfCookie } from "../js/api.js";

test("API client uses cookies and attaches CSRF only to authenticated writes", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (path, options) => {
    requests.push({ path, options });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const request = createApiClient({
      getToken: () => "",
      getCsrfToken: () => "csrf-token",
    });
    await request("/api/tasks");
    await request("/api/tasks", { method: "POST", body: { title: "数学" } });
    await request("/api/auth/login", {
      method: "POST",
      body: { email: "student@example.com" },
      skipAuth: true,
    });

    assert.equal(requests[0].options.credentials, "same-origin");
    assert.equal(requests[0].options.headers["X-CSRF-Token"], undefined);
    assert.equal(requests[1].options.headers["X-CSRF-Token"], "csrf-token");
    assert.equal(requests[2].options.headers["X-CSRF-Token"], undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("CSRF cookie reader supports secure and local cookie names", () => {
  assert.equal(readCsrfCookie("theme=light; tomato_csrf=local-token"), "local-token");
  assert.equal(readCsrfCookie("__Host-tomato_csrf=secure-token; theme=light"), "secure-token");
});
