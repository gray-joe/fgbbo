import type { IncomingMessage } from "node:http";

import type { AppDatabase } from "../database";
import { isAdminEmail, type AuthContext } from "./context";

export function authenticate(
  request: IncomingMessage,
  database: AppDatabase,
  adminEmails: string[],
): AuthContext | undefined {
  const header = request.headers.authorization ?? "";
  if (!header.startsWith("Bearer ")) {
    return undefined;
  }
  const token = header.slice(7);
  const userId = database.sessions.getUserIdByToken(token);
  if (!userId) {
    return undefined;
  }
  const user = database.users.get(userId);
  if (!user || !user.active) {
    return undefined;
  }
  return { user, isAdmin: isAdminEmail(user.email, adminEmails) };
}
