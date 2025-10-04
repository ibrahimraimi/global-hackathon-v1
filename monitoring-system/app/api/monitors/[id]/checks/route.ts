import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get user from auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify monitor belongs to user
    const { data: monitor, error: monitorError } = await supabase
      .from("monitors")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (monitorError || !monitor) {
      return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
    }

    // Get query parameters
    const url = new URL(request.url);
    const limit = Number.parseInt(url.searchParams.get("limit") || "100");
    const hours = Number.parseInt(url.searchParams.get("hours") || "24");

    // Get check results
    const { data: checks, error: checksError } = await supabase
      .from("monitor_checks")
      .select("*")
      .eq("monitor_id", id)
      .gte(
        "checked_at",
        new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
      )
      .order("checked_at", { ascending: false })
      .limit(limit);

    if (checksError) {
      return NextResponse.json(
        { error: "Failed to fetch checks" },
        { status: 500 }
      );
    }

    return NextResponse.json({ checks: checks || [] });
  } catch (error: any) {
    console.error("Monitor checks API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
