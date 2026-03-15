/**
 * ErrorLogger — structured error logging with rate monitoring and alerting.
 *
 * Validates Requirements: 12.1, 12.2, 12.3
 */

export interface ErrorLogEntry {
  timestamp: string;
  requestId: string;
  errorCode: string;
  message: string;
  stack?: string;
  context: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface TimestampedEntry extends ErrorLogEntry {
  _recordedAt: number; // epoch ms for rate calculations
}

// Alert thresholds: errors per minute
const ALERT_THRESHOLDS: Record<ErrorLogEntry['severity'], number> = {
  low: 100,
  medium: 50,
  high: 20,
  critical: 5,
};

export class ErrorLogger {
  private entries: TimestampedEntry[] = [];
  private alertCallbacks: Array<(severity: string, rate: number) => void> = [];

  log(entry: ErrorLogEntry): void {
    const timestamped: TimestampedEntry = {
      ...entry,
      _recordedAt: Date.now(),
    };

    this.entries.push(timestamped);

    // Write to console with structured output
    const logFn =
      entry.severity === 'critical' || entry.severity === 'high'
        ? console.error
        : console.warn;

    logFn(
      JSON.stringify({
        level: entry.severity,
        timestamp: entry.timestamp,
        requestId: entry.requestId,
        errorCode: entry.errorCode,
        message: entry.message,
        context: entry.context,
        ...(entry.stack ? { stack: entry.stack } : {}),
      })
    );

    this.checkAlerts();
  }

  /**
   * Returns the number of errors logged within the given time window.
   */
  getErrorRate(windowMs: number): number {
    const cutoff = Date.now() - windowMs;
    return this.entries.filter((e) => e._recordedAt >= cutoff).length;
  }

  /**
   * Check error rates against thresholds and fire alert callbacks.
   */
  checkAlerts(): void {
    const windowMs = 60_000; // 1-minute window

    for (const [severity, threshold] of Object.entries(ALERT_THRESHOLDS)) {
      const cutoff = Date.now() - windowMs;
      const rate = this.entries.filter(
        (e) => e.severity === severity && e._recordedAt >= cutoff
      ).length;

      if (rate >= threshold) {
        this.alertCallbacks.forEach((cb) => cb(severity, rate));
      }
    }
  }

  /**
   * Register a callback to be invoked when an alert threshold is exceeded.
   */
  onAlert(callback: (severity: string, rate: number) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Retrieve recent log entries (for dashboards / debugging).
   */
  getRecentEntries(windowMs: number = 3_600_000): ErrorLogEntry[] {
    const cutoff = Date.now() - windowMs;
    return this.entries
      .filter((e) => e._recordedAt >= cutoff)
      .map(({ _recordedAt, ...entry }) => entry);
  }

  /**
   * Clear all stored entries (useful in tests).
   */
  clear(): void {
    this.entries = [];
  }
}

// Singleton instance shared across the application
export const errorLogger = new ErrorLogger();
