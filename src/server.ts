import {
  createServer as createHttpServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { join } from "node:path";

import { recordAudit } from "./audit";
import { authenticate } from "./auth/authenticate";
import { AppDatabase } from "./database";
import { sendError } from "./http/errors";
import { PayloadTooLargeError, sendJson } from "./http/json";
import {
  RateLimits,
  sendRateLimited,
  type RateLimitConfig,
} from "./http/rate-limit";
import { handleAuditRoutes } from "./routes/audit";
import { handleAuthRoutes } from "./routes/auth";
import { handleContestantRoutes } from "./routes/contestants";
import { handleLeaguePlayerRoutes } from "./routes/league-players";
import { handleLeagueRoutes } from "./routes/leagues";
import { handlePredictionRoutes } from "./routes/predictions";
import { handleResultRoutes } from "./routes/results";
import { handleSeasonRoutes } from "./routes/seasons";
import { handleStandingsRoutes } from "./routes/standings";
import { handleUserRoutes } from "./routes/users";
import { handleWeekRoutes } from "./routes/weeks";
import { configFromEnv } from "./config";

export interface ServerOptions {
  databasePath?: string;
  adminEmails?: string[];
  deliverLoginCode?: (email: string, code: string) => void;
  /** Origins allowed to call the API from a browser. Unset allows any origin. */
  corsOrigins?: string[];
  /** Rate limits on login, verify, and sign-up. Unset means no limits. */
  rateLimits?: RateLimitConfig;
  /** Behind a reverse proxy, take the client IP from X-Forwarded-For. */
  trustProxy?: boolean;
  /** Receives one line per request (method, path, status, time). */
  logger?: (line: string) => void;
}

function defaultDeliverLoginCode(email: string, code: string): void {
  console.log(`Login code for ${email}: ${code}`);
}

function parseAdminEmails(options: ServerOptions): string[] {
  const emails =
    options.adminEmails ?? (process.env.ADMIN_EMAILS ?? "").split(",");
  return emails
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email !== "");
}

function isPublicRoute(method: string | undefined, pathname: string): boolean {
  return (
    (method === "POST" && pathname === "/users") ||
    (method === "POST" && pathname === "/auth/login") ||
    (method === "POST" && pathname === "/auth/login/verify")
  );
}

function setCorsHeaders(
  request: IncomingMessage,
  response: ServerResponse,
  allowedOrigins: string[] | undefined,
): void {
  if (!allowedOrigins) {
    response.setHeader("Access-Control-Allow-Origin", "*");
  } else {
    response.setHeader("Vary", "Origin");
    const origin = request.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      response.setHeader("Access-Control-Allow-Origin", origin);
    }
  }
  response.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS",
  );
  response.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );
}

export function createServer(options: ServerOptions = {}): Server {
  const database = new AppDatabase(
    options.databasePath ??
      process.env.DATABASE_PATH ??
      join(process.cwd(), "users.db"),
  );
  const adminEmails = parseAdminEmails(options);
  const deliverLoginCode = options.deliverLoginCode ?? defaultDeliverLoginCode;
  const rateLimits = options.rateLimits
    ? new RateLimits(options.rateLimits, options.trustProxy ?? false)
    : undefined;

  const server = createHttpServer(async (request, response) => {
    const url = new URL(
      request.url ?? "/",
      `http://${request.headers.host ?? "localhost"}`,
    );

    setCorsHeaders(request, response, options.corsOrigins);
    response.setHeader("X-Content-Type-Options", "nosniff");
    if (options.logger) {
      const started = Date.now();
      response.on("finish", () =>
        options.logger!(
          `${request.method} ${url.pathname} ${response.statusCode} ${Date.now() - started}ms`,
        ),
      );
    }
    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    try {
      const retryAfter = rateLimits?.forRequest(request, url);
      if (retryAfter !== undefined) {
        sendRateLimited(response, retryAfter);
        return;
      }

      if (request.method === "GET" && url.pathname === "/") {
        sendJson(response, 200, { message: "Hello from the Node API!" });
        return;
      }
      if (request.method === "GET" && url.pathname === "/health") {
        sendJson(response, 200, { status: "ok" });
        return;
      }

      const auth = authenticate(request, database, adminEmails);
      if (!auth && !isPublicRoute(request.method, url.pathname)) {
        sendError(response, 401, "UNAUTHENTICATED", "Authentication required");
        return;
      }

      if (
        (await handleAuthRoutes(
          request,
          response,
          url,
          database,
          auth,
          deliverLoginCode,
          rateLimits,
        )) ||
        (await handleSeasonRoutes(request, response, url, database, auth)) ||
        (await handleContestantRoutes(
          request,
          response,
          url,
          database,
          auth,
        )) ||
        (await handleWeekRoutes(request, response, url, database, auth)) ||
        (await handlePredictionRoutes(
          request,
          response,
          url,
          database,
          auth,
        )) ||
        (await handleLeaguePlayerRoutes(
          request,
          response,
          url,
          database,
          auth,
        )) ||
        (await handleLeagueRoutes(request, response, url, database, auth)) ||
        (await handleStandingsRoutes(
          request,
          response,
          url,
          database,
          auth,
        )) ||
        (await handleResultRoutes(request, response, url, database, auth)) ||
        (await handleAuditRoutes(request, response, url, database, auth)) ||
        (await handleUserRoutes(request, response, url, database, auth))
      ) {
        recordAudit(database, request, response, url, auth);
        return;
      }

      sendError(response, 404, "NOT_FOUND", "Not found");
    } catch (error) {
      if (error instanceof PayloadTooLargeError) {
        response.setHeader("Connection", "close");
        sendError(response, 413, "PAYLOAD_TOO_LARGE", "Request body is too large");
        return;
      }
      if (error instanceof SyntaxError) {
        sendError(response, 400, "INVALID_JSON", "Invalid JSON");
        return;
      }
      if (
        error instanceof Error &&
        (error as NodeJS.ErrnoException).code === "ERR_SQLITE_ERROR" &&
        error.message.includes("FOREIGN KEY constraint failed")
      ) {
        sendError(
          response,
          409,
          "CONFLICT",
          "This action conflicts with existing data",
        );
        return;
      }
      console.error(error);
      sendError(response, 500, "INTERNAL_ERROR", "Internal server error");
    }
  });

  server.on("close", () => database.close());
  return server;
}

if (require.main === module) {
  const { port, ...options } = configFromEnv();
  const server = createServer(options);
  server.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });

  // Finish in-flight requests on a stop signal; closing the server also
  // closes the database.
  const shutdown = () => {
    server.close(() => process.exit(0));
    server.closeIdleConnections();
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
