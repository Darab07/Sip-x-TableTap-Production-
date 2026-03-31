import { createApp } from "../server/app";
import { buildApiRouter } from "../server/routes";

const app = createApp();
// Support both direct "/health" and prefixed "/api/health" style paths.
app.use("/api", buildApiRouter());
app.use("/", buildApiRouter());

app.use((err: unknown, _req: unknown, res: any, _next: unknown) => {
  const normalizedError = err as { status?: number; statusCode?: number; message?: string };
  const status = normalizedError.status || normalizedError.statusCode || 500;
  const message = normalizedError.message || "Internal Server Error";
  res.status(status).json({ message });
});

export default (req: any, res: any) => app(req, res);
