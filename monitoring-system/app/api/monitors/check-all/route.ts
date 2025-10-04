import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { MonitorChecker } from "@/lib/monitoring/monitor-checker"

export async function POST() {
  try {
    const supabase = await createClient()

    // Get all active monitors
    const { data: monitors, error: monitorsError } = await supabase.from("monitors").select("*").eq("is_active", true)

    if (monitorsError) {
      return NextResponse.json({ error: "Failed to fetch monitors" }, { status: 500 })
    }

    if (!monitors || monitors.length === 0) {
      return NextResponse.json({ message: "No active monitors found" })
    }

    const results = []

    // Check each monitor
    for (const monitor of monitors) {
      try {
        let checkResult
        switch (monitor.type) {
          case "database":
            checkResult = await MonitorChecker.checkDatabaseConnection(monitor)
            break
          case "redis":
            checkResult = await MonitorChecker.checkRedisConnection(monitor)
            break
          case "webhook":
            checkResult = await MonitorChecker.checkWebhook(monitor)
            break
          default:
            checkResult = await MonitorChecker.checkMonitor(monitor)
        }

        // Store the check result
        const { error: insertError } = await supabase.from("monitor_checks").insert([checkResult])

        if (insertError) {
          console.error(`Error storing check result for monitor ${monitor.id}:`, insertError)
        }

        // Handle incidents
        if (checkResult.status === "down") {
          await handleDownStatus(supabase, monitor, checkResult)
        } else {
          await handleUpStatus(supabase, monitor)
        }

        results.push({
          monitor_id: monitor.id,
          monitor_name: monitor.name,
          status: checkResult.status,
          response_time: checkResult.response_time_ms,
          error: checkResult.error_message,
        })
      } catch (error: any) {
        console.error(`Error checking monitor ${monitor.id}:`, error)
        results.push({
          monitor_id: monitor.id,
          monitor_name: monitor.name,
          status: "down",
          error: error.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      checked: results.length,
      results,
    })
  } catch (error: any) {
    console.error("Bulk monitor check error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

async function handleDownStatus(supabase: any, monitor: any, checkResult: any) {
  const { data: existingIncident } = await supabase
    .from("incidents")
    .select("*")
    .eq("monitor_id", monitor.id)
    .eq("status", "open")
    .single()

  if (!existingIncident) {
    await supabase.from("incidents").insert([
      {
        monitor_id: monitor.id,
        title: `${monitor.name} is down`,
        description: checkResult.error_message || "Monitor check failed",
        status: "open",
        severity: "high",
        started_at: checkResult.checked_at,
      },
    ])
  }
}

async function handleUpStatus(supabase: any, monitor: any) {
  const { data: openIncident } = await supabase
    .from("incidents")
    .select("*")
    .eq("monitor_id", monitor.id)
    .eq("status", "open")
    .single()

  if (openIncident) {
    await supabase
      .from("incidents")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", openIncident.id)
  }
}
