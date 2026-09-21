import { createResendDeliverer } from "./email/resend";
import { DEFAULT_RATE_LIMITS } from "./http/rate-limit";
import type { ServerOptions } from "./server";

/**
 * Builds server options from environment variables. In production it refuses
 * to start without email, CORS, and the other settings that make login safe,
 * rather than falling back to dev behavior such as printing codes to the log.
 */
export function configFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): ServerOptions & { port: number } {
  const production = env.NODE_ENV === "production";
  const corsOrigins = (env.CORS_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter((origin) => origin !== "");

  const missing: string[] = [];
  if (production && !env.RESEND_API_KEY) missing.push("RESEND_API_KEY");
  if (env.RESEND_API_KEY && !env.EMAIL_FROM) missing.push("EMAIL_FROM");
  if (production && corsOrigins.length === 0) missing.push("CORS_ORIGIN");
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}`,
    );
  }

  return {
    port: Number(env.PORT) || 3000,
    corsOrigins: corsOrigins.length > 0 ? corsOrigins : undefined,
    deliverLoginCode: env.RESEND_API_KEY
      ? createResendDeliverer({
          apiKey: env.RESEND_API_KEY,
          from: env.EMAIL_FROM!,
        })
      : undefined,
    rateLimits: DEFAULT_RATE_LIMITS,
    trustProxy: env.TRUST_PROXY === "true",
    logger: console.log,
  };
}
