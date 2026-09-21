const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

let token: string | null = localStorage.getItem("token");

export function setToken(next: string | null) {
  token = next;
  if (next) localStorage.setItem("token", next);
  else localStorage.removeItem("token");
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  // Several requests can be in flight at once; each remembers whether it was signed in.
  const sentToken = token;
  if (sentToken) headers["Authorization"] = `Bearer ${sentToken}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // The server no longer accepts our token (expired, or signed out elsewhere):
  // drop it and go back to the login screen.
  if (res.status === 401 && sentToken) {
    setToken(null);
    localStorage.removeItem("user");
    window.location.reload();
    // The page is reloading; don't let callers see an error meanwhile.
    return new Promise<T>(() => {});
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => undefined);
  if (!res.ok) {
    const err = data?.error ?? {};
    throw new ApiError(
      res.status,
      err.code ?? "UNKNOWN",
      err.message ?? "Request failed",
    );
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  del: (path: string) => request<void>("DELETE", path),
};

// --- domain types (mirrors src/types on the API) ---

export interface User {
  id: number;
  email: string;
  name: string;
  active: boolean;
}

export interface Season {
  id: number;
  name: string;
  active: boolean;
}

export interface League {
  id: number;
  name: string;
  season_id: number;
  owner: number;
  invite_code: string | null;
  archived_at: string | null;
}

export interface Contestant {
  id: number;
  season_id: number;
  name: string;
  eliminated: boolean;
}

export interface Week {
  id: number;
  season_id: number;
  number: number;
  theme: string;
  prediction_deadline: string;
}

export interface Result {
  id: number;
  week: number;
  star_baker: number;
  technical_winner: number;
  eliminated: number;
  weekly_special: number;
}

export interface Prediction {
  id: number;
  league_id: number;
  user_id: number;
  week_id: number;
  star_baker: number;
  technical_winner: number;
  eliminated: number;
  weekly_special: number;
}

export interface StandingEntry {
  user_id: number;
  star_baker_points: number;
  technical_winner_points: number;
  eliminated_points: number;
  weekly_special_points: number;
  total_points: number;
  correct_predictions: number;
  rank: number;
}

export interface AuditEntry {
  id: number;
  at: string;
  actor_id: number;
  actor_email: string;
  method: string;
  path: string;
  action: string;
  entity: string;
  entity_id: number | null;
  status: number;
  body?: Record<string, unknown>;
}

export interface ResultPicks {
  star_baker: number;
  technical_winner: number;
  eliminated: number;
  weekly_special: number;
}

interface ListResponse<T> {
  data: T[];
  pagination: { next_cursor: number | null; limit: number };
}

async function listAll<T>(path: string, param = ""): Promise<T[]> {
  const items: T[] = [];
  let cursor: number | null = 0;
  do {
    const sep = path.includes("?") ? "&" : "?";
    const page: ListResponse<T> = await api.get<ListResponse<T>>(
      `${path}${sep}limit=100${cursor ? `&cursor=${cursor}` : ""}${param}`,
    );
    items.push(...page.data);
    cursor = page.pagination.next_cursor;
  } while (cursor !== null);
  return items;
}

export const endpoints = {
  requestLoginCode: (email: string) =>
    api.post<{ message: string }>("/auth/login", { email }),
  verifyLoginCode: (email: string, code: string) =>
    api.post<{ token: string; user: User }>("/auth/login/verify", {
      email,
      code,
    }),
  logout: () => api.del("/auth/logout"),
  me: () => api.get<{ user: User; is_admin: boolean }>("/auth/me"),
  signup: (name: string, email: string) =>
    api.post<User>("/users", { name, email }),
  myLeagues: () => listAll<League>("/leagues"),
  joinLeague: (invite_code: string) =>
    api.post<League>("/leagues/join", { invite_code }),
  createLeague: (name: string, season_id: number) =>
    api.post<League>("/leagues", { name, season_id }),
  seasons: () => listAll<Season>("/seasons"),
  players: (leagueId: number) =>
    listAll<{ league_id: number; user_id: number }>(
      `/leagues/${leagueId}/players`,
    ),
  users: () => listAll<User>("/users"),
  contestants: (seasonId: number) =>
    listAll<Contestant>("/contestants", `&season_id=${seasonId}`),
  weeks: (seasonId: number) =>
    listAll<Week>("/weeks", `&season_id=${seasonId}`),
  results: () => listAll<Result>("/results"),
  standings: (leagueId: number) =>
    listAll<StandingEntry>(`/leagues/${leagueId}/standings`),
  getPrediction: (weekId: number) =>
    api.get<Prediction>(`/weeks/${weekId}/prediction`).catch((e) => {
      if (e instanceof ApiError && e.status === 404) return undefined;
      throw e;
    }),
  createPrediction: (input: {
    week_id: number;
    star_baker: number;
    technical_winner: number;
    eliminated: number;
    weekly_special: number;
  }) => api.post<Prediction>("/predictions", input),
  // --- admin ---
  createSeason: (input: { name: string; active: boolean }) =>
    api.post<Season>("/seasons", input),
  updateSeason: (id: number, patch: Partial<{ name: string; active: boolean }>) =>
    api.patch<Season>(`/seasons/${id}`, patch),
  createContestant: (input: { name: string; season_id: number }) =>
    api.post<Contestant>("/contestants", { ...input, eliminated: false }),
  updateContestant: (id: number, patch: { name: string }) =>
    api.patch<Contestant>(`/contestants/${id}`, patch),
  deleteContestant: (id: number) => api.del(`/contestants/${id}`),
  createWeek: (input: {
    number: number;
    theme: string;
    season_id: number;
    prediction_deadline: string;
  }) => api.post<Week>("/weeks", input),
  updateWeek: (
    id: number,
    patch: Partial<{ number: number; theme: string; prediction_deadline: string }>,
  ) => api.patch<Week>(`/weeks/${id}`, patch),
  deleteWeek: (id: number) => api.del(`/weeks/${id}`),
  publishResult: (input: { week: number } & ResultPicks) =>
    api.post<Result>("/results", input),
  updateResult: (id: number, patch: Partial<ResultPicks>) =>
    api.patch<Result>(`/results/${id}`, patch),
  deleteResult: (id: number) => api.del(`/results/${id}`),
  auditLog: (params: { cursor?: number; entity?: string }) =>
    api.get<ListResponse<AuditEntry>>(
      `/audit-log?limit=20${params.cursor ? `&cursor=${params.cursor}` : ""}${
        params.entity ? `&entity=${params.entity}` : ""
      }`,
    ),
  updatePrediction: (
    weekId: number,
    input: Partial<{
      star_baker: number;
      technical_winner: number;
      eliminated: number;
      weekly_special: number;
    }>,
  ) => api.patch<Prediction>(`/weeks/${weekId}/prediction`, input),
};
