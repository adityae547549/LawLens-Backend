class AppError extends Error {
  constructor(message, statusCode = 500, type = 'SERVER_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg, details = null) {
    return new AppError(msg, 400, 'BAD_REQUEST', details);
  }

  static unauthorized(msg = 'Authentication required') {
    return new AppError(msg, 401, 'UNAUTHORIZED');
  }

  static forbidden(msg = 'Access denied') {
    return new AppError(msg, 403, 'FORBIDDEN');
  }

  static notFound(msg = 'Resource not found') {
    return new AppError(msg, 404, 'NOT_FOUND');
  }

  static conflict(msg = 'Resource conflict') {
    return new AppError(msg, 409, 'CONFLICT');
  }

  static internal(msg = 'Internal server error') {
    return new AppError(msg, 500, 'INTERNAL_ERROR');
  }
}

module.exports = AppError;
