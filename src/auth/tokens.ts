import { randomBytes } from "node:crypto";

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function generateInviteCode(): string {
  return randomBytes(6).toString("hex");
}
