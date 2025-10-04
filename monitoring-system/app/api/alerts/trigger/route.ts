import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { NotificationService } from "@/lib/notifications/notification-service";

export async function POST(request: NextRequest) {
  try {
    const { monitorId, incidentId, condition, message } = await request.json();

    if (!monitorId || !condition || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get monitor details
    const { data: monitor, error: monitorError } = await supabase
      .from("monitors")
      .select("*, profiles!monitors_user_id_fkey(email)")
      .eq("id", monitorId)
      .single();

    if (monitorError || !monitor) {
      return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
    }

    // Get applicable alert rules
    const { data: alertRules, error: rulesError } = await supabase
      .from("alert_rules")
      .select("*")
      .eq("is_active", true)
      .or(`monitor_id.eq.${monitorId},monitor_id.is.null`)
      .eq("condition", condition);

    if (rulesError) {
      console.error("Error fetching alert rules:", rulesError);
      return NextResponse.json(
        { error: "Failed to fetch alert rules" },
        { status: 500 }
      );
    }

    if (!alertRules || alertRules.length === 0) {
      return NextResponse.json({ message: "No matching alert rules found" });
    }

    const notificationResults = [];

    // Process each alert rule
    for (const rule of alertRules) {
      try {
        const payload = {
          user_id: monitor.user_id,
          monitor_id: monitorId,
          incident_id: incidentId,
          type: "email" as const, // This will be overridden by the notification service
          title: `Alert: ${monitor.name}`,
          message: message,
        };

        const results = await NotificationService.processAlert(rule, payload);

        // Store notification records
        for (const result of results) {
          const { error: notificationError } = await supabase
            .from("notifications")
            .insert([
              {
                user_id: monitor.user_id,
                monitor_id: monitorId,
                incident_id: incidentId,
                type: result.channel,
                title: payload.title,
                message: payload.message,
                status: result.success ? "sent" : "failed",
              },
            ]);

          if (notificationError) {
            console.error("Error storing notification:", notificationError);
          }
        }

        notificationResults.push({
          rule_id: rule.id,
          rule_name: rule.name,
          results,
        });
      } catch (error: any) {
        console.error(`Error processing alert rule ${rule.id}:`, error);
        notificationResults.push({
          rule_id: rule.id,
          rule_name: rule.name,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed_rules: alertRules.length,
      results: notificationResults,
    });
  } catch (error: any) {
    console.error("Alert trigger error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
