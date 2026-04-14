import { createHash } from "crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { z, type ZodTypeAny } from "zod";
import { HttpError } from "./errors.js";

type RateWindow = {
  limit: number;
  windowMs: number;
};

type RatePolicy = {
  name: string;
  match: (req: Request) => boolean;
  ip: RateWindow;
  user: RateWindow;
};

type RateCounter = {
  count: number;
  resetAtMs: number;
};

type ValidationSchemas = {
  params?: ZodTypeAny;
  query?: ZodTypeAny;
  body?: ZodTypeAny;
};

const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const MAX_USER_KEY_LEN = 128;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Object.prototype.toString.call(value) === "[object Object]";

const hashValue = (value: string) =>
  createHash("sha256").update(value).digest("base64url").slice(0, 24);

const sanitizeString = (value: string) =>
  value.replace(CONTROL_CHARS_REGEX, "").trim();

export const sanitizeInput = (value: unknown): unknown => {
  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeInput(entry));
  }

  if (isPlainObject(value)) {
    const sanitizedEntries = Object.entries(value).map(([key, entryValue]) => [
      key,
      sanitizeInput(entryValue),
    ]);
    return Object.fromEntries(sanitizedEntries);
  }

  return value;
};

const formatPath = (path: Array<string | number>) => {
  if (!path.length) return "request";
  return path
    .map((segment) =>
      typeof segment === "number" ? `[${segment}]` : String(segment),
    )
    .join(".");
};

const formatZodError = (error: z.ZodError) => {
  const messages = error.issues.map((issue) => {
    const path = formatPath(issue.path);
    return `${path}: ${issue.message}`;
  });
  return messages.join("; ");
};

const parseWithSchema = <TSchema extends ZodTypeAny>(
  input: unknown,
  schema: TSchema,
  sourceLabel: string,
): z.infer<TSchema> => {
  const sanitized = sanitizeInput(input);
  const parsed = schema.safeParse(sanitized);
  if (!parsed.success) {
    throw new HttpError(400, `${sourceLabel} is invalid. ${formatZodError(parsed.error)}`);
  }
  return parsed.data;
};

export const strictObject = <TShape extends z.ZodRawShape>(shape: TShape) =>
  z.object(shape).strict();

export const applyValidation =
  (schemas: ValidationSchemas): RequestHandler =>
  (req, _res, next) => {
    try {
      if (schemas.params) {
        req.params = parseWithSchema(req.params, schemas.params, "URL params") as Request["params"];
      }
      if (schemas.query) {
        req.query = parseWithSchema(req.query, schemas.query, "Query string") as Request["query"];
      }
      if (schemas.body) {
        req.body = parseWithSchema(req.body, schemas.body, "Request body");
      }
      next();
    } catch (error) {
      next(error);
    }
  };

const getClientIp = (req: Request) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (Array.isArray(forwardedFor)) {
    const candidate = forwardedFor[0]?.split(",")[0]?.trim();
    if (candidate) return candidate;
  } else if (typeof forwardedFor === "string") {
    const candidate = forwardedFor.split(",")[0]?.trim();
    if (candidate) return candidate;
  }

  return req.ip || req.socket.remoteAddress || "unknown";
};

const getAuthorizationToken = (req: Request) => {
  const rawAuth = String(req.headers.authorization ?? "").trim();
  if (!rawAuth.toLowerCase().startsWith("bearer ")) return "";
  return rawAuth.slice(7).trim();
};

const getUserKey = (req: Request) => {
  const authenticatedId = String(req.authenticatedUser?.id ?? "").trim();
  if (authenticatedId) {
    return `uid:${authenticatedId.slice(0, MAX_USER_KEY_LEN)}`;
  }

  const bearerToken = getAuthorizationToken(req);
  if (bearerToken) {
    return `token:${hashValue(bearerToken)}`;
  }

  const bodyCandidate = isPlainObject(req.body)
    ? req.body
    : ({} as Record<string, unknown>);

  const authUserId = String(bodyCandidate.customerAuthUserId ?? "").trim();
  if (authUserId) {
    return `auth_user:${authUserId.slice(0, MAX_USER_KEY_LEN)}`;
  }

  const deviceFingerprint = String(bodyCandidate.deviceFingerprint ?? "").trim();
  if (deviceFingerprint) {
    return `device:${hashValue(deviceFingerprint)}`;
  }

  const email = String(bodyCandidate.customerEmail ?? "").trim().toLowerCase();
  if (email) {
    return `email:${hashValue(email)}`;
  }

  return "anonymous";
};

const shouldApplyAggressiveWritePolicy = (req: Request) => {
  if (!["POST", "PATCH", "DELETE", "PUT"].includes(req.method.toUpperCase())) {
    return false;
  }

  const path = req.path;
  return (
    path.startsWith("/api/orders/place") ||
    path.startsWith("/api/tables/check-in") ||
    path.startsWith("/api/waiter/call") ||
    path.startsWith("/api/push/subscribe") ||
    path.startsWith("/api/push/unsubscribe") ||
    path.startsWith("/api/orders/track/start") ||
    path.startsWith("/api/customers/profile") ||
    path.startsWith("/api/admin/qr-codes")
  );
};

