import type { ServerResponse } from "node:http";

import { sendJson } from "./json";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INVALID_JSON"
  | "INTERNAL_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "PREDICTION_LOCKED"
  | "RATE_LIMITED"
  | "PAYLOAD_TOO_LARGE";

export function sendError(
  response: ServerResponse,
  statusCode: number,
  code: ErrorCode,
  message: string,
  details: Record<string, unknown> = {},
): void {
  sendJson(response, statusCode, { error: { code, message, details } });
}
