import type { IncomingMessage, ServerResponse } from "node:http";

import type { AuthContext } from "../auth/context";
import type { AppDatabase } from "../database";
import { isLeagueMember } from "../domain/league-membership";
import { sendError } from "../http/errors";
import type { ErrorCode } from "../http/errors";
import { readJson, sendJson } from "../http/json";
import {
  buildListResponse,
  INVALID_ID_FILTER,
  paginate,
  parseOptionalId,
  parsePagination,
} from "../http/pagination";
import type { League } from "../types/league";
import type { Week } from "../types/week";

const pickFields = [
  "star_baker",
  "technical_winner",
  "eliminated",
  "weekly_special",
] as const;

interface Picks {
  star_baker: number;
  technical_winner: number;
  eliminated: number;
  weekly_special: number;
}

function parsePicks(body: Record<string, unknown>): Picks | undefined {
  const result = {} as Picks;
  for (const field of pickFields) {
    const value = body[field];
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
      return undefined;
    }
    result[field] = value;
  }
  return result;
}

function parsePartialPicks(
  body: Record<string, unknown>,
): Partial<Picks> | undefined {
  const result: Partial<Picks> = {};
  for (const field of pickFields) {
    const value = body[field];
    if (value === undefined) {
      continue;
    }
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
      return undefined;
    }
    result[field] = value;
  }
  return result;
}

interface ValidationError {
  status: number;
  code: ErrorCode;
  message: string;
}

function validateWeekForLeague(
  database: AppDatabase,
  league: League,
  weekId: number,
): { week: Week } | { error: ValidationError } {
  const week = database.weeks.get(weekId);
  if (!week) {
    return {
      error: { status: 404, code: "NOT_FOUND", message: "Week not found" },
    };
  }
  if (week.season_id !== league.season_id) {
    return {
      error: {
        status: 400,
        code: "VALIDATION_ERROR",
        message: "Week does not belong to this league's season",
      },
    };
  }
  return { week };
}

/** Picks lock at the deadline, or as soon as the week's result is published. */
function isLocked(database: AppDatabase, week: Week): boolean {
  return (
    Date.now() >= week.prediction_deadline.getTime() ||
    database.results.getByWeek(week.id) !== undefined
  );
}

function validatePicks(
  database: AppDatabase,
  picks: Picks,
  weekSeasonId: number,
): ValidationError | undefined {
  for (const field of pickFields) {
    const contestant = database.contestants.get(picks[field]);
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
    if (contestant.eliminated) {
      return {
        status: 409,
        code: "CONFLICT",
        message: `Contestant for ${field} is already eliminated`,
      };
    }
  }
  return undefined;
}

/**
 * A user's own prediction for a week, independent of any league — matches
 * the data model, where a prediction belongs to (user_id, week_id) and is
 * merely *shared* by whichever leagues that user later belongs to.
 */
