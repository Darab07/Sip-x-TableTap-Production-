import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";

const log = (message: string, source = "express") => {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
};

const ALLOWED_ORIGINS = "*";

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

    if (logLine.length > 80) {
      logLine = `${logLine.slice(0, 79)}...`;
    }

    log(logLine);
  });

  next();
};

export const createApp = (): Express => {
  const app = express();

  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", ALLOWED_ORIGINS);
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use(captureApiLogs);

  return app;
};
