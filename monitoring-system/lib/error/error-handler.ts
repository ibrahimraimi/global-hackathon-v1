export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(
    message: string,
    statusCode = 500,
    isOperational = true,
    code?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 400, true, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, true, "AUTH_ERROR");
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "Insufficient permissions") {
    super(message, 403, true, "AUTHORIZATION_ERROR");
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, true, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests") {
    super(message, 429, true, "RATE_LIMIT");
    this.name = "RateLimitError";
  }
}

// Error logging utility
export function logError(error: Error, context?: Record<string, any>) {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    timestamp: new Date().toISOString(),
    context,
  };

  if (process.env.NODE_ENV === "production") {
    // In production, you might want to send to external logging service
    console.error("[ERROR]", JSON.stringify(errorInfo));
  } else {
    console.error("[ERROR]", errorInfo);
  }
}

// Global error boundary for React components
export function handleComponentError(error: Error, errorInfo: any) {
  logError(error, { componentStack: errorInfo.componentStack });
}
