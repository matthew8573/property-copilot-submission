/**
 * Raised when client-supplied input fails validation. The router surfaces it
 * as a 400 instead of a generic 500, so a bad request never masquerades as a
 * server fault.
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
