import { randomInt } from "node:crypto";

export function generateOtac(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}
