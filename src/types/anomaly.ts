// Anomaly Detection Types

export interface AnomalyDataRow {
  DATE: string;
  [key: string]: string | number;
}

export interface DailyAnomaly {
  campaign: string;
  DATE: string;
  metric: string;
  actualValue: number;
  mean: number;
  deviation: number;
  stdDev: number;
  severity: "high" | "medium" | "low";
}

export interface WeeklyAnomaly extends DailyAnomaly {
  rows?: AnomalyDataRow[];
  dailyExpectedValues?: number[];
}

export type AnomalyData = DailyAnomaly | WeeklyAnomaly;

export interface AnomalyDetectionResult {
  daily: DailyAnomaly[];
  weekly: WeeklyAnomaly[];
}

export interface AnomalyFilterOptions {
  metric?: string;
  campaign?: string;
  severity?: "high" | "medium" | "low";
  minDeviation?: number;
}
