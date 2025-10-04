interface MonitorCheck {
  monitor_id: string;
  status: "up" | "down" | "degraded";
  response_time_ms?: number;
  status_code?: number;
  error_message?: string;
  checked_at: string;
}

interface Monitor {
  id: string;
  name: string;
  type: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  expected_status_code: number;
  timeout_seconds: number;
  is_active: boolean;
}

export class MonitorChecker {
  static async checkMonitor(monitor: Monitor): Promise<MonitorCheck> {
    const startTime = Date.now();

    try {
      if (!monitor.is_active) {
        return {
          monitor_id: monitor.id,
          status: "down",
          error_message: "Monitor is paused",
          checked_at: new Date().toISOString(),
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        monitor.timeout_seconds * 1000
      );

      const requestOptions: RequestInit = {
        method: monitor.method,
        headers: {
          "User-Agent": "Monitor-Hub/1.0",
          ...monitor.headers,
        },
        signal: controller.signal,
      };

      // Add body for POST/PUT/PATCH requests
      if (monitor.body && ["POST", "PUT", "PATCH"].includes(monitor.method)) {
        requestOptions.body = monitor.body;
        if (!monitor.headers["Content-Type"]) {
          requestOptions.headers = {
            ...requestOptions.headers,
            "Content-Type": "application/json",
          };
        }
      }

      const response = await fetch(monitor.url, requestOptions);
      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;
      const statusCode = response.status;

      // Determine status based on response
      let status: "up" | "down" | "degraded" = "up";
      let errorMessage: string | undefined;

      if (statusCode !== monitor.expected_status_code) {
        status = statusCode >= 500 ? "down" : "degraded";
        errorMessage = `Expected status ${monitor.expected_status_code}, got ${statusCode}`;
      } else if (responseTime > 5000) {
        status = "degraded";
        errorMessage = "Slow response time detected";
      }

      return {
        monitor_id: monitor.id,
        status,
        response_time_ms: responseTime,
        status_code: statusCode,
        error_message: errorMessage,
        checked_at: new Date().toISOString(),
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      let errorMessage = "Unknown error";
      if (error.name === "AbortError") {
        errorMessage = `Request timeout after ${monitor.timeout_seconds}s`;
      } else if (error.code === "ENOTFOUND") {
        errorMessage = "DNS resolution failed";
      } else if (error.code === "ECONNREFUSED") {
        errorMessage = "Connection refused";
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        monitor_id: monitor.id,
        status: "down",
        response_time_ms: responseTime,
        error_message: errorMessage,
        checked_at: new Date().toISOString(),
      };
    }
  }

  static async checkDatabaseConnection(
    monitor: Monitor
  ): Promise<MonitorCheck> {
    return this.checkMonitor(monitor);
  }

  static async checkRedisConnection(monitor: Monitor): Promise<MonitorCheck> {
    return this.checkMonitor(monitor);
  }

  static async checkWebhook(monitor: Monitor): Promise<MonitorCheck> {
    const testMonitor = {
      ...monitor,
      method: "POST",
      body: JSON.stringify({ test: true, timestamp: Date.now() }),
      headers: {
        ...monitor.headers,
        "Content-Type": "application/json",
      },
    };

    return this.checkMonitor(testMonitor);
  }
}
