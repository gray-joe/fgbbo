import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

import { hashPassword, verifyPassword } from "../auth/passwords";

const CODE_TTL_MS = 10 * 60 * 1000;
// A code is burned after this many wrong guesses, so a 6-digit code can't be brute-forced.
const MAX_ATTEMPTS = 5;

// Stand-in hash so an email with no pending code takes as long to check as a real one.
const DUMMY_CODE_HASH = hashPassword(randomUUID());

interface LoginCodeRow {
  code_hash: string;
  expires_at: string;
  attempts: number;
}

export class LoginCodeRepository {
  constructor(private readonly database: DatabaseSync) {}

  create(email: string, code: string): void {
    const now = new Date();
    this.database
      .prepare("DELETE FROM login_codes WHERE expires_at < ?")
      .run(now.toISOString());
    const expiresAt = new Date(now.getTime() + CODE_TTL_MS).toISOString();
    this.database
      .prepare(
        `INSERT INTO login_codes (email, code_hash, expires_at) VALUES (?, ?, ?)
         ON CONFLICT(email) DO UPDATE SET
           code_hash = excluded.code_hash,
           expires_at = excluded.expires_at,
           attempts = 0`,
      )
      .run(email, hashPassword(code), expiresAt);
  }

  // Single-use: valid codes are deleted on successful consumption.
  consume(email: string, code: string): boolean {
    const row = this.database
      .prepare(
        "SELECT code_hash, expires_at, attempts FROM login_codes WHERE email = ?",
      )
      .get(email) as unknown as LoginCodeRow | undefined;

    const codeMatches = verifyPassword(code, row?.code_hash ?? DUMMY_CODE_HASH);
    const notExpired = row !== undefined && new Date(row.expires_at) > new Date();

    if (!row || !notExpired) {
      return false;
    }
    if (!codeMatches) {
      if (row.attempts + 1 >= MAX_ATTEMPTS) {
        this.database.prepare("DELETE FROM login_codes WHERE email = ?").run(email);
      } else {
        this.database
          .prepare("UPDATE login_codes SET attempts = attempts + 1 WHERE email = ?")
          .run(email);
      }
      return false;
    }
    this.database.prepare("DELETE FROM login_codes WHERE email = ?").run(email);
    return true;
  }
}
