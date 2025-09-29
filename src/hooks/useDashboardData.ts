import { useMemo, useState } from "react";
import { CampaignDataRow, TimeSeriesDataPoint } from "@/types/campaign";
import { normalizeDate } from "@/lib/utils";

// Types specific to dashboard
export type ChartViewMode = "date" | "dayOfWeek";
export type AnomalyPeriod = "daily" | "weekly";
export type ComparisonPeriod = "7" | "14" | "30";
export type ChartTabType = "display" | "attribution" | "custom";

export interface WeeklyData {
  periodStart: string;
  periodEnd: string;
  IMPRESSIONS: number;
  CLICKS: number;
  REVENUE: number;
  ROAS: number;
  count: number;
  TRANSACTIONS?: number;
}

export interface WeeklyAggregation {
  weekStart: string;
  [metric: string]: number | string | CampaignDataRow[];
  rows: CampaignDataRow[];
}

export interface DashboardFilters {
  selectedCampaigns: string[];
  selectedAdvertisers: string[];
  selectedAgencies: string[];
  anomalyPeriod: AnomalyPeriod;
  comparisonPeriod: ComparisonPeriod;
  viewMode: ChartViewMode;
}

interface UseDashboardDataProps {
  data: CampaignDataRow[];
  filters?: Partial<DashboardFilters>;
}

/**
 * Custom hook for Dashboard data processing and state management
 */
export const useDashboardData = ({ data, filters = {} }: UseDashboardDataProps) => {
  const [anomalyPeriod, setAnomalyPeriod] = useState<AnomalyPeriod>(
    filters.anomalyPeriod || "daily"
  );
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>(
    filters.comparisonPeriod || "7"
  );
  const [viewMode, setViewMode] = useState<ChartViewMode>(
    filters.viewMode || "date"
  );

  // Aggregate data by date
  const aggregatedData = useMemo(() => {
    if (!data || !data.length) return [];

    try {
      const dateMap = new Map();

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

        const entry = dateMap.get(dateStr);
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
          CTR: entry.IMPRESSIONS > 0 ? (entry.CLICKS / entry.IMPRESSIONS) * 100 : 0,
          ROAS: entry.SPEND > 0 ? entry.REVENUE / entry.SPEND : 0,
          AOV: entry.TRANSACTIONS > 0 ? entry.REVENUE / entry.TRANSACTIONS : 0
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      console.error("Error aggregating data:", error);
      return [];
    }
  }, [data]);

  // Aggregate data by day of week
  const aggregatedByDayOfWeek = useMemo(() => {
    if (!data || !data.length) return [];

    try {
      const dayMap = new Map();
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

        const entry = dayMap.get(dayName);
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
          CTR: entry.IMPRESSIONS > 0 ? (entry.CLICKS / entry.IMPRESSIONS) * 100 : 0,
          ROAS: entry.SPEND > 0 ? entry.REVENUE / entry.SPEND : 0,
          AOV: entry.TRANSACTIONS > 0 ? entry.REVENUE / entry.TRANSACTIONS : 0
        }))
        .sort((a, b) => a.dayIndex - b.dayIndex);
    } catch (error) {
      console.error("Error aggregating by day of week:", error);
      return [];
    }
  }, [data]);

  // Get processed data based on view mode
  const processedData = useMemo(() => {
    return viewMode === "date" ? aggregatedData : aggregatedByDayOfWeek;
  }, [viewMode, aggregatedData, aggregatedByDayOfWeek]);

  // Filter data based on selections
  const filteredData = useMemo(() => {
    let filtered = [...data];

    if (filters.selectedCampaigns?.length) {
      filtered = filtered.filter(row =>
        filters.selectedCampaigns!.includes(row['CAMPAIGN ORDER NAME'])
      );
    }

    // Add more filters as needed
    return filtered;
  }, [data, filters]);

  return {
    // Processed data
    aggregatedData,
    aggregatedByDayOfWeek,
    processedData,
    filteredData,

    // State
    anomalyPeriod,
    setAnomalyPeriod,
    comparisonPeriod,
    setComparisonPeriod,
    viewMode,
    setViewMode,

    // Computed values
    hasData: data.length > 0,
    totalRecords: data.length,
    dateRange: aggregatedData.length > 0 ? {
      start: aggregatedData[0].date,
      end: aggregatedData[aggregatedData.length - 1].date
    } : null
  };
};