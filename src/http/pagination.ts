export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

export interface Pagination {
  limit: number;
  cursor: number;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: number | null;
}

export function parsePagination(url: URL): Pagination | undefined {
  const limitParam = url.searchParams.get("limit");
  const cursorParam = url.searchParams.get("cursor");

  let limit = DEFAULT_PAGE_LIMIT;
  if (limitParam !== null) {
    limit = Number(limitParam);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_PAGE_LIMIT) {
      return undefined;
    }
  }

  let cursor = 0;
  if (cursorParam !== null) {
    cursor = Number(cursorParam);
    if (!Number.isSafeInteger(cursor) || cursor < 0) {
      return undefined;
    }
  }

  return { limit, cursor };
}

export const INVALID_ID_FILTER = Symbol("invalid-id-filter");

export function parseOptionalId(
  url: URL,
  param: string,
): number | undefined | typeof INVALID_ID_FILTER {
  const raw = url.searchParams.get(param);
  if (raw === null) {
    return undefined;
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    return INVALID_ID_FILTER;
  }
  return value;
}

export function paginateBy<T>(
  rows: T[],
  limit: number,
  keyOf: (item: T) => number,
): PaginatedResult<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? keyOf(items[items.length - 1]) : null;
  return { items, nextCursor };
}

export function paginate<T extends { id: number }>(
  rows: T[],
  limit: number,
): PaginatedResult<T> {
  return paginateBy(rows, limit, (item) => item.id);
}

export function buildListResponse<T>(
  result: PaginatedResult<T>,
  limit: number,
): { data: T[]; pagination: { next_cursor: number | null; limit: number } } {
  return {
    data: result.items,
    pagination: { next_cursor: result.nextCursor, limit },
  };
}
