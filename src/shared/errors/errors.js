/** An error with an HTTP status that is safe to show to the client. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (message = 'Bad request') => new HttpError(400, message);
export const unauthorized = (message = 'Sign in required') => new HttpError(401, message);
export const forbidden = (message = 'Not allowed') => new HttpError(403, message);
export const notfound = (message = 'Not found') => new HttpError(404, message);
export const conflict = (message = 'Conflict') => new HttpError(409, message);
