import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
}

export interface AuthResult {
  user: AuthUser | null;
  error: string | null;
}

export async function authenticateRequest(
  request?: NextRequest
): Promise<AuthResult> {
  try {
    let supabase;

    if (request) {
      // For middleware/API routes with request object
      supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll() {
              // No-op for read-only operations
            },
          },
        }
      );
    } else {
      // For server components/actions
      const cookieStore = await cookies();
      supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            },
          },
        }
      );
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      return { user: null, error: error.message };
    }

    if (!user) {
      return { user: null, error: "No authenticated user" };
    }

    return {
      user: {
        id: user.id,
        email: user.email!,
        role: user.user_metadata?.role || "user",
      },
      error: null,
    };
  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error.message : "Authentication failed",
    };
  }
}

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  identifier: string,
  limit = 100,
  windowMs = 60000
): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Clean up old entries
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.resetTime < windowStart) {
      rateLimitMap.delete(key);
    }
  }

  const current = rateLimitMap.get(identifier);

  if (!current) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (current.resetTime < now) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (current.count >= limit) {
    return false;
  }

  current.count++;
  return true;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return ["http:", "https:"].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, "");
}

export function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set(
    "Access-Control-Allow-Origin",
    process.env.ALLOWED_ORIGINS || "*"
  );
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}
