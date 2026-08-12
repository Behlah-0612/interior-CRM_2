// Small typed error classes so API routes can `throw` and have a single
// place (lib/api-utils.ts) turn them into the right HTTP response.

export class UnauthorizedError extends Error {
  status = 401 as const;
  constructor(message = "You need to sign in to do that.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  status = 403 as const;
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  status = 404 as const;
  constructor(message = "That wasn't found.") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class BadRequestError extends Error {
  status = 400 as const;
  constructor(message = "That request doesn't look right.") {
    super(message);
    this.name = "BadRequestError";
  }
}

export class TooManyRequestsError extends Error {
  status = 429 as const;
  retryAfterSeconds: number;
  constructor(retryAfterSeconds: number, message = "Too many attempts. Please slow down.") {
    super(message);
    this.name = "TooManyRequestsError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
