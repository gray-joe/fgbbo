import type { IncomingMessage, ServerResponse } from "node:http";

// The audit trail needs what a handler received and sent, without every
// handler having to pass it along.
const receivedBodies = new WeakMap<IncomingMessage, unknown>();
const sentBodies = new WeakMap<ServerResponse, unknown>();

export const receivedBody = (request: IncomingMessage) => receivedBodies.get(request);
export const sentBody = (response: ServerResponse) => sentBodies.get(response);

export function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: unknown,
): void {
  sentBodies.set(response, body);
  response.writeHead(statusCode, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

export const MAX_BODY_BYTES = 100 * 1024;

export class PayloadTooLargeError extends Error {}

export async function readJson(request: IncomingMessage): Promise<unknown> {
  // Reject early on the declared size, and again on the bytes actually read
  // (a client can lie about, or omit, Content-Length).
  if (Number(request.headers["content-length"]) > MAX_BODY_BYTES) {
    throw new PayloadTooLargeError();
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) {
      throw new PayloadTooLargeError();
    }
    chunks.push(buffer);
  }
  const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  receivedBodies.set(request, parsed);
  return parsed;
}
