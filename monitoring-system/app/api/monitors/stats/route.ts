import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Get user from auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get monitor counts
    const { data: monitors, error: monitorsError } = await supabase
      .from("monitors")
      .select("id, is_active")
      .eq("user_id", user.id)

    if (monitorsError) {
      return NextResponse.json({ error: "Failed to fetch monitors" }, { status: 500 })
    }

    const totalMonitors = monitors?.length || 0
    const activeMonitors = monitors?.filter((m) => m.is_active).length || 0

    // Get recent check results for uptime calculation
    const { data: recentChecks, error: checksError } = await supabase
      .from("monitor_checks")
      .select("status, monitor_id")
      .in("monitor_id", monitors?.map((m) => m.id) || [])
      .gte("checked_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order("checked_at", { ascending: false })

    if (checksError) {
      console.error("Error fetching checks:", checksError)
    }

    // Calculate uptime percentage
    const totalChecks = recentChecks?.length || 0
    const upChecks = recentChecks?.filter((c) => c.status === "up").length || 0
    const uptimePercentage = totalChecks > 0 ? ((upChecks / totalChecks) * 100).toFixed(1) : "100.0"

    // Get average response time
    const { data: responseTimeData, error: responseError } = await supabase
      .from("monitor_checks")
      .select("response_time_ms")
      .in("monitor_id", monitors?.map((m) => m.id) || [])
      .gte("checked_at", new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
      .not("response_time_ms", "is", null)

    if (responseError) {
      console.error("Error fetching response times:", responseError)
    }

    const avgResponseTime =
      responseTimeData && responseTimeData.length > 0
        ? Math.round(
            responseTimeData.reduce((sum, check) => sum + (check.response_time_ms || 0), 0) / responseTimeData.length,
          )
        : 0

    // Get active incidents count
    const { data: incidents, error: incidentsError } = await supabase
      .from("incidents")
      .select("id")
      .in("monitor_id", monitors?.map((m) => m.id) || [])
      .eq("status", "open")

    if (incidentsError) {
      console.error("Error fetching incidents:", incidentsError)
    }

    const activeIncidents = incidents?.length || 0

    return NextResponse.json({
      totalMonitors,
      activeMonitors,
      uptimePercentage: Number.parseFloat(uptimePercentage),
      avgResponseTime,
      activeIncidents,
    })
  } catch (error: any) {
    console.error("Stats API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
