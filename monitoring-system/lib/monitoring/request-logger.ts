import { NextRequest, NextResponse } from "next/server";
import { createRequestLogger } from "./logger";
import { AppMetrics } from "./metrics";
import { env } from "@/lib/config/environment";

export function withRequestLogging<T>(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options: { logBody?: boolean; logHeaders?: boolean } = {}
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    if (!env.ENABLE_REQUEST_LOGGING) {
      return handler(request, context);
    }

    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    const requestLogger = createRequestLogger(requestId);

    // Extract basic request info
    const method = request.method;
    const url = request.url;
    const userAgent = request.headers.get("user-agent") || "unknown";
    const clientIP =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Log request start
    requestLogger.info("Request started", {
      method,
      url,
      userAgent,
      clientIP,
      headers: options.logHeaders
        ? Object.fromEntries(request.headers.entries())
        : undefined,
    });

    // Log request body for POST/PUT requests if enabled
    if (options.logBody && ["POST", "PUT", "PATCH"].includes(method)) {
      try {
        const body = await request.text();
        if (body) {
          requestLogger.debug("Request body", {
            body: body.substring(0, 1000),
          }); // Limit body size
        }
        // Recreate request with body for handler
        request = new NextRequest(request.url, {
          method: request.method,
          headers: request.headers,
          body: body || undefined,
        });
      } catch (error) {
        requestLogger.warn("Failed to read request body", {
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    let response: NextResponse;
    let error: Error | null = null;

    try {
      response = await handler(request, context);
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      response = NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    const status = response.status.toString();
    const pathname = new URL(url).pathname;

    // Record metrics
    AppMetrics.apiRequestsTotal(method, pathname, status);
    AppMetrics.apiRequestDuration(method, pathname, duration);

    // Log response
    if (error) {
      requestLogger.error("Request failed", error, {
        method,
        url,
        status,
        duration,
        clientIP,
      });
    } else if (response.status >= 400) {
      requestLogger.warn("Request completed with error", {
        method,
        url,
        status,
        duration,
        clientIP,
      });
    } else {
      requestLogger.info("Request completed", {
        method,
        url,
        status,
        duration,
        clientIP,
      });
    }

    // Add request ID to response headers for tracing
    response.headers.set("x-request-id", requestId);

    return response;
  };
}

// Middleware for automatic request logging
export function requestLoggingMiddleware(request: NextRequest) {
  // Skip logging for static assets and health checks
  const pathname = request.nextUrl.pathname;
  const skipPaths = ["/_next", "/favicon.ico", "/health", "/api/health"];

  if (skipPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const requestId = crypto.randomUUID();
  const requestLogger = createRequestLogger(requestId);

  requestLogger.info("Middleware request", {
    method: request.method,
    pathname,
    userAgent: request.headers.get("user-agent"),
    clientIP: request.headers.get("x-forwarded-for") || "unknown",
  });

  const response = NextResponse.next();
  response.headers.set("x-request-id", requestId);

  return response;
}
