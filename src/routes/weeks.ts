import type { IncomingMessage, ServerResponse } from "node:http";

import type { AuthContext } from "../auth/context";
import type { AppDatabase } from "../database";
import { sendError } from "../http/errors";
import { readJson, sendJson } from "../http/json";
import {
  buildListResponse,
  INVALID_ID_FILTER,
  paginate,
  parseOptionalId,
  parsePagination,
} from "../http/pagination";
import type { CreateWeekInput, UpdateWeekInput, Week } from "../types/week";

function parseIsoDate(value: unknown): Date | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseCreateInput(body: unknown): CreateWeekInput | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }

  const { number, theme, season_id, prediction_deadline } = body as Record<
    string,
    unknown
  >;
  const deadline = parseIsoDate(prediction_deadline);
  if (
    typeof number !== "number" ||
    !Number.isSafeInteger(number) ||
    number < 1 ||
    typeof theme !== "string" ||
    theme.trim() === "" ||
    typeof season_id !== "number" ||
    !Number.isSafeInteger(season_id) ||
    season_id < 1 ||
    !deadline
  ) {
    return undefined;
  }

  return {
    number,
    theme: theme.trim(),
    season_id,
    prediction_deadline: deadline,
  };
}

interface WeekPatchInput {
  number?: number;
  theme?: string;
  prediction_deadline?: Date;
}

function parsePatchInput(body: unknown): WeekPatchInput | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }

  const { number, theme, prediction_deadline } = body as Record<
    string,
    unknown
  >;
  if (
    number !== undefined &&
    (typeof number !== "number" ||
      !Number.isSafeInteger(number) ||
      number < 1)
  ) {
    return undefined;
  }
  if (
    theme !== undefined &&
    (typeof theme !== "string" || theme.trim() === "")
  ) {
    return undefined;
  }
  let deadline: Date | undefined;
  if (prediction_deadline !== undefined) {
    deadline = parseIsoDate(prediction_deadline);
    if (!deadline) {
      return undefined;
    }
  }

  return {
    number,
    theme: typeof theme === "string" ? theme.trim() : undefined,
    prediction_deadline: deadline,
  };
}

function mergePatch(current: Week, patch: WeekPatchInput): UpdateWeekInput {
  return {
    number: patch.number ?? current.number,
    theme: patch.theme ?? current.theme,
    prediction_deadline: patch.prediction_deadline ?? current.prediction_deadline,
  };
}

export async function handleWeekRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  database: AppDatabase,
  auth: AuthContext | undefined,
): Promise<boolean> {
  const isCollection = url.pathname === "/weeks";
  const match = url.pathname.match(/^\/weeks\/(\d+)$/);
  if (!isCollection && !match) {
    return false;
  }
  if (!auth) {
    sendError(response, 401, "UNAUTHENTICATED", "Authentication required");
    return true;
  }

  if (request.method === "GET" && url.pathname === "/weeks") {
    const pagination = parsePagination(url);
    const seasonId = parseOptionalId(url, "season_id");
    if (!pagination || seasonId === INVALID_ID_FILTER) {
      sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "Invalid limit, cursor, or season_id",
      );
      return true;
    }
    const rows = database.weeks.list(pagination, seasonId);
    sendJson(
      response,
      200,
      buildListResponse(paginate(rows, pagination.limit), pagination.limit),
    );
    return true;
  }

  if (request.method === "POST" && url.pathname === "/weeks") {
    if (!auth.isAdmin) {
      sendError(response, 403, "FORBIDDEN", "Administrator access required");
      return true;
    }
    const input = parseCreateInput(await readJson(request));
    if (!input) {
      sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "A positive integer number, theme, season_id, and prediction_deadline are required",
      );
      return true;
    }
    if (!database.seasons.get(input.season_id)) {
      sendError(response, 404, "NOT_FOUND", "Season not found");
      return true;
    }
    if (database.weeks.getByNumber(input.season_id, input.number)) {
      sendError(
        response,
        409,
        "CONFLICT",
        "A week with this number already exists in this season",
      );
      return true;
    }
    sendJson(response, 201, database.weeks.create(input));
    return true;
  }

  if (!match) {
    return false;
  }

  const id = Number(match[1]);
  if (request.method === "GET") {
    const week = database.weeks.get(id);
    if (!week) {
      sendError(response, 404, "NOT_FOUND", "Week not found");
      return true;
    }
    sendJson(response, 200, week);
    return true;
  }

  if (request.method === "PATCH") {
    if (!auth.isAdmin) {
      sendError(response, 403, "FORBIDDEN", "Administrator access required");
      return true;
    }
    const current = database.weeks.get(id);
    if (!current) {
      sendError(response, 404, "NOT_FOUND", "Week not found");
      return true;
    }
    const patch = parsePatchInput(await readJson(request));
    if (!patch) {
      sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "Number, theme, and prediction_deadline must be valid if provided",
      );
      return true;
    }
    const merged = mergePatch(current, patch);
    const existing = database.weeks.getByNumber(
      current.season_id,
      merged.number,
    );
    if (existing && existing.id !== id) {
      sendError(
        response,
        409,
        "CONFLICT",
        "A week with this number already exists in this season",
      );
      return true;
    }
    sendJson(response, 200, database.weeks.update(id, merged));
    return true;
  }

  if (request.method === "DELETE") {
    if (!auth.isAdmin) {
      sendError(response, 403, "FORBIDDEN", "Administrator access required");
      return true;
    }
    if (!database.weeks.get(id)) {
      sendError(response, 404, "NOT_FOUND", "Week not found");
      return true;
    }
    if (database.results.getByWeek(id)) {
      sendError(
        response,
        409,
        "CONFLICT",
        "Week is referenced by an official result",
      );
      return true;
    }
    database.weeks.delete(id);
    response.writeHead(204);
    response.end();
    return true;
  }

  return false;
}
