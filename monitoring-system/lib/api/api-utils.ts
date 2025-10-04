import { type NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  rateLimit,
  addCorsHeaders,
} from "@/lib/auth/auth-utils";

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export async function withAuth<T>(
  handler: (user: any, request: NextRequest) => Promise<ApiResponse<T>>,
  request: NextRequest,
  options: {
    requireAuth?: boolean;
    rateLimit?: { limit: number; window: number };
  } = {}
): Promise<NextResponse> {
  try {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return addCorsHeaders(new NextResponse(null, { status: 200 }));
    }

    // Rate limiting
    if (options.rateLimit) {
      const clientIP =
        request.ip || request.headers.get("x-forwarded-for") || "unknown";
      if (
        !rateLimit(clientIP, options.rateLimit.limit, options.rateLimit.window)
      ) {
        return addCorsHeaders(
          NextResponse.json({ error: "Too many requests" }, { status: 429 })
        );
      }
    }

    // Authentication
    const { user, error: authError } = await authenticateRequest(request);

    if (options.requireAuth !== false && (!user || authError)) {
      return addCorsHeaders(
        NextResponse.json(
          { error: authError || "Unauthorized" },
          { status: 401 }
        )
      );
    }

    // Execute handler
    const result = await handler(user, request);

    if (result.error) {
      return addCorsHeaders(
        NextResponse.json({ error: result.error }, { status: 400 })
      );
    }

    return addCorsHeaders(
      NextResponse.json({
        data: result.data,
        message: result.message,
      })
    );
  } catch (error) {
    console.error("[API Error]:", error);
    return addCorsHeaders(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}

export const monitorSchema = {
  name: { required: true, minLength: 1, maxLength: 100 },
  url: { required: true, type: "url" },
  type: { required: true, enum: ["website", "api", "database", "webhook"] },
  interval: { required: true, type: "number", min: 1, max: 1440 },
  timeout: { required: true, type: "number", min: 1, max: 300 },
};

export function validateInput(
  data: any,
  schema: any
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    const fieldRules = rules as any;

    if (
      fieldRules.required &&
      (value === undefined || value === null || value === "")
    ) {
      errors.push(`${field} is required`);
      continue;
    }

    if (value !== undefined && value !== null && value !== "") {
      if (fieldRules.type === "url") {
        try {
          new URL(value);
        } catch {
          errors.push(`${field} must be a valid URL`);
        }
      }

      if (fieldRules.type === "number" && typeof value !== "number") {
        errors.push(`${field} must be a number`);
      }

      if (fieldRules.minLength && value.length < fieldRules.minLength) {
        errors.push(
          `${field} must be at least ${fieldRules.minLength} characters`
        );
      }

      if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
        errors.push(
          `${field} must be no more than ${fieldRules.maxLength} characters`
        );
      }

      if (fieldRules.min && value < fieldRules.min) {
        errors.push(`${field} must be at least ${fieldRules.min}`);
      }

      if (fieldRules.max && value > fieldRules.max) {
        errors.push(`${field} must be no more than ${fieldRules.max}`);
      }

      if (fieldRules.enum && !fieldRules.enum.includes(value)) {
        errors.push(`${field} must be one of: ${fieldRules.enum.join(", ")}`);
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}
