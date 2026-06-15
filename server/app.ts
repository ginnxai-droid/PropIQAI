import path from "node:path";
import express, { type RequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import type { AppConfig } from "./config";
import { loadConfig } from "./config";
import { createAuthMiddleware } from "./auth";
import { errorHandler, notFoundHandler } from "./errors";
import { bootstrapRouter } from "./routes/bootstrap";
import { dashboardRouter } from "./routes/dashboard";
import { handoffsRouter } from "./routes/handoffs";
import { leadsRouter } from "./routes/leads";
import { organizationRouter } from "./routes/organization";
import { projectsRouter } from "./routes/projects";
import { siteVisitsRouter } from "./routes/siteVisits";
import { slaRouter } from "./routes/sla";
import { tasksRouter } from "./routes/tasks";
import { alertsRouter } from "./routes/alerts";
import { intakeRouter, publicIntakeRouter } from "./routes/intake";
import { healthRouter } from "./routes/health";
import { pilotRouter } from "./routes/pilot";
import { requestContext } from "./observability";

interface CreateAppOptions {
  config?: AppConfig;
  authMiddleware?: RequestHandler;
}

export function createApp(options: CreateAppOptions = {}) {
  const config = options.config ?? loadConfig();
  const app = express();
  app.locals.config = config;
  const allowedOrigins = new Set(
    config.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()),
  );

  app.disable("x-powered-by");
  app.use(requestContext);
  app.use(helmet());
  app.use(
    cors({
      credentials: false,
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("Origin is not allowed"));
      },
    }),
  );
  app.use(express.json({ limit: "256kb" }));
  app.use(
    "/api",
    rateLimit({
      windowMs: 60_000,
      limit: config.NODE_ENV === "test" ? 10_000 : 120,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );

  app.use("/api/health", healthRouter);

  app.use("/api/intake", publicIntakeRouter);
  app.use("/api", options.authMiddleware ?? createAuthMiddleware(config));
  app.use("/api", bootstrapRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/leads", leadsRouter);
  app.use("/api/handoffs", handoffsRouter);
  app.use("/api/site-visits", siteVisitsRouter);
  app.use("/api/sla", slaRouter);
  app.use("/api/tasks", tasksRouter);
  app.use("/api/alerts", alertsRouter);
  app.use("/api/intake", intakeRouter);
  app.use("/api/organization", organizationRouter);
  app.use("/api/pilot", pilotRouter);

  if (config.NODE_ENV === "production") {
    const clientDirectory = path.resolve(process.cwd(), "dist");
    app.use(express.static(clientDirectory));
    app.get("*", (_request, response) => {
      response.sendFile(path.join(clientDirectory, "index.html"));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
