export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Returns the document or throws a 404 naming what was missing. */
export function found(doc, what = 'Item') {
  if (!doc) throw new ApiError(404, `${what} not found`);
  return doc;
}
