export const env = {
  // App Configuration
  NODE_ENV: process.env.NODE_ENV || "development",
  APP_URL:
    process.env.NEXT_PUBLIC_APP_URL || "https://monitor-hubb-kappa.vercel.app",

  // Supabase Configuration
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,

  // Security Configuration
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || "*",
  JWT_SECRET: process.env.JWT_SECRET,

  // Monitoring Configuration
  MONITOR_CHECK_TIMEOUT: Number.parseInt(
    process.env.MONITOR_CHECK_TIMEOUT || "30000"
  ),
  MAX_CONCURRENT_CHECKS: Number.parseInt(
    process.env.MAX_CONCURRENT_CHECKS || "10"
  ),

  // Rate Limiting
  RATE_LIMIT_REQUESTS: Number.parseInt(
    process.env.RATE_LIMIT_REQUESTS || "100"
  ),
  RATE_LIMIT_WINDOW_MS: Number.parseInt(
    process.env.RATE_LIMIT_WINDOW_MS || "60000"
  ),

  // Email Configuration (for future use)
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: Number.parseInt(process.env.SMTP_PORT || "587"),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  FROM_EMAIL: process.env.FROM_EMAIL || "noreply@monitor-hub.com",

  // External Services
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
  SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,

  // Feature Flags
  ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS !== "false",
  ENABLE_MONITORING: process.env.ENABLE_MONITORING !== "false",
  ENABLE_NOTIFICATIONS: process.env.ENABLE_NOTIFICATIONS !== "false",

  // Database Configuration
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_POOL_SIZE: Number.parseInt(process.env.DATABASE_POOL_SIZE || "10"),

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  ENABLE_REQUEST_LOGGING: process.env.ENABLE_REQUEST_LOGGING === "true",
} as const;

// Validation function to ensure required environment variables are set
export function validateEnvironment() {
  const requiredVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ];

  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
        "Please check your .env.local file or environment configuration."
    );
  }
}

// Development environment check
export const isDevelopment = env.NODE_ENV === "development";
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
