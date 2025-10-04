import { env } from "./environment";

export const DATABASE_CONFIG = {
  // Connection settings
  maxConnections: env.DATABASE_POOL_SIZE,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,

  // Query settings
  statementTimeout: 60000, // 1 minute
  queryTimeout: 30000, // 30 seconds

  // SSL configuration for production
  ssl: env.isProduction
    ? {
        rejectUnauthorized: false,
      }
    : false,

  // Connection retry settings
  retryAttempts: 3,
  retryDelay: 1000,

  // Performance settings
  enableQueryLogging: env.isDevelopment,
  slowQueryThreshold: 1000, // 1 second

  // Maintenance settings
  enableAutoVacuum: true,
  maintenanceWindow: "02:00", // 2 AM UTC
} as const;

// Database health check configuration
export const HEALTH_CHECK_CONFIG = {
  interval: 30000, // 30 seconds
  timeout: 5000, // 5 seconds
  retries: 3,
  queries: {
    basic: "SELECT 1",
    tables: `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      LIMIT 5
    `,
    performance: `
      SELECT 
        schemaname,
        tablename,
        n_tup_ins + n_tup_upd + n_tup_del as total_operations
      FROM pg_stat_user_tables 
      ORDER BY total_operations DESC 
      LIMIT 5
    `,
  },
} as const;
