export class AppError extends Error { constructor(statusCode, message, errors = [], field = undefined) { super(message); this.statusCode = statusCode; this.errors = errors; this.field = field; } }
