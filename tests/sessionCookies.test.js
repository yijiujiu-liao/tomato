import assert from "node:assert/strict";
import test from "node:test";
import {
  authCookieNames,
  parseCookies,
  serializeCookie,
} from "../server/sessionCookies.js";

test("secure session cookie has host-only browser protections", () => {
  const value = serializeCookie(authCookieNames.secure.session, "secret", {
    secure: true,
    httpOnly: true,
    maxAge: 3600,
  });

  assert.match(value, /^__Host-tomato_session=/);
  assert.match(value, /Path=\//);
  assert.match(value, /SameSite=Lax/);
  assert.match(value, /HttpOnly/);
  assert.match(value, /Secure/);
  assert.doesNotMatch(value, /Domain=/);
});

test("cookie parser tolerates encoded values and malformed entries", () => {
  assert.deepEqual(parseCookies("tomato_session=a%20b; malformed; tomato_csrf=c"), {
    tomato_session: "a b",
    tomato_csrf: "c",
  });
});
