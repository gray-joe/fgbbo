import { rmSync } from "node:fs";

import { createServer } from "../../src/server";
import { seedDevData } from "../seed/dev-seed";
import { ADMIN_EMAIL, API_PORT, TMP_DIR, WEB_URL } from "./env";
import { deliver } from "./mailbox";

/**
 * Runs once before all tests. Starts the real API on an in-memory database
 * (login codes go to the mailbox instead of the console, and CORS is
 * limited to the web app's origin), seeds the dev data
 * set, and returns the teardown that stops the API.
 */
export default async function globalSetup() {
  rmSync(TMP_DIR, { recursive: true, force: true });
  const server = createServer({
    databasePath: ":memory:",
    adminEmails: [ADMIN_EMAIL],
    deliverLoginCode: deliver,
    // As in production: only the web app's origin may call the API from a browser.
    corsOrigins: [WEB_URL],
  });
  await new Promise<void>((resolve) => server.listen(API_PORT, "127.0.0.1", resolve));

  await seedDevData();

  return () =>
    new Promise<void>((resolve) => {
      server.close(() => resolve());
      server.closeAllConnections();
    });
}
