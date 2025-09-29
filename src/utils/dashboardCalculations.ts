import { CampaignDataRow } from "@/types/campaign";
import { normalizeDate } from "@/lib/utils";

/**
 * Dashboard-specific calculation utilities
 * Extracted from Dashboard.tsx for better maintainability
 */

// Core metric calculations
export const calculateROAS = (revenue: number, spend: number): number => {
  if (spend === 0) return 0;
  return revenue / spend;
};

export const calculateCTR = (clicks: number, impressions: number): number => {
  if (impressions === 0) return 0;
  return (clicks / impressions) * 100;
};

export const calculateAOV = (revenue: number, transactions: number): number => {
  if (transactions === 0) return 0;
  return revenue / transactions;
};

// Formatting utilities
export const formatCTR = (value: number): string => {
  try {
    return `${value.toFixed(2)}%`;
  } catch (error) {
    console.error("Error formatting CTR:", error);
    return "0.00%";
  }
};

export const formatTransactions = (value: number): string => {
  try {
    return value.toLocaleString();
  } catch (error) {
    console.error("Error formatting transactions:", error);
    return "0";
  }
};

export const formatAOV = (value: number): string => {
  try {
    return `$${value.toFixed(2)}`;
  } catch (error) {
    console.error("Error formatting AOV:", error);
    return "$0.00";
  }
};

export const formatRevenue = (value: number): string => {
  try {
    return `$${Math.round(value).toLocaleString()}`;
  } catch (error) {
    console.error("Error formatting revenue:", error);
    return "$0";
  }
};

export const formatROAS = (value: number): string => {
  try {
    return value.toFixed(2);
  } catch (error) {
    console.error("Error formatting ROAS:", error);
    return "0.00";
  }
};

// Data aggregation functions
export interface AggregatedDataPoint {
  date: string;
  IMPRESSIONS: number;
  CLICKS: number;
  REVENUE: number;
  SPEND: number;
  TRANSACTIONS: number;
  CTR: number;
  ROAS: number;
  AOV: number;
  count: number;
}

