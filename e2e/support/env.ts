import { join } from "node:path";

export const API_PORT = 3100;
export const WEB_PORT = 5273;
export const API_URL = `http://127.0.0.1:${API_PORT}`;
export const WEB_URL = `http://127.0.0.1:${WEB_PORT}`;
export const ADMIN_EMAIL = "admin@e2e.test";

// Scratch files shared between the runner (global setup) and test workers.
export const TMP_DIR = join(__dirname, "..", ".tmp");
