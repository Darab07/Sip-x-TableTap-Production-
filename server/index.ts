import type { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createApp } from "./app";

// Node 20+ native .env loading for local development.
const maybeLoadEnvFile = (
  process as typeof process & { loadEnvFile?: (path?: string) => void }
).loadEnvFile;
if (typeof maybeLoadEnvFile === "function") {
  maybeLoadEnvFile(".env");
}

const app = createApp();

(async () => {
  const server = await registerRoutes(app);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const normalizedError = err as { status?: number; statusCode?: number; message?: string };
    const status = normalizedError.status || normalizedError.statusCode || 500;
    const message = normalizedError.message || "Internal Server Error";

    res.status(status).json({ message });
    log(`request failed with ${status}: ${message}`, "error");
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();