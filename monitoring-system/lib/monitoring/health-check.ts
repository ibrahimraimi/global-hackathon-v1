import { createClient } from "@/lib/supabase/server";
import { logger } from "./logger";
import { metrics } from "./metrics";

export interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  checks: {
    database: HealthStatus;
    supabase: HealthStatus;
    memory: HealthStatus;
    disk?: HealthStatus;
  };
  timestamp: string;
  uptime: number;
}

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  responseTime?: number;
  error?: string;
  details?: Record<string, any>;
}

class HealthChecker {
  private startTime = Date.now();

  async performHealthCheck(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();
    const uptime = Date.now() - this.startTime;

    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkSupabase(),
      this.checkMemory(),
    ]);

    const [databaseResult, supabaseResult, memoryResult] = checks;

    const healthResult: HealthCheckResult = {
      status: "healthy",
      checks: {
        database:
          databaseResult.status === "fulfilled"
            ? databaseResult.value
            : {
                status: "unhealthy",
                error:
                  databaseResult.reason?.message || "Database check failed",
              },
        supabase:
          supabaseResult.status === "fulfilled"
            ? supabaseResult.value
            : {
                status: "unhealthy",
                error:
                  supabaseResult.reason?.message || "Supabase check failed",
              },
        memory:
          memoryResult.status === "fulfilled"
            ? memoryResult.value
            : {
                status: "unhealthy",
                error: memoryResult.reason?.message || "Memory check failed",
              },
      },
      timestamp,
      uptime,
    };

    // Determine overall status
    const statuses = Object.values(healthResult.checks).map(
      (check) => check.status
    );
    if (statuses.includes("unhealthy")) {
      healthResult.status = "unhealthy";
    } else if (statuses.includes("degraded")) {
      healthResult.status = "degraded";
    }

    // Log health check results
    logger.info("Health check completed", {
      status: healthResult.status,
      uptime: uptime,
      checks: Object.entries(healthResult.checks).map(([name, check]) => ({
        name,
        status: check.status,
        responseTime: check.responseTime,
      })),
    });

    // Record metrics
    metrics.setGauge(
      "health_check_status",
      healthResult.status === "healthy" ? 1 : 0
    );
    metrics.setGauge("app_uptime_seconds", Math.floor(uptime / 1000));

    return healthResult;
  }

  private async checkDatabase(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      const supabase = await createClient();

      // Basic connectivity test
      const { error: basicError } = await supabase
        .from("monitors")
        .select("count")
        .limit(1)
        .single();

      if (basicError && !basicError.message.includes("PGRST116")) {
        throw new Error(`Database basic check failed: ${basicError.message}`);
      }

      const responseTime = Date.now() - startTime;

      // Performance check
      let status: "healthy" | "degraded" | "unhealthy" = "healthy";
      if (responseTime > 5000) {
        status = "unhealthy";
      } else if (responseTime > 1000) {
        status = "degraded";
      }

      return {
        status,
        responseTime,
        details: {
          connectionTime: responseTime,
        },
      };
    } catch (error) {
      return {
        status: "unhealthy",
        responseTime: Date.now() - startTime,
        error:
          error instanceof Error ? error.message : "Unknown database error",
      };
    }
  }

  private async checkSupabase(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      const supabase = await createClient();

      // Test auth service
      const { error } = await supabase.auth.getSession();

      if (error) {
        throw new Error(`Supabase auth check failed: ${error.message}`);
      }

      const responseTime = Date.now() - startTime;

      return {
        status: responseTime > 2000 ? "degraded" : "healthy",
        responseTime,
        details: {
          authServiceTime: responseTime,
        },
      };
    } catch (error) {
      return {
        status: "unhealthy",
        responseTime: Date.now() - startTime,
        error:
          error instanceof Error ? error.message : "Unknown Supabase error",
      };
    }
  }

  private async checkMemory(): Promise<HealthStatus> {
    try {
      if (typeof process === "undefined") {
        return { status: "healthy" }; // Browser environment
      }

      const memUsage = process.memoryUsage();
      const totalMemory = memUsage.heapTotal;
      const usedMemory = memUsage.heapUsed;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;

      let status: "healthy" | "degraded" | "unhealthy" = "healthy";
      if (memoryUsagePercent > 90) {
        status = "unhealthy";
      } else if (memoryUsagePercent > 75) {
        status = "degraded";
      }

      return {
        status,
        details: {
          heapUsed: Math.round(usedMemory / 1024 / 1024), // MB
          heapTotal: Math.round(totalMemory / 1024 / 1024), // MB
          usagePercent: Math.round(memoryUsagePercent),
          external: Math.round(memUsage.external / 1024 / 1024), // MB
        },
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown memory error",
      };
    }
  }
}

export const healthChecker = new HealthChecker();

// Health check endpoint helper
export async function getHealthStatus(): Promise<HealthCheckResult> {
  return await healthChecker.performHealthCheck();
}
