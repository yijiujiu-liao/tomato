import express from "express";
import { join } from "node:path";
import { config } from "./config.js";
import {
  createId,
  db,
  goalFromRow,
  nowIso,
  petFromRow,
  settingsFromRow,
  taskFromRow,
} from "./db.js";
import {
  createSession,
  createUser,
  deleteSession,
  getUserByEmail,
  refreshSessionCsrf,
  requireAuth,
  verifyPassword,
} from "./auth.js";
import { createAiSummaryService } from "./aiService.js";
import { getStorageStatus } from "./deployment.js";
import {
  createApiNotFoundHandler,
  createErrorHandler,
  createRateLimit,
  createSecurityHeaders,
  createHttpsGuard,
} from "./http.js";
import { createStatsService } from "./services/statsService.js";
import { createRelationResolver } from "./data/relations.js";
import { registerSystemRoutes } from "./routes/systemRoutes.js";
import { registerAuthRoutes } from "./routes/authRoutes.js";
import { registerSyncRoutes } from "./routes/syncRoutes.js";
import { registerProfileRoutes } from "./routes/profileRoutes.js";
import { registerTaskRoutes } from "./routes/taskRoutes.js";
import { registerGoalRoutes } from "./routes/goalRoutes.js";
import { registerFocusRoutes } from "./routes/focusRoutes.js";
import { registerStatsRoutes } from "./routes/statsRoutes.js";
import { registerAiRoutes } from "./routes/aiRoutes.js";

export function createApp() {
  const app = express();
  const publicDir = config.publicDir;
  const storageStatus = getStorageStatus(config);
  const relations = createRelationResolver(db);
  const statsService = createStatsService(db);
  const aiSummary = createAiSummaryService({ db, config, petFromRow });
  const authRateLimit = createRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
  });
  const aiRateLimit = createRateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    max: 24,
    key: (req) => req.auth?.user?.id || req.ip,
  });

  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy);
  app.use(createHttpsGuard({ enabled: config.enforceHttps }));
  app.use(createSecurityHeaders());
  app.use(express.json({ limit: "1mb" }));

  const staticOptions = {
    extensions: ["html"],
    setHeaders(res, filePath) {
      if (filePath.endsWith("sw.js")) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  };
  app.use("/js", express.static(join(publicDir, "js"), staticOptions));
  app.use("/css", express.static(join(publicDir, "css"), staticOptions));
  app.use("/assets", express.static(join(publicDir, "assets"), staticOptions));
  const legacyStyles = {
    "/css/theme.css": "css/foundation/theme.css",
    "/css/base.css": "css/foundation/base.css",
    "/css/layout.css": "css/layout/shell.css",
  };
  for (const [route, filePath] of Object.entries(legacyStyles)) {
    app.get(route, (req, res) => {
      res.type("text/css").sendFile(join(publicDir, filePath));
    });
  }
  for (const asset of [
    "style.css",
    "script.js",
    "application.js",
    "sw.js",
    "manifest.json",
    "icon-192.png",
    "icon-512.png",
    "icon.svg",
  ]) {
    app.get(`/${asset}`, (req, res) => res.sendFile(join(publicDir, asset)));
  }
  app.get(["/", "/index.html"], (req, res) => {
    res.sendFile(join(publicDir, "index.html"));
  });

  registerSystemRoutes(app, {
    db,
    environment: config.nodeEnv,
    getAiStatus: aiSummary.getAiStatus,
    storageStatus,
  });
  registerAuthRoutes(app, {
    authRateLimit,
    createSession,
    createUser,
    deleteSession,
    getUserByEmail,
    refreshSessionCsrf,
    requireAuth,
    verifyPassword,
  });
  registerSyncRoutes(app, {
    db,
    goalFromRow,
    petFromRow,
    requireAuth,
    settingsFromRow,
    taskFromRow,
  });
  registerProfileRoutes(app, {
    db,
    nowIso,
    petFromRow,
    relations,
    requireAuth,
    settingsFromRow,
  });
  registerTaskRoutes(app, {
    createId,
    db,
    nowIso,
    relations,
    requireAuth,
    taskFromRow,
  });
  registerGoalRoutes(app, {
    createId,
    db,
    goalFromRow,
    nowIso,
    requireAuth,
  });
  registerFocusRoutes(app, {
    createId,
    db,
    nowIso,
    relations,
    requireAuth,
  });
  registerStatsRoutes(app, { db, requireAuth, statsService });
  registerAiRoutes(app, {
    aiRateLimit,
    config,
    db,
    nowIso,
    requireAuth,
    service: {
      buildContext: aiSummary.buildDailySummaryContext,
      generate: aiSummary.generateDailySummary,
      getModel: aiSummary.getAiModel,
      getStoredSummary: aiSummary.getStoredDailySummary,
      isConfigured: () => Boolean(aiSummary.getAiApiKey()),
    },
  });

  app.use(createApiNotFoundHandler());
  app.use(createErrorHandler({ production: config.nodeEnv === "production" }));
  return { app, storageStatus };
}
