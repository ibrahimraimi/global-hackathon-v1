import { env } from "@/lib/config/environment";

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  userId?: string;
  requestId?: string;
  error?: Error;
}

class Logger {
  private logLevel: LogLevel;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  constructor() {
    this.logLevel = this.getLogLevelFromEnv();
  }

  private getLogLevelFromEnv(): LogLevel {
    switch (env.LOG_LEVEL.toLowerCase()) {
      case "error":
        return LogLevel.ERROR;
      case "warn":
        return LogLevel.WARN;
      case "info":
        return LogLevel.INFO;
      case "debug":
        return LogLevel.DEBUG;
      default:
        return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private formatMessage(entry: LogEntry): string {
    const { level, message, timestamp, context, userId, requestId } = entry;
    const levelName = LogLevel[level];

    let formatted = `[${timestamp}] ${levelName}: ${message}`;

    if (requestId) formatted += ` [req:${requestId}]`;
    if (userId) formatted += ` [user:${userId}]`;
    if (context) formatted += ` ${JSON.stringify(context)}`;

    return formatted;
  }

  private addLog(entry: LogEntry) {
    // Remove oldest logs if we're at capacity
    if (this.logs.length >= this.maxLogs) {
      this.logs.shift();
    }

    this.logs.push(entry);

    // Console output
    const formatted = this.formatMessage(entry);

    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(formatted, entry.error);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
    }
  }

  error(
    message: string,
    error?: Error,
    context?: Record<string, any>,
    userId?: string,
    requestId?: string
  ) {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    this.addLog({
      level: LogLevel.ERROR,
      message,
      timestamp: new Date().toISOString(),
      context,
      userId,
      requestId,
      error,
    });
  }

  warn(
    message: string,
    context?: Record<string, any>,
    userId?: string,
    requestId?: string
  ) {
    if (!this.shouldLog(LogLevel.WARN)) return;

    this.addLog({
      level: LogLevel.WARN,
      message,
      timestamp: new Date().toISOString(),
      context,
      userId,
      requestId,
    });
  }

  info(
    message: string,
    context?: Record<string, any>,
    userId?: string,
    requestId?: string
  ) {
    if (!this.shouldLog(LogLevel.INFO)) return;

    this.addLog({
      level: LogLevel.INFO,
      message,
      timestamp: new Date().toISOString(),
      context,
      userId,
      requestId,
    });
  }

  debug(
    message: string,
    context?: Record<string, any>,
    userId?: string,
    requestId?: string
  ) {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    this.addLog({
      level: LogLevel.DEBUG,
      message,
      timestamp: new Date().toISOString(),
      context,
      userId,
      requestId,
    });
  }

  // Get recent logs for debugging
  getRecentLogs(count = 100): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
  }
}

export const logger = new Logger();

// Request logging middleware helper
export function createRequestLogger(requestId: string, userId?: string) {
  return {
    error: (message: string, error?: Error, context?: Record<string, any>) =>
      logger.error(message, error, context, userId, requestId),
    warn: (message: string, context?: Record<string, any>) =>
      logger.warn(message, context, userId, requestId),
    info: (message: string, context?: Record<string, any>) =>
      logger.info(message, context, userId, requestId),
    debug: (message: string, context?: Record<string, any>) =>
      logger.debug(message, context, userId, requestId),
  };
}
