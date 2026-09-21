import type { IncomingMessage, ServerResponse } from "node:http";

import { sendError } from "./errors";

export interface Rule {
  max: number;
  windowMs: number;
}

export interface RateLimitConfig {
  loginPerEmail: Rule;
  loginPerIp: Rule;
  verifyPerIp: Rule;
  signupPerIp: Rule;
}

const TEN_MINUTES = 10 * 60 * 1000;

export const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  loginPerEmail: { max: 5, windowMs: TEN_MINUTES },
  loginPerIp: { max: 20, windowMs: TEN_MINUTES },
  verifyPerIp: { max: 30, windowMs: TEN_MINUTES },
  signupPerIp: { max: 10, windowMs: 60 * TEN_MINUTES },
};

interface Counter {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window counters kept in memory. Fine for one instance; counts reset on
 * restart and aren't shared between instances.
 */
export class RateLimits {
  private readonly counters = new Map<string, Counter>();

  constructor(
    private readonly config: RateLimitConfig,
    private readonly trustProxy: boolean,
  ) {}

  /** Seconds to wait if this hit is over the limit, otherwise undefined. */
  private take(bucket: string, key: string, rule: Rule): number | undefined {
    const now = Date.now();
    if (this.counters.size > 10_000) {
      for (const [k, counter] of this.counters) {
        if (counter.resetAt <= now) this.counters.delete(k);
      }
    }
    const id = `${bucket}:${key}`;
    let counter = this.counters.get(id);
    if (!counter || counter.resetAt <= now) {
      counter = { count: 0, resetAt: now + rule.windowMs };
      this.counters.set(id, counter);
    }
    counter.count += 1;
    return counter.count > rule.max
      ? Math.max(1, Math.ceil((counter.resetAt - now) / 1000))
      : undefined;
  }

  /** With a trusted proxy, the last X-Forwarded-For entry is the one the proxy added. */
  private clientIp(request: IncomingMessage): string {
    if (this.trustProxy) {
      const forwarded = request.headers["x-forwarded-for"];
      const last = (Array.isArray(forwarded) ? forwarded.join(",") : forwarded)
        ?.split(",")
        .pop()
        ?.trim();
      if (last) return last;
    }
    return request.socket.remoteAddress ?? "unknown";
  }

  /** Per-IP limits for the unauthenticated routes. */
  forRequest(request: IncomingMessage, url: URL): number | undefined {
    if (request.method !== "POST") return undefined;
    const ip = this.clientIp(request);
    switch (url.pathname) {
      case "/auth/login":
        return this.take("login-ip", ip, this.config.loginPerIp);
      case "/auth/login/verify":
        return this.take("verify-ip", ip, this.config.verifyPerIp);
      case "/users":
        return this.take("signup-ip", ip, this.config.signupPerIp);
      default:
        return undefined;
    }
  }

  /** Applies to known and unknown emails alike, so it reveals nothing. */
  forLoginEmail(email: string): number | undefined {
    return this.take("login-email", email, this.config.loginPerEmail);
  }
}

export function sendRateLimited(
  response: ServerResponse,
  retryAfterSeconds: number,
): void {
  response.setHeader("Retry-After", String(retryAfterSeconds));
  sendError(response, 429, "RATE_LIMITED", "Too many requests, try again later", {
    retry_after_seconds: retryAfterSeconds,
  });
}
