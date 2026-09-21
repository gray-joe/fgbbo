import type { IncomingMessage, ServerResponse } from "node:http";

import type { AuthContext } from "../auth/context";
import type { AppDatabase } from "../database";
import { sendError } from "../http/errors";
import type { ErrorCode } from "../http/errors";
import { readJson, sendJson } from "../http/json";
import { buildListResponse, paginate, parsePagination } from "../http/pagination";
import type { CreateResultInput, Result } from "../types/result";

const contestantFields = [
  "star_baker",
  "technical_winner",
  "eliminated",
  "weekly_special",
] as const;

function parseCreateInput(body: unknown): CreateResultInput | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }

  const input = body as Record<string, unknown>;
  const fields = ["week", ...contestantFields] as const;
  if (
    fields.some(
      (field) =>
        typeof input[field] !== "number" ||
        !Number.isSafeInteger(input[field]) ||
        (input[field] as number) < 1,
    )
  ) {
    return undefined;
  }

  return {
    week: input.week as number,
    star_baker: input.star_baker as number,
    technical_winner: input.technical_winner as number,
    eliminated: input.eliminated as number,
    weekly_special: input.weekly_special as number,
  };
}

type ResultPatchInput = Partial<CreateResultInput>;

function parsePatchInput(body: unknown): ResultPatchInput | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined;
  }

  const input = body as Record<string, unknown>;
  const fields = ["week", ...contestantFields] as const;
  const patch: ResultPatchInput = {};
  for (const field of fields) {
    if (input[field] === undefined) {
      continue;
    }
    if (
      typeof input[field] !== "number" ||
      !Number.isSafeInteger(input[field]) ||
      (input[field] as number) < 1
    ) {
      return undefined;
    }
    patch[field] = input[field] as number;
  }

  return patch;
}

function mergePatch(
  current: Result,
  patch: ResultPatchInput,
): CreateResultInput {
  return {
    week: patch.week ?? current.week,
    star_baker: patch.star_baker ?? current.star_baker,
    technical_winner: patch.technical_winner ?? current.technical_winner,
    eliminated: patch.eliminated ?? current.eliminated,
    weekly_special: patch.weekly_special ?? current.weekly_special,
  };
}

interface ReferenceError {
  status: number;
  code: ErrorCode;
  message: string;
}

function validateWeekReference(
  input: CreateResultInput,
  database: AppDatabase,
): ReferenceError | undefined {
  if (!database.weeks.get(input.week)) {
    return { status: 404, code: "NOT_FOUND", message: "Week not found" };
  }

  return undefined;
}

function validateContestantReferences(
  input: CreateResultInput,
  database: AppDatabase,
  weekSeasonId: number,
  allowEliminatedContestantId?: number,
): ReferenceError | undefined {
  for (const field of contestantFields) {
    const contestant = database.contestants.get(input[field]);
    if (!contestant) {
      return {
        status: 404,
        code: "NOT_FOUND",
        message: `Contestant for ${field} not found`,
      };
    }
    if (contestant.season_id !== weekSeasonId) {
      return {
        status: 400,
        code: "VALIDATION_ERROR",
        message: `Contestant for ${field} belongs to a different season`,
      };
    }
    if (
      contestant.eliminated &&
      contestant.id !== allowEliminatedContestantId
    ) {
      return {
        status: 409,
        code: "CONFLICT",
        message: `Contestant for ${field} is already eliminated`,
      };
    }
  }

  return undefined;
}

export async function handleResultRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  database: AppDatabase,
  auth: AuthContext | undefined,
): Promise<boolean> {
  const isCollection = url.pathname === "/results";
  const match = url.pathname.match(/^\/results\/(\d+)$/);
  if (!isCollection && !match) {
    return false;
  }
  if (!auth) {
    sendError(response, 401, "UNAUTHENTICATED", "Authentication required");
    return true;
  }

  if (request.method === "GET" && url.pathname === "/results") {
    const pagination = parsePagination(url);
    if (!pagination) {
      sendError(response, 400, "VALIDATION_ERROR", "Invalid limit or cursor");
      return true;
    }
    const rows = database.results.list(pagination);
    sendJson(
      response,
      200,
      buildListResponse(paginate(rows, pagination.limit), pagination.limit),
    );
    return true;
  }

  if (request.method === "POST" && url.pathname === "/results") {
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
        "Valid week and contestant IDs are required",
      );
      return true;
    }
    const weekError = validateWeekReference(input, database);
    if (weekError) {
      sendError(response, weekError.status, weekError.code, weekError.message);
      return true;
    }
    if (database.results.getByWeek(input.week)) {
      sendError(
        response,
        409,
        "CONFLICT",
        "A result already exists for this week",
      );
      return true;
    }
    const contestantError = validateContestantReferences(
      input,
      database,
      database.weeks.get(input.week)!.season_id,
    );
    if (contestantError) {
      sendError(
        response,
        contestantError.status,
        contestantError.code,
        contestantError.message,
      );
      return true;
    }
    sendJson(response, 201, database.results.create(input));
    return true;
  }

  if (!match) {
    return false;
  }

  const id = Number(match[1]);
  if (request.method === "GET") {
    const result = database.results.get(id);
    if (!result) {
      sendError(response, 404, "NOT_FOUND", "Result not found");
      return true;
    }
    sendJson(response, 200, result);
    return true;
  }

  if (request.method === "PATCH") {
    if (!auth.isAdmin) {
      sendError(response, 403, "FORBIDDEN", "Administrator access required");
      return true;
    }
    const previous = database.results.get(id);
    if (!previous) {
      sendError(response, 404, "NOT_FOUND", "Result not found");
      return true;
    }
    const patch = parsePatchInput(await readJson(request));
    if (!patch) {
      sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "Week and contestant IDs must be valid if provided",
      );
      return true;
    }
    const input = mergePatch(previous, patch);
    const weekError = validateWeekReference(input, database);
    if (weekError) {
      sendError(response, weekError.status, weekError.code, weekError.message);
      return true;
    }
    const existing = database.results.getByWeek(input.week);
    if (existing && existing.id !== id) {
      sendError(
        response,
        409,
        "CONFLICT",
        "A result already exists for this week",
      );
      return true;
    }
    const contestantError = validateContestantReferences(
      input,
      database,
      database.weeks.get(input.week)!.season_id,
      previous.eliminated,
    );
    if (contestantError) {
      sendError(
        response,
        contestantError.status,
        contestantError.code,
        contestantError.message,
      );
      return true;
    }
    sendJson(response, 200, database.results.update(id, input));
    return true;
  }

  if (request.method === "DELETE") {
    if (!auth.isAdmin) {
      sendError(response, 403, "FORBIDDEN", "Administrator access required");
      return true;
    }
    if (!database.results.delete(id)) {
      sendError(response, 404, "NOT_FOUND", "Result not found");
      return true;
    }
    response.writeHead(204);
    response.end();
    return true;
  }

  return false;
}
