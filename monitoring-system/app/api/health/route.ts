import { NextResponse } from "next/server";
import { metrics } from "@/lib/monitoring/metrics";
import { getHealthStatus } from "@/lib/monitoring/health-check";

export async function GET() {
  try {
    const healthStatus = await getHealthStatus();

    const statusCode =
      healthStatus.status === "healthy"
        ? 200
        : healthStatus.status === "degraded"
        ? 200
        : 503;

    return NextResponse.json(healthStatus, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Health check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

// Metrics endpoint for monitoring systems
export async function POST() {
  try {
    const allMetrics = metrics.getAllMetrics();

    return NextResponse.json({
      metrics: allMetrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to retrieve metrics" },
      { status: 500 }
    );
  }
}
