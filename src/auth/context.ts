import type { User } from "../types/user";

export interface AuthContext {
  user: User;
  isAdmin: boolean;
}

export function isAdminEmail(email: string, adminEmails: string[]): boolean {
  return adminEmails.includes(email.trim().toLowerCase());
}
