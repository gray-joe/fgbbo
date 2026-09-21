import { API_URL } from "../support/env";

export interface ApiResponse {
  status: number;
  // The API returns JSON; tests assert on it directly.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
}

/** Thin HTTP client for the API. Never throws on non-2xx, so tests can assert on errors. */
export class Api {
  constructor(readonly token?: string) {}

  async request(method: string, path: string, body?: unknown): Promise<ApiResponse> {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : undefined };
  }

  get = (path: string) => this.request("GET", path);
  post = (path: string, body?: unknown) => this.request("POST", path, body);
  patch = (path: string, body?: unknown) => this.request("PATCH", path, body);
  delete = (path: string) => this.request("DELETE", path);

  /** Reads every page of a list endpoint. */
  async list(path: string): Promise<ApiResponse["body"][]> {
    const items: ApiResponse["body"][] = [];
    let cursor: number | null = 0;
    do {
      const sep = path.includes("?") ? "&" : "?";
      const page: ApiResponse["body"] = await this.must("GET", `${path}${sep}limit=100&cursor=${cursor}`);
      items.push(...page.data);
      cursor = page.pagination.next_cursor;
    } while (cursor !== null);
    return items;
  }

  /** Like `request`, but throws unless the call succeeds. For test setup. */
  async must(method: string, path: string, body?: unknown): Promise<ApiResponse["body"]> {
    const response = await this.request(method, path, body);
    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `${method} ${path} -> ${response.status} ${JSON.stringify(response.body)}`,
      );
    }
    return response.body;
  }
}
