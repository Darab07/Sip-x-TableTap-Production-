import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import {
  createApiRateLimiter,
  enforceApiContentType,
  securityHeaders,
} from "./security.js";

export const log = (message: string, source = "express") => {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
};

const configuredOrigins = String(process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isOriginAllowed = (origin: string) => {
  if (!origin) return false;
  if (configuredOrigins.includes(origin)) return true;

  if (process.env.NODE_ENV !== "production") {
    return (
      origin.startsWith("http://localhost") ||
      origin.startsWith("https://localhost") ||
      origin.startsWith("http://127.0.0.1") ||
      origin.startsWith("https://127.0.0.1") ||
      /^https?:\/\/192\.168\.[0-9]{1,3}\.[0-9]{1,3}(:\d+)?$/.test(origin)
    );
  }

  return false;
};

const captureApiLogs = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, unknown> | undefined;

  const originalJson = res.json.bind(res);
  res.json = function jsonHook(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalJson(bodyJson, ...args);
  };

  res.on("finish", () => {
    if (!path.startsWith("/api")) {
      return;
    }
    const duration = Date.now() - start;
    let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
    if (capturedJsonResponse) {
      logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
    }

    if (logLine.length > 160) {
      logLine = `${logLine.slice(0, 159)}...`;
    }

    log(logLine);
  });

  next();
};

export const createApp = (): Express => {
  const app = express();

  // OWASP-style defaults for proxy/IP awareness and server fingerprint hardening.
  app.disable("x-powered-by");
  app.set("trust proxy", true);

  app.use(securityHeaders);

  app.use((req, res, next) => {
    const requestOrigin = String(req.headers.origin ?? "").trim();
    if (requestOrigin) {
      if (!isOriginAllowed(requestOrigin)) {
        if (req.method === "OPTIONS") {
          res.status(403).json({ message: "Origin is not allowed" });
          return;
        }
      } else {
        res.header("Access-Control-Allow-Origin", requestOrigin);
        res.header("Vary", "Origin");
        res.header("Access-Control-Allow-Credentials", "true");
      }
    }

    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );

    if (req.path.startsWith("/api")) {
      res.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.header("Pragma", "no-cache");
      res.header("Expires", "0");
      res.header("Surrogate-Control", "no-store");
    }
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "100kb" }));

  app.use(enforceApiContentType);
  app.use(createApiRateLimiter());
  app.use(captureApiLogs);

  return app;
};
