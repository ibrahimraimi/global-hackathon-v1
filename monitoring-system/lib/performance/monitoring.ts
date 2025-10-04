"use client";

import React from "react";

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000;

  startTimer(name: string): () => void {
    const startTime = performance.now();

    return (metadata?: Record<string, any>) => {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, metadata);
    };
  }

  recordMetric(name: string, duration: number, metadata?: Record<string, any>) {
    // Remove oldest metrics if we're at capacity
    if (this.metrics.length >= this.maxMetrics) {
      this.metrics.shift();
    }

    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    });

    // Log slow operations in development
    if (process.env.NODE_ENV === "development" && duration > 1000) {
      console.warn(
        `[Performance] Slow operation: ${name} took ${duration.toFixed(2)}ms`,
        metadata
      );
    }
  }

  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter((m) => m.name === name);
    }
    return [...this.metrics];
  }

  getAverageTime(name: string): number {
    const nameMetrics = this.getMetrics(name);
    if (nameMetrics.length === 0) return 0;

    const total = nameMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / nameMetrics.length;
  }

  clear() {
    this.metrics = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Decorator for measuring function performance
export function measurePerformance<T extends any[], R>(
  name: string,
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const endTimer = performanceMonitor.startTimer(name);

    try {
      const result = await fn(...args);
      endTimer({ success: true });
      return result;
    } catch (error) {
      endTimer({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  };
}

// React hook for measuring component render performance
export function usePerformanceMonitor(componentName: string) {
  const startTime = performance.now();

  React.useEffect(() => {
    const renderTime = performance.now() - startTime;
    performanceMonitor.recordMetric(`component:${componentName}`, renderTime);
  }, [componentName, startTime]);
}
