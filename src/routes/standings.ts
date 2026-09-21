import type { IncomingMessage, ServerResponse } from "node:http";

import type { AuthContext } from "../auth/context";
import type { AppDatabase } from "../database";
import { isLeagueMember } from "../domain/league-membership";
import { rankEntries } from "../domain/standings";
import { sendError } from "../http/errors";
import { sendJson } from "../http/json";
import {
  buildListResponse,
  parsePagination,
  type Pagination,
} from "../http/pagination";

interface StandingEntry {
  user_id: number;
  star_baker_points: number;
  technical_winner_points: number;
  eliminated_points: number;
  weekly_special_points: number;
  total_points: number;
  correct_predictions: number;
}

const ZERO_TOTALS = {
  star_baker_points: 0,
  technical_winner_points: 0,
  eliminated_points: 0,
  weekly_special_points: 0,
  total_points: 0,
  correct_predictions: 0,
};

function paginateRanked<T extends { user_id: number }>(
  ranked: T[],
  pagination: Pagination,
): { items: T[]; nextCursor: number | null } {
  let startIndex = 0;
  if (pagination.cursor !== 0) {
    const cursorIndex = ranked.findIndex(
      (entry) => entry.user_id === pagination.cursor,
    );
    startIndex = cursorIndex === -1 ? 0 : cursorIndex + 1;
  }
  const items = ranked.slice(startIndex, startIndex + pagination.limit);
  const hasMore = startIndex + pagination.limit < ranked.length;
  const nextCursor = hasMore ? items[items.length - 1].user_id : null;
  return { items, nextCursor };
}

export async function handleStandingsRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  database: AppDatabase,
  auth: AuthContext | undefined,
): Promise<boolean> {
  const standingsMatch = url.pathname.match(/^\/leagues\/(\d+)\/standings$/);
  const weekScoresMatch = url.pathname.match(
    /^\/leagues\/(\d+)\/weeks\/(\d+)\/scores$/,
  );
  if (!standingsMatch && !weekScoresMatch) {
    return false;
  }
  if (!auth) {
    sendError(response, 401, "UNAUTHENTICATED", "Authentication required");
    return true;
  }

  const leagueId = Number((standingsMatch ?? weekScoresMatch)![1]);
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
      "Only league members may view standings",
    );
    return true;
  }

  if (standingsMatch) {
    if (request.method !== "GET") {
      return false;
    }
    const pagination = parsePagination(url);
    if (!pagination) {
      sendError(response, 400, "VALIDATION_ERROR", "Invalid limit or cursor");
      return true;
    }
    const members = database.leaguePlayers.listAll(leagueId);
    const totalsByUser = new Map(
      database.scores.sumByUser(leagueId).map((row) => [row.user_id, row]),
    );
    const entries: StandingEntry[] = members.map((member) => ({
      user_id: member.user_id,
      ...(totalsByUser.get(member.user_id) ?? ZERO_TOTALS),
    }));
    const ranked = rankEntries(entries);
    const { items, nextCursor } = paginateRanked(ranked, pagination);
    sendJson(
      response,
      200,
      buildListResponse({ items, nextCursor }, pagination.limit),
    );
    return true;
  }

  if (request.method !== "GET") {
    return false;
  }
  const weekId = Number(weekScoresMatch![2]);
  if (!database.weeks.get(weekId)) {
    sendError(response, 404, "NOT_FOUND", "Week not found");
    return true;
  }
  const pagination = parsePagination(url);
  if (!pagination) {
    sendError(response, 400, "VALIDATION_ERROR", "Invalid limit or cursor");
    return true;
  }
  const members = database.leaguePlayers.listAll(leagueId);
  const scoresByUser = new Map(
    database.scores
      .listForWeek(leagueId, weekId)
      .map((score) => [score.user_id, score]),
  );
  const entries: StandingEntry[] = members.map((member) => {
    const score = scoresByUser.get(member.user_id);
    return {
      user_id: member.user_id,
      ...(score
        ? {
            star_baker_points: score.star_baker_points,
            technical_winner_points: score.technical_winner_points,
            eliminated_points: score.eliminated_points,
            weekly_special_points: score.weekly_special_points,
            total_points: score.total_points,
            correct_predictions: score.correct_predictions,
          }
        : ZERO_TOTALS),
    };
  });
  const ranked = rankEntries(entries);
  const { items, nextCursor } = paginateRanked(ranked, pagination);
  sendJson(
    response,
    200,
    buildListResponse({ items, nextCursor }, pagination.limit),
  );
  return true;
}
