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
    const limit = Number.parseInt(url.searchParams.get("limit") || "10")

    // Get recent monitor checks with monitor details
    const { data: recentChecks, error: checksError } = await supabase
      .from("monitor_checks")
      .select(`
        *,
        monitors (
          name,
          type,
          url
        )
      `)
      .eq("monitors.user_id", user.id)
      .order("checked_at", { ascending: false })
      .limit(limit)

    if (checksError) {
      console.error("Recent activity fetch error:", checksError)
      return NextResponse.json({ error: "Failed to fetch recent activity" }, { status: 500 })
    }

    // Format the data for the frontend
    const formattedActivity = (recentChecks || []).map((check: any) => ({
      id: check.id,
      title: `${check.monitors?.name || "Unknown Monitor"} - ${check.monitors?.type || "Unknown"}`,
      status: check.status === "up" ? "up" : check.status === "down" ? "down" : "degraded",
      time: formatTimeAgo(new Date(check.checked_at)),
      message:
        check.status === "up" ? `Response time: ${check.response_time}ms` : check.error_message || "Check failed",
      responseTime: check.response_time,
      checkedAt: check.checked_at,
    }))

    return NextResponse.json({ activity: formattedActivity })
  } catch (error: any) {
    console.error("Recent activity API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

  if (diffInMinutes < 1) return "Just now"
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`

  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`
}
