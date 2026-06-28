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

export const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV || "development",
  port: readIntegerEnv("PORT", 3000, 1, 65535),
  databasePath: resolve(process.env.DATABASE_PATH || "./data/tomato.sqlite"),
  sessionTtlDays: readIntegerEnv("SESSION_TTL_DAYS", 30, 1, 365),
  publicDir: resolve(".")
});
