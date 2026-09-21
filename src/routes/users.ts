import type { IncomingMessage, ServerResponse } from "node:http";

import type { AuthContext } from "../auth/context";
import type { AppDatabase } from "../database";
import { sendError } from "../http/errors";
import { readJson, sendJson } from "../http/json";
import { buildListResponse, paginate, parsePagination } from "../http/pagination";
import type { CreateUserInput, UpdateUserInput, User } from "../types/user";

function parseCreateInput(body: unknown): CreateUserInput | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }

  const { name, email } = body as Record<string, unknown>;
  if (
    typeof name !== "string" ||
    name.trim() === "" ||
    typeof email !== "string" ||
    email.trim() === ""
  ) {
    return undefined;
  }

  return { name: name.trim(), email: email.trim().toLowerCase() };
}

interface UserPatchInput {
  name?: string;
  email?: string;
  active?: boolean;
}

function parsePatchInput(body: unknown): UserPatchInput | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }

  const { name, email, active } = body as Record<string, unknown>;
  if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
    return undefined;
  }
  if (
    email !== undefined &&
    (typeof email !== "string" || email.trim() === "")
  ) {
    return undefined;
  }
  if (active !== undefined && typeof active !== "boolean") {
    return undefined;
  }

  return {
    name: typeof name === "string" ? name.trim() : undefined,
    email: typeof email === "string" ? email.trim().toLowerCase() : undefined,
    active,
  };
}

function mergePatch(current: User, patch: UserPatchInput): UpdateUserInput {
  return {
    name: patch.name ?? current.name,
    email: patch.email ?? current.email,
    active: patch.active ?? current.active,
  };
}

/**
 * Other people only ever see a name. Emails and account state are visible to
 * the user themselves and to admins.
 */
function viewOf(user: User, auth: AuthContext): User | { id: number; name: string } {
  return auth.isAdmin || auth.user.id === user.id
    ? user
    : { id: user.id, name: user.name };
}

export async function handleUserRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  database: AppDatabase,
  auth: AuthContext | undefined,
): Promise<boolean> {
  if (request.method === "POST" && url.pathname === "/users") {
    const input = parseCreateInput(await readJson(request));
    if (!input) {
      sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "Name and email are required",
      );
      return true;
    }
    if (database.users.getByEmail(input.email)) {
      sendError(response, 409, "CONFLICT", "Email already exists");
      return true;
    }
    sendJson(response, 201, database.users.create(input));
    return true;
  }

  if (request.method === "GET" && url.pathname === "/users") {
    if (!auth) {
      sendError(response, 401, "UNAUTHENTICATED", "Authentication required");
      return true;
    }
    const pagination = parsePagination(url);
    if (!pagination) {
      sendError(response, 400, "VALIDATION_ERROR", "Invalid limit or cursor");
      return true;
    }
    const rows = auth.isAdmin
      ? database.users.list(pagination)
      : database.users.listVisibleTo(auth.user.id, pagination);
    const { items, nextCursor } = paginate(rows, pagination.limit);
    sendJson(
      response,
      200,
      buildListResponse(
        { items: items.map((user) => viewOf(user, auth)), nextCursor },
        pagination.limit,
      ),
    );
    return true;
  }

  const match = url.pathname.match(/^\/users\/(\d+)$/);
  if (!match) {
    return false;
  }

  if (!auth) {
    sendError(response, 401, "UNAUTHENTICATED", "Authentication required");
    return true;
  }

  const id = Number(match[1]);
  if (request.method === "GET") {
    const user = database.users.get(id);
    // Strangers get the same 404 as a missing user, so ids can't be probed.
    if (
      !user ||
      !(auth.isAdmin || auth.user.id === id || database.users.sharesLeague(auth.user.id, id))
    ) {
      sendError(response, 404, "NOT_FOUND", "User not found");
      return true;
    }
    sendJson(response, 200, viewOf(user, auth));
    return true;
  }

  if (request.method === "PATCH") {
    const current = database.users.get(id);
    if (!current) {
      sendError(response, 404, "NOT_FOUND", "User not found");
      return true;
    }
    if (!auth.isAdmin && auth.user.id !== id) {
      sendError(
        response,
        403,
        "FORBIDDEN",
        "You may only update your own account",
      );
      return true;
    }
    const patch = parsePatchInput(await readJson(request));
    if (!patch) {
      sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "Name, email, and active must be valid if provided",
      );
      return true;
    }
    const merged = mergePatch(current, patch);
    const emailOwner = database.users.getByEmail(merged.email);
    if (emailOwner && emailOwner.id !== id) {
      sendError(response, 409, "CONFLICT", "Email already exists");
      return true;
    }
    sendJson(response, 200, database.users.update(id, merged));
    return true;
  }

  if (request.method === "DELETE") {
    if (!database.users.get(id)) {
      sendError(response, 404, "NOT_FOUND", "User not found");
      return true;
    }
    if (!auth.isAdmin && auth.user.id !== id) {
      sendError(
        response,
        403,
        "FORBIDDEN",
        "You may only delete your own account",
      );
      return true;
    }
    database.users.delete(id);
    response.writeHead(204);
    response.end();
    return true;
  }

  return false;
}
