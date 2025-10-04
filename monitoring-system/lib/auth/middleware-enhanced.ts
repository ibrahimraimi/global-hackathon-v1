import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "./auth-utils";

export async function updateSession(request: NextRequest) {
  // Rate limiting by IP
  const clientIP =
    request.ip || request.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit(clientIP, 1000, 60000)) {
    // 1000 requests per minute per IP
    return new NextResponse("Too Many Requests", { status: 429 });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Enhanced security headers
  supabaseResponse.headers.set("X-Frame-Options", "DENY");
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff");
  supabaseResponse.headers.set(
    "Referrer-Policy",
    "strict-origin-when-cross-origin"
  );
  supabaseResponse.headers.set("X-XSS-Protection", "1; mode=block");
  supabaseResponse.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vercel.live;"
  );

  // Protected routes
  const protectedPaths = ["/dashboard", "/api/monitors", "/api/alerts"];
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && request.nextUrl.pathname.startsWith("/auth")) {
    const redirectTo =
      request.nextUrl.searchParams.get("redirect") || "/dashboard";
    const url = request.nextUrl.clone();
    url.pathname = redirectTo;
    url.searchParams.delete("redirect");
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
