import { readFileSync } from "node:fs";
import { join } from "node:path";

import { TMP_DIR } from "../support/env";

export type SeedUserKey = "admin" | "alice" | "bob" | "cara" | "dan";

export interface SeedManifest {
  users: Record<SeedUserKey, { id: number; name: string; email: string }>;
  season: { id: number; name: string };
  bakers: Record<string, number>;
  /** Weeks by number: 1 aired, 2 and 3 open, 4 locked by deadline with no result. */
  weeks: Record<number, { id: number; number: number; theme: string }>;
  league: { id: number; name: string; inviteCode: string };
}

export const MANIFEST_PATH = join(TMP_DIR, "seed.json");

export const loadSeed = (): SeedManifest => JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
