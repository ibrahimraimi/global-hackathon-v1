export const APP_CONFIG = {
  name: "Monitor Hubbb",
  description:
    "Web application monitoring platform with real-time alerts and analytics",
  version: "1.0.0",
  author: "Ibrahim Raimi & Okhuomon Ajayi",

  // Monitoring defaults
  DEFAULT_CHECK_INTERVAL: 5, // minutes
  DEFAULT_TIMEOUT: 30, // seconds
  MAX_MONITORS_PER_USER: 100,
  MAX_ALERT_RULES_PER_MONITOR: 10,

  // Data retention
  MONITOR_CHECKS_RETENTION_DAYS: 30,
  INCIDENTS_RETENTION_DAYS: 90,
  NOTIFICATIONS_RETENTION_DAYS: 30,

  // Performance limits
  MAX_CONCURRENT_CHECKS: 10,
  MAX_REQUEST_SIZE: "10mb",
  MAX_RESPONSE_TIME_THRESHOLD: 30000, // 30 seconds

  // UI Configuration
  ITEMS_PER_PAGE: 20,
  CHART_DATA_POINTS: 24, // hours
  REFRESH_INTERVALS: {
    DASHBOARD: 30000, // 30 seconds
    MONITORS: 60000, // 1 minute
    CHARTS: 300000, // 5 minutes
  },

  // Status codes
  HTTP_STATUS: {
    SUCCESS_RANGE: [200, 299],
    REDIRECT_RANGE: [300, 399],
    CLIENT_ERROR_RANGE: [400, 499],
    SERVER_ERROR_RANGE: [500, 599],
  },

  // Monitor types
  MONITOR_TYPES: ["website", "api", "database", "webhook"] as const,

  // Alert conditions
  ALERT_CONDITIONS: ["down", "slow", "status_code"] as const,

  // Notification channels
  NOTIFICATION_CHANNELS: ["email", "webhook", "slack"] as const,
} as const;

export type MonitorType = (typeof APP_CONFIG.MONITOR_TYPES)[number];
export type AlertCondition = (typeof APP_CONFIG.ALERT_CONDITIONS)[number];
export type NotificationChannel =
  (typeof APP_CONFIG.NOTIFICATION_CHANNELS)[number];