async function handleOwnPredictionRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  database: AppDatabase,
  auth: AuthContext,
): Promise<boolean> {
  if (request.method === "POST" && url.pathname === "/predictions") {
    const body = await readJson(request);
    if (typeof body !== "object" || body === null) {
      sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "week_id and all four picks are required",
      );
      return true;
    }
    const record = body as Record<string, unknown>;
    const weekId = record.week_id;
    const picks = parsePicks(record);
    if (
      typeof weekId !== "number" ||
      !Number.isSafeInteger(weekId) ||
      weekId < 1 ||
      !picks
    ) {
      sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "week_id and all four picks are required",
      );
      return true;
    }
    const week = database.weeks.get(weekId);
    if (!week) {
      sendError(response, 404, "NOT_FOUND", "Week not found");
      return true;
    }
    if (isLocked(database, week)) {
      sendError(
        response,
        409,
        "PREDICTION_LOCKED",
        "Predictions for this week are locked",
      );
      return true;
    }
    const pickError = validatePicks(database, picks, week.season_id);
    if (pickError) {
      sendError(response, pickError.status, pickError.code, pickError.message);
      return true;
    }
    if (database.predictions.getByUserWeek(auth.user.id, weekId)) {
      sendError(
        response,
        409,
        "CONFLICT",
        "You already have a prediction for this week",
      );
      return true;
    }
    const created = database.predictions.create({
      user_id: auth.user.id,
      week_id: weekId,
      ...picks,
    });
    sendJson(response, 201, created);
    return true;
  }

  const match = url.pathname.match(/^\/weeks\/(\d+)\/prediction$/);
  if (!match) {
    return false;
  }
  const weekId = Number(match[1]);

  if (request.method === "GET") {
    const prediction = database.predictions.getByUserWeek(
      auth.user.id,
      weekId,
    );
    if (!prediction) {
      sendError(response, 404, "NOT_FOUND", "Prediction not found");
      return true;
    }
    sendJson(response, 200, prediction);
    return true;
  }

  if (request.method === "PATCH") {
    const current = database.predictions.getByUserWeek(auth.user.id, weekId);
    if (!current) {
      sendError(response, 404, "NOT_FOUND", "Prediction not found");
      return true;
    }
    const week = database.weeks.get(weekId)!;
    if (isLocked(database, week)) {
      sendError(
        response,
        409,
        "PREDICTION_LOCKED",
        "Predictions for this week are locked",
      );
      return true;
    }
    const body = await readJson(request);
    if (typeof body !== "object" || body === null) {
      sendError(response, 400, "VALIDATION_ERROR", "Picks must be valid");
      return true;
    }
    const patch = parsePartialPicks(body as Record<string, unknown>);
    if (!patch) {
      sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "Picks must be valid if provided",
      );
      return true;
    }
    const merged: Picks = {
      star_baker: patch.star_baker ?? current.star_baker,
      technical_winner: patch.technical_winner ?? current.technical_winner,
      eliminated: patch.eliminated ?? current.eliminated,
      weekly_special: patch.weekly_special ?? current.weekly_special,
    };
    const pickError = validatePicks(database, merged, week.season_id);
    if (pickError) {
      sendError(response, pickError.status, pickError.code, pickError.message);
      return true;
    }
    sendJson(response, 200, database.predictions.update(current.id, merged));
    return true;
  }

  return false;
}

