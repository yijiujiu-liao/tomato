const DEFAULT_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

export function createSecurityHeaders() {
  return (req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    res.setHeader("Content-Security-Policy", DEFAULT_CSP);

    if (req.secure) {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    next();
  };
}

export function createHttpsGuard({ enabled = false } = {}) {
  return (req, res, next) => {
    if (!enabled || req.secure) {
      next();
      return;
    }

    if (req.method === "GET" || req.method === "HEAD") {
      res.redirect(308, `https://${req.get("host")}${req.originalUrl}`);
      return;
    }

    res.status(426).json({
      error: "此操作需要通过 HTTPS 完成。",
    });
  };
}

export function createRateLimit({
  windowMs,
  max,
  key = (req) => req.ip,
  now = () => Date.now(),
}) {
  const buckets = new Map();
  let requestsSinceCleanup = 0;

  function cleanupExpiredBuckets(currentTime) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= currentTime) {
        buckets.delete(bucketKey);
      }
    }
  }

  function consume(req, res) {
    const currentTime = now();
    requestsSinceCleanup += 1;

    if (requestsSinceCleanup >= 100) {
      cleanupExpiredBuckets(currentTime);
      requestsSinceCleanup = 0;
    }

    const bucketKey = String(key(req) || "unknown");
    const current = buckets.get(bucketKey);
    const bucket = !current || current.resetAt <= currentTime
      ? { count: 0, resetAt: currentTime + windowMs }
      : current;

    bucket.count += 1;
    buckets.set(bucketKey, bucket);

    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, max - bucket.count)));
    res.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((bucket.resetAt - currentTime) / 1000))));
      res.status(429).json({ error: "请求过于频繁，请稍后再试。" });
      return false;
    }

    return true;
  }

  const middleware = (req, res, next) => {
    if (consume(req, res)) {
      next();
    }
  };

  middleware.consume = consume;
  middleware.cleanup = () => cleanupExpiredBuckets(now());
  middleware.size = () => buckets.size;
  return middleware;
}

export function createApiNotFoundHandler() {
  return (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      res.status(404).json({ error: "API 不存在。" });
      return;
    }

    next();
  };
}

export function createErrorHandler({ production = false, logError = console.error } = {}) {
  return (error, req, res, next) => {
    const statusCode = Number(error.statusCode) || 500;

    if (statusCode >= 500) {
      logError(error);
    }

    const message = production && statusCode >= 500
      ? "服务器暂时无法完成请求，请稍后重试。"
      : error.message || "服务器错误。";

    res.status(statusCode).json({ error: message });
  };
}