const shouldApplyPublicReadPolicy = (req: Request) => {
  if (req.method.toUpperCase() !== "GET") return false;
  const path = req.path;
  return (
    path.startsWith("/api/menu/catalog") ||
    path.startsWith("/api/tables/public-access") ||
    path.startsWith("/api/push/public-key") ||
    path.startsWith("/api/orders/") ||
    path.startsWith("/api/orders/history") ||
    path.startsWith("/api/orders/loyalty-summary")
  );
};

const pickPolicy = (req: Request): RatePolicy => {
  const defaultPolicy: RatePolicy = {
    name: "api-default",
    match: () => true,
    ip: { limit: 180, windowMs: 60_000 },
    user: { limit: 240, windowMs: 60_000 },
  };

  const policies: RatePolicy[] = [
    {
      name: "public-write",
      match: shouldApplyAggressiveWritePolicy,
      ip: { limit: 30, windowMs: 60_000 },
      user: { limit: 45, windowMs: 60_000 },
    },
    {
      name: "public-read",
      match: shouldApplyPublicReadPolicy,
      ip: { limit: 120, windowMs: 60_000 },
      user: { limit: 180, windowMs: 60_000 },
    },
  ];

  return policies.find((policy) => policy.match(req)) ?? defaultPolicy;
};

const createCounterManager = () => {
  const counters = new Map<string, RateCounter>();
  let sweepTick = 0;

  const sweepExpired = (nowMs: number) => {
    counters.forEach((value, key) => {
      if (value.resetAtMs <= nowMs) {
        counters.delete(key);
      }
    });
  };

  const increment = (key: string, window: RateWindow, nowMs: number) => {
    const existing = counters.get(key);
    if (!existing || existing.resetAtMs <= nowMs) {
      const resetAtMs = nowMs + window.windowMs;
      const next: RateCounter = { count: 1, resetAtMs };
      counters.set(key, next);
      return next;
    }

    existing.count += 1;
    return existing;
  };

  const maybeSweep = (nowMs: number) => {
    sweepTick += 1;
    if (sweepTick % 250 === 0) {
      sweepExpired(nowMs);
    }
  };

  return { increment, maybeSweep };
};

export const createApiRateLimiter = (): RequestHandler => {
  const counterManager = createCounterManager();

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.path.startsWith("/api")) {
      next();
      return;
    }

    if (req.method.toUpperCase() === "OPTIONS") {
      next();
      return;
    }

    const nowMs = Date.now();
    counterManager.maybeSweep(nowMs);

    const policy = pickPolicy(req);
    const ipKey = `ip:${policy.name}:${hashValue(getClientIp(req))}`;
    const userKey = `user:${policy.name}:${hashValue(getUserKey(req))}`;

    const ipCounter = counterManager.increment(ipKey, policy.ip, nowMs);
    const userCounter = counterManager.increment(userKey, policy.user, nowMs);

    const ipRemaining = Math.max(0, policy.ip.limit - ipCounter.count);
    const userRemaining = Math.max(0, policy.user.limit - userCounter.count);

    res.setHeader("X-RateLimit-Policy", policy.name);
    res.setHeader("X-RateLimit-IP-Limit", String(policy.ip.limit));
    res.setHeader("X-RateLimit-IP-Remaining", String(ipRemaining));
    res.setHeader("X-RateLimit-User-Limit", String(policy.user.limit));
    res.setHeader("X-RateLimit-User-Remaining", String(userRemaining));

    const ipExceeded = ipCounter.count > policy.ip.limit;
    const userExceeded = userCounter.count > policy.user.limit;
    if (!ipExceeded && !userExceeded) {
      next();
      return;
    }

    const resetAtMs = Math.min(ipCounter.resetAtMs, userCounter.resetAtMs);
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000));

    res.setHeader("Retry-After", String(retryAfterSeconds));
    res.status(429).json({
      message: "Too many requests. Please retry shortly.",
      code: "RATE_LIMITED",
      retryAfterSeconds,
      policy: policy.name,
    });
  };
};

export const securityHeaders: RequestHandler = (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (req.path.startsWith("/api")) {
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  }

  next();
};

export const enforceApiContentType: RequestHandler = (req, _res, next) => {
  if (!req.path.startsWith("/api")) {
    next();
    return;
  }

  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method.toUpperCase())) {
    next();
    return;
  }

  const contentType = String(req.headers["content-type"] ?? "").toLowerCase();
  if (!contentType) {
    next();
    return;
  }

  const isJson = contentType.includes("application/json");
  const isForm = contentType.includes("application/x-www-form-urlencoded");
  if (isJson || isForm) {
    next();
    return;
  }

  next(new HttpError(415, "Unsupported content-type. Use application/json."));
};
