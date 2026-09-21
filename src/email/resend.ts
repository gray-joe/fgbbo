export interface ResendOptions {
  apiKey: string;
  /** Sender, e.g. `Bake Off Fantasy <login@example.com>`. Must be on a domain verified in Resend. */
  from: string;
  fetchImpl?: typeof fetch;
  onError?: (message: string) => void;
}

const SEND_URL = "https://api.resend.com/emails";

/**
 * Returns a `deliverLoginCode` that emails the code through Resend. Sending is
 * fire-and-forget so the login response takes the same time whether or not the
 * account exists. Failures are logged without the key, code, or address.
 */
export function createResendDeliverer(
  options: ResendOptions,
): (email: string, code: string) => void {
  const { apiKey, from, fetchImpl = fetch, onError = console.error } = options;

  async function send(email: string, code: string): Promise<void> {
    const response = await fetchImpl(SEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Your login code",
        text:
          `Your login code is ${code}.\n\n` +
          "It expires in 10 minutes and works once. " +
          "If you didn't ask for it, you can ignore this email.",
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`Resend responded with status ${response.status}`);
    }
  }

  return (email, code) => {
    send(email, code).catch((error: unknown) => {
      const reason = error instanceof Error ? error.message : "unknown error";
      onError(`Could not send login email: ${reason}`);
    });
  };
}
