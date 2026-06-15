import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const requestContext: RequestHandler = (request, response, next) => {
  const requestId = request.header("x-request-id")?.trim() || randomUUID();
  response.locals.requestId = requestId;
  response.setHeader("x-request-id", requestId);
  const startedAt = Date.now();
  response.on("finish", () => {
    console.log(
      JSON.stringify({
        level: "info",
        event: "http_request",
        requestId,
        method: request.method,
        path: request.path,
        status: response.statusCode,
        durationMs: Date.now() - startedAt,
      }),
    );
  });
  next();
};

export function logStartup(fields: Record<string, unknown>) {
  console.log(JSON.stringify({ level: "info", event: "startup", ...fields }));
}

export function logError(
  requestId: string | undefined,
  error: unknown,
) {
  console.error(
    JSON.stringify({
      level: "error",
      event: "api_error",
      requestId: requestId ?? "unknown",
      errorName: error instanceof Error ? error.name : "UnknownError",
      message: "Unexpected API error",
    }),
  );
}
