interface Metric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

interface Counter {
  name: string;
  value: number;
  tags?: Record<string, string>;
}

interface Histogram {
  name: string;
  values: number[];
  tags?: Record<string, string>;
}

class MetricsCollector {
  private counters = new Map<string, Counter>();
  private histograms = new Map<string, Histogram>();
  private gauges = new Map<string, Metric>();

  // Counter methods
  incrementCounter(name: string, value = 1, tags?: Record<string, string>) {
    const key = this.getKey(name, tags);
    const existing = this.counters.get(key);

    if (existing) {
      existing.value += value;
    } else {
      this.counters.set(key, { name, value, tags });
    }
  }

  getCounter(name: string, tags?: Record<string, string>): number {
    const key = this.getKey(name, tags);
    return this.counters.get(key)?.value || 0;
  }

  // Histogram methods (for response times, etc.)
  recordHistogram(name: string, value: number, tags?: Record<string, string>) {
    const key = this.getKey(name, tags);
    const existing = this.histograms.get(key);

    if (existing) {
      existing.values.push(value);
      // Keep only last 1000 values to prevent memory issues
      if (existing.values.length > 1000) {
        existing.values = existing.values.slice(-1000);
      }
    } else {
      this.histograms.set(key, { name, values: [value], tags });
    }
  }

  getHistogramStats(name: string, tags?: Record<string, string>) {
    const key = this.getKey(name, tags);
    const histogram = this.histograms.get(key);

    if (!histogram || histogram.values.length === 0) {
      return null;
    }

    const values = histogram.values.sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / count;
    const min = values[0];
    const max = values[count - 1];
    const p50 = values[Math.floor(count * 0.5)];
    const p95 = values[Math.floor(count * 0.95)];
    const p99 = values[Math.floor(count * 0.99)];

    return { count, sum, avg, min, max, p50, p95, p99 };
  }

  // Gauge methods (for current values)
  setGauge(name: string, value: number, tags?: Record<string, string>) {
    const key = this.getKey(name, tags);
    this.gauges.set(key, {
      name,
      value,
      timestamp: Date.now(),
      tags,
    });
  }

  getGauge(name: string, tags?: Record<string, string>): number | null {
    const key = this.getKey(name, tags);
    return this.gauges.get(key)?.value || null;
  }

  // Utility methods
  private getKey(name: string, tags?: Record<string, string>): string {
    if (!tags) return name;
    const tagString = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(",");
    return `${name}{${tagString}}`;
  }

  // Get all metrics for export
  getAllMetrics() {
    return {
      counters: Array.from(this.counters.values()),
      histograms: Array.from(this.histograms.entries()).map(
        ([key, histogram]) => ({
          key,
          ...histogram,
          stats: this.getHistogramStats(histogram.name, histogram.tags),
        })
      ),
      gauges: Array.from(this.gauges.values()),
    };
  }

  // Reset all metrics
  reset() {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
  }
}

export const metrics = new MetricsCollector();

// Common application metrics
export const AppMetrics = {
  // API metrics
  apiRequestsTotal: (method: string, endpoint: string, status: string) =>
    metrics.incrementCounter("api_requests_total", 1, {
      method,
      endpoint,
      status,
    }),

  apiRequestDuration: (method: string, endpoint: string, duration: number) =>
    metrics.recordHistogram("api_request_duration_ms", duration, {
      method,
      endpoint,
    }),

  // Monitor metrics
  monitorChecksTotal: (status: string, type: string) =>
    metrics.incrementCounter("monitor_checks_total", 1, { status, type }),

  monitorCheckDuration: (monitorId: string, duration: number) =>
    metrics.recordHistogram("monitor_check_duration_ms", duration, {
      monitor_id: monitorId,
    }),

  // Database metrics
  dbQueriesTotal: (operation: string, table: string) =>
    metrics.incrementCounter("db_queries_total", 1, { operation, table }),

  dbQueryDuration: (operation: string, table: string, duration: number) =>
    metrics.recordHistogram("db_query_duration_ms", duration, {
      operation,
      table,
    }),

  // Error metrics
  errorsTotal: (type: string, component: string) =>
    metrics.incrementCounter("errors_total", 1, { type, component }),

  // User metrics
  activeUsers: (count: number) => metrics.setGauge("active_users", count),

  totalMonitors: (count: number) => metrics.setGauge("total_monitors", count),

  // Cache metrics
  cacheHits: (key: string) =>
    metrics.incrementCounter("cache_hits_total", 1, { key }),

  cacheMisses: (key: string) =>
    metrics.incrementCounter("cache_misses_total", 1, { key }),
};
