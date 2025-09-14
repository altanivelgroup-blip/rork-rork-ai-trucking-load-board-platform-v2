// Performance Audit Utility - Temporary logging for performance measurement
// This file is for audit purposes only and should be removed after analysis

interface PerformanceMetric {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceAuditor {
  private metrics: PerformanceMetric[] = [];
  private activeOperations: Map<string, PerformanceMetric> = new Map();

  startOperation(operation: string, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      operation,
      startTime: Date.now(),
      metadata
    };
    
    this.activeOperations.set(operation, metric);
    console.log(`[PERF_AUDIT] 🚀 Started: ${operation}`, metadata || '');
  }

  endOperation(operation: string, additionalMetadata?: Record<string, any>): number | null {
    const metric = this.activeOperations.get(operation);
    if (!metric) {
      console.warn(`[PERF_AUDIT] ⚠️ Operation not found: ${operation}`);
      return null;
    }

    const endTime = Date.now();
    const duration = endTime - metric.startTime;
    
    metric.endTime = endTime;
    metric.duration = duration;
    if (additionalMetadata) {
      metric.metadata = { ...metric.metadata, ...additionalMetadata };
    }

    this.metrics.push(metric);
    this.activeOperations.delete(operation);

    const status = duration > 2000 ? '🐌 SLOW' : duration > 1000 ? '⚠️ MODERATE' : '✅ FAST';
    console.log(`[PERF_AUDIT] ${status} Completed: ${operation} in ${duration}ms`, metric.metadata || '');
    
    return duration;
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getSlowestOperations(limit: number = 5): PerformanceMetric[] {
    return this.metrics
      .filter(m => m.duration !== undefined)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, limit);
  }

  generateReport(): string {
    const completed = this.metrics.filter(m => m.duration !== undefined);
    const slowOps = this.getSlowestOperations();
    const avgDuration = completed.reduce((sum, m) => sum + (m.duration || 0), 0) / completed.length;

    let report = '\n=== PERFORMANCE AUDIT REPORT ===\n';
    report += `Total Operations: ${completed.length}\n`;
    report += `Average Duration: ${avgDuration.toFixed(2)}ms\n`;
    report += `Active Operations: ${this.activeOperations.size}\n\n`;
    
    report += 'SLOWEST OPERATIONS:\n';
    slowOps.forEach((op, index) => {
      const status = (op.duration || 0) > 2000 ? '🐌' : (op.duration || 0) > 1000 ? '⚠️' : '✅';
      report += `${index + 1}. ${status} ${op.operation}: ${op.duration}ms\n`;
      if (op.metadata) {
        report += `   Metadata: ${JSON.stringify(op.metadata)}\n`;
      }
    });

    return report;
  }

  clear(): void {
    this.metrics = [];
    this.activeOperations.clear();
    console.log('[PERF_AUDIT] 🧹 Metrics cleared');
  }
}

// Global auditor instance
export const performanceAuditor = new PerformanceAuditor();

// Convenience functions
export const startAudit = (operation: string, metadata?: Record<string, any>) => {
  performanceAuditor.startOperation(operation, metadata);
};

export const endAudit = (operation: string, metadata?: Record<string, any>) => {
  return performanceAuditor.endOperation(operation, metadata);
};

export const auditReport = () => {
  const report = performanceAuditor.generateReport();
  console.log(report);
  return report;
};

export const clearAudit = () => {
  performanceAuditor.clear();
};

// Higher-order function to wrap async operations
export const auditAsync = async <T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> => {
  startAudit(operation, metadata);
  try {
    const result = await fn();
    endAudit(operation, { success: true });
    return result;
  } catch (error) {
    endAudit(operation, { success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
};

// Function to wrap synchronous operations
export const auditSync = <T>(
  operation: string,
  fn: () => T,
  metadata?: Record<string, any>
): T => {
  startAudit(operation, metadata);
  try {
    const result = fn();
    endAudit(operation, { success: true });
    return result;
  } catch (error) {
    endAudit(operation, { success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
};