export async function handlePredictionRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  database: AppDatabase,
  auth: AuthContext | undefined,
): Promise<boolean> {
  const collectionMatch = url.pathname.match(
    /^\/leagues\/(\d+)\/predictions$/,
  );
  const singleMatch = url.pathname.match(
    /^\/leagues\/(\d+)\/weeks\/(\d+)\/prediction$/,
  );
  const isOwnPredictionRoute =
    (request.method === "POST" && url.pathname === "/predictions") ||
    /^\/weeks\/(\d+)\/prediction$/.test(url.pathname);
  if (!collectionMatch && !singleMatch && !isOwnPredictionRoute) {
    return false;
  }
  if (!auth) {
    sendError(response, 401, "UNAUTHENTICATED", "Authentication required");
    return true;
  }
  if (isOwnPredictionRoute) {
    return handleOwnPredictionRoutes(request, response, url, database, auth);
  }

  const leagueId = Number((collectionMatch ?? singleMatch)![1]);
  const league = database.leagues.get(leagueId);
  if (!league) {
    sendError(response, 404, "NOT_FOUND", "League not found");
    return true;
  }
  if (!auth.isAdmin && !isLeagueMember(database, league, auth.user.id)) {
    sendError(
      response,
      403,
      "FORBIDDEN",
      "Only league members may view this league's predictions",
    );
    return true;
  }

  if (collectionMatch) {
    if (request.method === "GET") {
      const pagination = parsePagination(url);
      const weekIdFilter = parseOptionalId(url, "week_id");
      if (!pagination || weekIdFilter === INVALID_ID_FILTER) {
        sendError(
          response,
          400,
          "VALIDATION_ERROR",
          "Invalid limit, cursor, or week_id",
        );
        return true;
      }
      const memberIds = database.leaguePlayers
        .listAll(leagueId)
        .map((member) => member.user_id);
      const rows = database.predictions.listForUsers(
        memberIds,
        pagination,
        weekIdFilter,
        auth.isAdmin
          ? undefined
          : { userId: auth.user.id, now: new Date().toISOString() },
      );
      sendJson(
        response,
        200,
        buildListResponse(paginate(rows, pagination.limit), pagination.limit),
      );
      return true;
    }

    if (request.method === "POST") {
      if (league.archived_at) {
        sendError(response, 409, "CONFLICT", "League is archived");
        return true;
      }
      const body = await readJson(request);
      if (typeof body !== "object" || body === null) {
        sendError(
          response,
          400,
          "VALIDATION_ERROR",
          "week_id and all four picks are required",
        );
        return true;
      }
      const record = body as Record<string, unknown>;
      const weekId = record.week_id;
      const picks = parsePicks(record);
      if (
        typeof weekId !== "number" ||
        !Number.isSafeInteger(weekId) ||
        weekId < 1 ||
        !picks
      ) {
        sendError(
          response,
          400,
          "VALIDATION_ERROR",
          "week_id and all four picks are required",
        );
        return true;
      }
      const weekResult = validateWeekForLeague(database, league, weekId);
      if ("error" in weekResult) {
        sendError(
          response,
          weekResult.error.status,
          weekResult.error.code,
          weekResult.error.message,
        );
        return true;
      }
      if (isLocked(database, weekResult.week)) {
        sendError(
          response,
          409,
          "PREDICTION_LOCKED",
          "Predictions for this week are locked",
        );
        return true;
      }
      const pickError = validatePicks(
        database,
        picks,
        weekResult.week.season_id,
      );
      if (pickError) {
        sendError(response, pickError.status, pickError.code, pickError.message);
        return true;
      }
      if (database.predictions.getByUserWeek(auth.user.id, weekId)) {
        sendError(
          response,
          409,
          "CONFLICT",
          "You already have a prediction for this week",
        );
        return true;
      }
      const created = database.predictions.create({
        user_id: auth.user.id,
        week_id: weekId,
        ...picks,
      });
      sendJson(response, 201, created);
      return true;
    }

    return false;
  }

  const weekId = Number(singleMatch![2]);

  if (request.method === "GET") {
    const prediction = database.predictions.getByUserWeek(
      auth.user.id,
      weekId,
    );
    if (!prediction) {
      sendError(response, 404, "NOT_FOUND", "Prediction not found");
      return true;
    }
    sendJson(response, 200, prediction);
    return true;
  }

  if (request.method === "PATCH") {
    if (league.archived_at) {
      sendError(response, 409, "CONFLICT", "League is archived");
      return true;
    }
    const current = database.predictions.getByUserWeek(
      auth.user.id,
      weekId,
    );
    if (!current) {
      sendError(response, 404, "NOT_FOUND", "Prediction not found");
      return true;
    }
    const week = database.weeks.get(weekId)!;
    if (isLocked(database, week)) {
      sendError(
        response,
        409,
        "PREDICTION_LOCKED",
        "Predictions for this week are locked",
      );
      return true;
    }
    const body = await readJson(request);
    if (typeof body !== "object" || body === null) {
      sendError(response, 400, "VALIDATION_ERROR", "Picks must be valid");
      return true;
    }
    const patch = parsePartialPicks(body as Record<string, unknown>);
    if (!patch) {
      sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "Picks must be valid if provided",
      );
      return true;
    }
    const merged: Picks = {
      star_baker: patch.star_baker ?? current.star_baker,
      technical_winner: patch.technical_winner ?? current.technical_winner,
      eliminated: patch.eliminated ?? current.eliminated,
      weekly_special: patch.weekly_special ?? current.weekly_special,
    };
    const pickError = validatePicks(database, merged, week.season_id);
    if (pickError) {
      sendError(response, pickError.status, pickError.code, pickError.message);
      return true;
    }
    sendJson(response, 200, database.predictions.update(current.id, merged));
    return true;
  }

  return false;
}
