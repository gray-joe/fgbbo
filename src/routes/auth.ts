import type { IncomingMessage, ServerResponse } from "node:http";

import type { AuthContext } from "../auth/context";
import { generateOtac } from "../auth/otac";
import type { AppDatabase } from "../database";
import { sendError } from "../http/errors";
import { readJson, sendJson } from "../http/json";
import { sendRateLimited, type RateLimits } from "../http/rate-limit";

function parseEmailInput(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }
  const { email } = body as Record<string, unknown>;
  if (typeof email !== "string" || email.trim() === "") {
    return undefined;
  }
  return email.trim().toLowerCase();
}

function parseVerifyInput(
  body: unknown,
): { email: string; code: string } | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }
  const { email, code } = body as Record<string, unknown>;
  if (
    typeof email !== "string" ||
    email.trim() === "" ||
    typeof code !== "string" ||
    code.trim() === ""
  ) {
    return undefined;
  }
  return { email: email.trim().toLowerCase(), code: code.trim() };
}

export async function handleAuthRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  database: AppDatabase,
  auth: AuthContext | undefined,
  deliverLoginCode: (email: string, code: string) => void,
  rateLimits?: RateLimits,
): Promise<boolean> {
  if (request.method === "POST" && url.pathname === "/auth/login") {
    const email = parseEmailInput(await readJson(request));
    if (!email) {
      sendError(response, 400, "VALIDATION_ERROR", "Email is required");
      return true;
    }
    const retryAfter = rateLimits?.forLoginEmail(email);
    if (retryAfter !== undefined) {
      sendRateLimited(response, retryAfter);
      return true;
    }
    const user = database.users.getByEmail(email);
    if (user && user.active) {
      const code = generateOtac();
      database.loginCodes.create(email, code);
      deliverLoginCode(email, code);
    }
    sendJson(response, 200, {
      message: "If that email has an account, a login code was sent",
    });
    return true;
  }

  if (request.method === "POST" && url.pathname === "/auth/login/verify") {
    const input = parseVerifyInput(await readJson(request));
    if (!input) {
      sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "Email and code are required",
      );
      return true;
    }
    const codeValid = database.loginCodes.consume(input.email, input.code);
    const user = codeValid ? database.users.getByEmail(input.email) : undefined;
    if (!user || !user.active) {
      sendError(response, 401, "UNAUTHENTICATED", "Invalid or expired code");
      return true;
    }
    const token = database.sessions.create(user.id);
    sendJson(response, 200, { token, user });
    return true;
  }

  if (request.method === "GET" && url.pathname === "/auth/me") {
    if (!auth) {
      sendError(response, 401, "UNAUTHENTICATED", "Authentication required");
      return true;
    }
    sendJson(response, 200, { user: auth.user, is_admin: auth.isAdmin });
    return true;
  }

  if (request.method === "DELETE" && url.pathname === "/auth/logout") {
    if (!auth) {
      sendError(response, 401, "UNAUTHENTICATED", "Authentication required");
      return true;
    }
    const header = request.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (token) {
      database.sessions.delete(token);
    }
    response.writeHead(204);
    response.end();
    return true;
  }

  return false;
}
