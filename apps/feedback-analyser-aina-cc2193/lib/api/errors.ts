export type ErrorExtra = { retryable?: boolean; fields?: Record<string, string>; retryAfterSeconds?: number };

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly extra: ErrorExtra;
  constructor(status: number, code: string, message: string, extra: ErrorExtra = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export const notFound = () => new ApiError(404, "not_found", "Entry not found.");
