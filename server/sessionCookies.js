import { config } from "./config.js";

const SESSION_COOKIE = "tomato_session";
const CSRF_COOKIE = "tomato_csrf";
const SECURE_SESSION_COOKIE = `__Host-${SESSION_COOKIE}`;
const SECURE_CSRF_COOKIE = `__Host-${CSRF_COOKIE}`;

function encodeCookieValue(value) {
  return encodeURIComponent(String(value));
}

function cookieNames(secure = config.secureCookies) {
  return secure
    ? { session: SECURE_SESSION_COOKIE, csrf: SECURE_CSRF_COOKIE }
    : { session: SESSION_COOKIE, csrf: CSRF_COOKIE };
}

export function parseCookies(header = "") {
  return String(header)
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separator = part.indexOf("=");
      if (separator <= 0) return cookies;
      const name = part.slice(0, separator).trim();
      const value = part.slice(separator + 1);
      try {
        cookies[name] = decodeURIComponent(value);
      } catch (error) {
        cookies[name] = value;
      }
      return cookies;
    }, {});
}

export function serializeCookie(name, value, {
  httpOnly = false,
  secure = config.secureCookies,
  maxAge,
  expires,
} = {}) {
  const parts = [`${name}=${encodeCookieValue(value)}`, "Path=/", "SameSite=Lax"];
  if (Number.isFinite(maxAge)) parts.push(`Max-Age=${Math.max(0, Math.floor(maxAge))}`);
  if (expires instanceof Date) parts.push(`Expires=${expires.toUTCString()}`);
  if (httpOnly) parts.push("HttpOnly");
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function readAuthCookies(req) {
  const cookies = parseCookies(req.get("cookie") || "");
  return {
    sessionToken: cookies[SECURE_SESSION_COOKIE] || cookies[SESSION_COOKIE] || "",
    csrfToken: cookies[SECURE_CSRF_COOKIE] || cookies[CSRF_COOKIE] || "",
  };
}

export function setAuthCookies(res, session) {
  const names = cookieNames();
  const expires = new Date(session.expiresAt);
  const maxAge = Math.max(0, Math.floor((expires.getTime() - Date.now()) / 1000));
  res.append("Set-Cookie", serializeCookie(names.session, session.token, {
    httpOnly: true,
    maxAge,
    expires,
  }));
  res.append("Set-Cookie", serializeCookie(names.csrf, session.csrfToken, {
    maxAge,
    expires,
  }));
}

export function setCsrfCookie(res, csrfToken, expiresAt) {
  const names = cookieNames();
  const expires = new Date(expiresAt);
  const maxAge = Math.max(0, Math.floor((expires.getTime() - Date.now()) / 1000));
  res.append("Set-Cookie", serializeCookie(names.csrf, csrfToken, {
    maxAge,
    expires,
  }));
}

export function clearAuthCookies(res) {
  const expired = new Date(0);
  for (const secure of [false, true]) {
    const names = cookieNames(secure);
    res.append("Set-Cookie", serializeCookie(names.session, "", {
      httpOnly: true,
      secure,
      maxAge: 0,
      expires: expired,
    }));
    res.append("Set-Cookie", serializeCookie(names.csrf, "", {
      secure,
      maxAge: 0,
      expires: expired,
    }));
  }
}

export function publicSession(session) {
  return {
    authMode: "cookie",
    expiresAt: session.expiresAt,
  };
}

export const authCookieNames = Object.freeze({
  development: cookieNames(false),
  secure: cookieNames(true),
});
