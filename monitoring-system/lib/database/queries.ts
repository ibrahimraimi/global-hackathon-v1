import { createClient } from "@/lib/supabase/server";
import { cache, cacheKeys, withCache } from "@/lib/cache/cache-utils";

export const getMonitorStats = withCache(
  async (monitorId: string, hours = 24) => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .rpc("get_monitor_stats", {
        monitor_uuid: monitorId,
        hours_back: hours,
      })
      .single();

    if (error) throw error;
    return data;
  },
  cacheKeys.monitorStats,
  300 // 5 minutes cache
);

export const getUserDashboardStats = withCache(
  async (userId: string) => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .rpc("get_user_dashboard_stats", {
        user_uuid: userId,
      })
      .single();

    if (error) throw error;
    return data;
  },
  cacheKeys.userDashboard,
  180 // 3 minutes cache
);

export const getMonitorHourlyStats = withCache(
  async (monitorId: string, hours = 24) => {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("get_monitor_hourly_stats", {
      monitor_uuid: monitorId,
      hours_back: hours,
    });

    if (error) throw error;
    return data || [];
  },
  (monitorId: string, hours: number) => `monitor:hourly:${monitorId}:${hours}h`,
  600 // 10 minutes cache
);

export const getRecentActivity = withCache(
  async (userId: string, limit = 10) => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("monitor_checks")
      .select(
        `
        id,
        status,
        response_time,
        created_at,
        monitors!inner (
          id,
          name,
          type,
          user_id
        )
      `
      )
      .eq("monitors.user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },
  cacheKeys.recentActivity,
  60 // 1 minute cache
);

// Batch operations for better performance
export async function getMultipleMonitorStats(
  monitorIds: string[],
  hours = 24
) {
  const results = await Promise.allSettled(
    monitorIds.map((id) => getMonitorStats(id, hours))
  );

  return results.map((result, index) => ({
    monitorId: monitorIds[index],
    data: result.status === "fulfilled" ? result.value : null,
    error: result.status === "rejected" ? result.reason : null,
  }));
}

// Cache invalidation helpers
export function invalidateMonitorCache(monitorId: string) {
  cache.delete(cacheKeys.monitorStats(monitorId));
  cache.delete(cacheKeys.monitorChecks(monitorId));
}

export function invalidateUserCache(userId: string) {
  cache.delete(cacheKeys.userDashboard(userId));
  cache.delete(cacheKeys.recentActivity(userId));
  cache.delete(cacheKeys.chartData(userId));
}
