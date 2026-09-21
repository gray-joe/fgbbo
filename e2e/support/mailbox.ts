import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { TMP_DIR } from "./env";

// Stands in for email delivery. The API server runs in the runner process and
// tests run in workers, so login codes are handed over as files.
const DIR = join(TMP_DIR, "mailbox");

const fileFor = (email: string) => join(DIR, encodeURIComponent(email));

export function deliver(email: string, code: string): void {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(fileFor(email), code);
}

/** Returns the pending code for an email and removes it. Throws if none was sent. */
export function takeCode(email: string): string {
  const code = readFileSync(fileFor(email), "utf8");
  rmSync(fileFor(email));
  return code;
}

export function hasCode(email: string): boolean {
  try {
    readFileSync(fileFor(email));
    return true;
  } catch {
    return false;
  }
}
