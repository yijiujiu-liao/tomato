import { resolve } from "node:path";

function readIntegerEnv(name, fallback, min, max) {
  const value = Number(process.env[name] || fallback);

  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a number.`);
  }

  const integer = Math.floor(value);

  if (integer < min || integer > max) {
    throw new Error(`${name} must be between ${min} and ${max}.`);
  }

  return integer;
}

function readBooleanEnv(name, fallback = false) {
  const rawValue = process.env[name];

  if (rawValue === undefined || rawValue === "") {
    return fallback;
  }

  if (["1", "true", "yes", "on"].includes(rawValue.toLowerCase())) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(rawValue.toLowerCase())) {
    return false;
  }

  throw new Error(`${name} must be a boolean.`);
}

const nodeEnv = process.env.NODE_ENV || "development";
const enforceHttps = readBooleanEnv("ENFORCE_HTTPS", false);

export const config = Object.freeze({
  nodeEnv,
  platform: process.env.RENDER === "true" ? "render" : "self-managed",
  port: readIntegerEnv("PORT", 3000, 1, 65535),
  databasePath: resolve(process.env.DATABASE_PATH || "./data/tomato.sqlite"),
  sessionTtlDays: readIntegerEnv("SESSION_TTL_DAYS", 30, 1, 365),
  trustProxy: readBooleanEnv("TRUST_PROXY", false),
  enforceHttps,
  secureCookies: readBooleanEnv("SECURE_COOKIES", nodeEnv === "production" || enforceHttps),
  aiProvider: process.env.AI_PROVIDER === "deepseek" ? "deepseek" : "openai",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "gpt-5.5",
  openaiBaseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || "",
  deepseekModel: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
  deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  publicDir: resolve(".")
});