export const getAggregatedData = (data: CampaignDataRow[]): AggregatedDataPoint[] => {
  if (!data || !data.length) return [];

  try {
    const dateMap = new Map<string, Omit<AggregatedDataPoint, 'CTR' | 'ROAS' | 'AOV'>>();

    data.forEach(row => {
      if (!row.DATE) return;

      const dateStr = normalizeDate(row.DATE);
      if (!dateStr) return;

      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, {
          date: dateStr,
          IMPRESSIONS: 0,
          CLICKS: 0,
          REVENUE: 0,
          SPEND: 0,
          TRANSACTIONS: 0,
          count: 0
        });
      }

      const entry = dateMap.get(dateStr)!;
      entry.IMPRESSIONS += Number(row.IMPRESSIONS) || 0;
      entry.CLICKS += Number(row.CLICKS) || 0;
      entry.REVENUE += Number(row.REVENUE) || 0;
      entry.SPEND += Number(row.SPEND) || 0;
      entry.TRANSACTIONS += Number(row.TRANSACTIONS) || 0;
      entry.count += 1;
    });

    return Array.from(dateMap.values())
      .map(entry => ({
        ...entry,
        CTR: calculateCTR(entry.CLICKS, entry.IMPRESSIONS),
        ROAS: calculateROAS(entry.REVENUE, entry.SPEND),
        AOV: calculateAOV(entry.REVENUE, entry.TRANSACTIONS)
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error) {
    console.error("Error aggregating data:", error);
    return [];
  }
};

export interface DayOfWeekDataPoint {
  day: string;
  dayIndex: number;
  IMPRESSIONS: number;
  CLICKS: number;
  REVENUE: number;
  SPEND: number;
  TRANSACTIONS: number;
  CTR: number;
  ROAS: number;
  AOV: number;
  count: number;
}

export const getAggregatedDataByDayOfWeek = (data: CampaignDataRow[]): DayOfWeekDataPoint[] => {
  if (!data || !data.length) return [];

  try {
    const dayMap = new Map<string, Omit<DayOfWeekDataPoint, 'CTR' | 'ROAS' | 'AOV'>>();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    data.forEach(row => {
      if (!row.DATE) return;

      const date = new Date(row.DATE);
      if (isNaN(date.getTime())) return;

      const dayIndex = date.getDay();
      const dayName = dayNames[dayIndex];

      if (!dayMap.has(dayName)) {
        dayMap.set(dayName, {
          day: dayName,
          dayIndex,
          IMPRESSIONS: 0,
          CLICKS: 0,
          REVENUE: 0,
          SPEND: 0,
          TRANSACTIONS: 0,
          count: 0
        });
      }

      const entry = dayMap.get(dayName)!;
      entry.IMPRESSIONS += Number(row.IMPRESSIONS) || 0;
      entry.CLICKS += Number(row.CLICKS) || 0;
      entry.REVENUE += Number(row.REVENUE) || 0;
      entry.SPEND += Number(row.SPEND) || 0;
      entry.TRANSACTIONS += Number(row.TRANSACTIONS) || 0;
      entry.count += 1;
    });

    return Array.from(dayMap.values())
      .map(entry => ({
        ...entry,
        CTR: calculateCTR(entry.CLICKS, entry.IMPRESSIONS),
        ROAS: calculateROAS(entry.REVENUE, entry.SPEND),
        AOV: calculateAOV(entry.REVENUE, entry.TRANSACTIONS)
      }))
      .sort((a, b) => a.dayIndex - b.dayIndex);
  } catch (error) {
    console.error("Error aggregating by day of week:", error);
    return [];
  }
};

// Weekly data aggregation
export interface WeeklyDataPoint {
  weekStart: string;
  periodStart: string;
  periodEnd: string;
  IMPRESSIONS: number;
  CLICKS: number;
  REVENUE: number;
  SPEND: number;
  TRANSACTIONS: number;
  CTR: number;
  ROAS: number;
  AOV: number;
  count: number;
  rows: CampaignDataRow[];
}

export const getWeeklyAggregatedData = (data: CampaignDataRow[]): WeeklyDataPoint[] => {
  if (!data || !data.length) return [];

  try {
    const weekMap = new Map<string, Omit<WeeklyDataPoint, 'CTR' | 'ROAS' | 'AOV'>>();

    data.forEach(row => {
      if (!row.DATE) return;

      const date = new Date(row.DATE);
      if (isNaN(date.getTime())) return;

      // Get start of week (Sunday)
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const weekKey = startOfWeek.toISOString().split('T')[0];

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, {
          weekStart: weekKey,
          periodStart: startOfWeek.toLocaleDateString(),
          periodEnd: endOfWeek.toLocaleDateString(),
          IMPRESSIONS: 0,
          CLICKS: 0,
          REVENUE: 0,
          SPEND: 0,
          TRANSACTIONS: 0,
          count: 0,
          rows: []
        });
      }

      const entry = weekMap.get(weekKey)!;
      entry.IMPRESSIONS += Number(row.IMPRESSIONS) || 0;
      entry.CLICKS += Number(row.CLICKS) || 0;
      entry.REVENUE += Number(row.REVENUE) || 0;
      entry.SPEND += Number(row.SPEND) || 0;
      entry.TRANSACTIONS += Number(row.TRANSACTIONS) || 0;
      entry.count += 1;
      entry.rows.push(row);
    });

    return Array.from(weekMap.values())
      .map(entry => ({
        ...entry,
        CTR: calculateCTR(entry.CLICKS, entry.IMPRESSIONS),
        ROAS: calculateROAS(entry.REVENUE, entry.SPEND),
        AOV: calculateAOV(entry.REVENUE, entry.TRANSACTIONS)
      }))
      .sort((a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime());
  } catch (error) {
    console.error("Error aggregating weekly data:", error);
    return [];
  }
};

// Anomaly detection utilities
export const detectAnomalies = (
  data: AggregatedDataPoint[],
  metric: keyof Pick<AggregatedDataPoint, 'IMPRESSIONS' | 'CLICKS' | 'REVENUE'>,
  threshold: number = 2 // Standard deviations
) => {
  if (data.length < 3) return [];

  const values = data.map(d => d[metric] as number);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  const anomalies = data
    .map((point, index) => {
      const value = point[metric] as number;
      const zScore = stdDev > 0 ? Math.abs(value - mean) / stdDev : 0;

      return {
        ...point,
        index,
        value,
        zScore,
        isAnomaly: zScore > threshold,
        severity: zScore > 3 ? 'high' : zScore > 2 ? 'medium' : 'low'
      };
    })
    .filter(point => point.isAnomaly);

  return anomalies;
};

// Date range utilities
export const getDateRangeText = (data: CampaignDataRow[]): string => {
  if (!data || data.length === 0) return "No data available";

  try {
    const dates = data
      .map(row => new Date(row.DATE))
      .filter(date => !isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (dates.length === 0) return "No valid dates found";

    const startDate = dates[0].toLocaleDateString();
    const endDate = dates[dates.length - 1].toLocaleDateString();

    if (startDate === endDate) {
      return `Data for ${startDate}`;
    }

    return `${startDate} - ${endDate}`;
  } catch (error) {
    console.error("Error getting date range text:", error);
    return "Date range unavailable";
  }
};