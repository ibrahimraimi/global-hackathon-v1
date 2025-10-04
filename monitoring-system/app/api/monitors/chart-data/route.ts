import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const url = new URL(request.url)
    const hours = Number.parseInt(url.searchParams.get("hours") || "24")

    // Get monitor checks for the specified time period
    const { data: checks, error: checksError } = await supabase
      .from("monitor_checks")
      .select(`
        *,
        monitors!inner (
          user_id
        )
      `)
      .eq("monitors.user_id", user.id)
      .gte("checked_at", new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
      .order("checked_at", { ascending: true })

    if (checksError) {
      console.error("Chart data fetch error:", checksError)
      return NextResponse.json({ error: "Failed to fetch chart data" }, { status: 500 })
    }

    // Process data for response time chart (hourly averages)
    const responseTimeData = processHourlyData(checks || [], hours, "response_time")

    // Process data for status code distribution
    const statusCodes = (checks || []).reduce((acc: any, check: any) => {
      const status = check.status_code || 0
      if (status >= 200 && status < 300) acc["2XX"] = (acc["2XX"] || 0) + 1
      else if (status >= 400 && status < 500) acc["4XX"] = (acc["4XX"] || 0) + 1
      else if (status >= 500) acc["5XX"] = (acc["5XX"] || 0) + 1
      return acc
    }, {})

    // Calculate data transfer (mock for now, can be enhanced later)
    const dataTransferData = processHourlyData(checks || [], hours, "data_transfer")

    return NextResponse.json({
      responseTime: responseTimeData,
      statusCodes: {
        "2XX": formatNumber(statusCodes["2XX"] || 0),
        "4XX": formatNumber(statusCodes["4XX"] || 0),
        "5XX": formatNumber(statusCodes["5XX"] || 0),
      },
      dataTransfer: dataTransferData,
      transferStats: {
        outgoing: "0GB", // Placeholder - can be enhanced
        incoming: "0GB", // Placeholder - can be enhanced
      },
    })
  } catch (error: any) {
    console.error("Chart data API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

function processHourlyData(checks: any[], hours: number, field: string): any[] {
  const now = new Date()
  const data = []

  for (let i = hours - 1; i >= 0; i--) {
    const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000)
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000)

    const hourChecks = checks.filter((check) => {
      const checkTime = new Date(check.checked_at)
      return checkTime >= hourStart && checkTime < hourEnd
    })

    let value = 0
    if (hourChecks.length > 0) {
      if (field === "response_time") {
        value = Math.round(hourChecks.reduce((sum, check) => sum + (check.response_time || 0), 0) / hourChecks.length)
      } else if (field === "data_transfer") {
        // Mock data transfer calculation
        value = Math.round(hourChecks.length * 10 + Math.random() * 50)
      }
    }

    data.push({
      time: hourStart.getHours().toString().padStart(2, "0") + ":00",
      value,
    })
  }

  return data
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M"
  if (num >= 1000) return (num / 1000).toFixed(1) + "K"
  return num.toString()
}
