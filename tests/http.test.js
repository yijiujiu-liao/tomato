import assert from "node:assert/strict";
import test from "node:test";
import {
  createErrorHandler,
  createHttpsGuard,
  createRateLimit,
  createSecurityHeaders,
} from "../server/http.js";

function createResponse() {
  return {
    headers: new Map(),
    statusCode: 200,
    body: null,
    redirectStatus: null,
    redirectUrl: null,
    setHeader(name, value) {
      this.headers.set(name, value);
    },
    status(value) {
      this.statusCode = value;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
    redirect(status, url) {
      this.redirectStatus = status;
      this.redirectUrl = url;
    },
  };
}

test("security headers add HSTS only for secure requests", () => {
  const middleware = createSecurityHeaders();
  const insecureResponse = createResponse();
  const secureResponse = createResponse();

  middleware({ secure: false }, insecureResponse, () => {});
  middleware({ secure: true }, secureResponse, () => {});

  assert.equal(insecureResponse.headers.has("Strict-Transport-Security"), false);
  assert.equal(
    secureResponse.headers.get("Strict-Transport-Security"),
    "max-age=31536000; includeSubDomains",
  );
  assert.match(secureResponse.headers.get("Content-Security-Policy"), /form-action 'self'/);
});

test("HTTPS guard redirects reads and rejects insecure writes", () => {
  const guard = createHttpsGuard({ enabled: true });
  const readResponse = createResponse();
  const writeResponse = createResponse();

  guard({
    secure: false,
    method: "GET",
    originalUrl: "/review?date=today",
    get: () => "tomato.example.com",
  }, readResponse, () => assert.fail("insecure GET should redirect"));

  guard({
    secure: false,
    method: "POST",
    originalUrl: "/api/tasks",
    get: () => "tomato.example.com",
  }, writeResponse, () => assert.fail("insecure POST should be rejected"));

  assert.equal(readResponse.redirectStatus, 308);
  assert.equal(readResponse.redirectUrl, "https://tomato.example.com/review?date=today");
  assert.equal(writeResponse.statusCode, 426);
  assert.match(writeResponse.body.error, /HTTPS/);
});

test("rate limiter exposes limits and removes expired buckets", () => {
  let currentTime = 1_000;
  const limiter = createRateLimit({
    windowMs: 500,
    max: 2,
    now: () => currentTime,
  });
  const request = { ip: "127.0.0.1" };

  for (let index = 0; index < 2; index += 1) {
    const response = createResponse();
    assert.equal(limiter.consume(request, response), true);
    assert.equal(response.headers.get("RateLimit-Limit"), "2");
  }

  const blockedResponse = createResponse();
  assert.equal(limiter.consume(request, blockedResponse), false);
  assert.equal(blockedResponse.statusCode, 429);

  currentTime = 2_000;
  limiter.cleanup();
  assert.equal(limiter.size(), 0);
});

test("production error handler does not expose internal errors", () => {
  const response = createResponse();
  createErrorHandler({ production: true, logError: () => {} })(
    new Error("SQLITE_CONSTRAINT users.password_hash"),
    {},
    response,
    () => {},
  );

  assert.equal(response.statusCode, 500);
  assert.doesNotMatch(response.body.error, /SQLITE|password_hash/);
});
