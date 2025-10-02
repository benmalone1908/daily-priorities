import { useMemo } from 'react';
import { normalizeDate } from "@/lib/utils";
import type { CampaignDataRow } from '@/types/campaign';

export interface WeeklyData {
  periodStart: string;
  periodEnd: string;
  IMPRESSIONS: number;
  CLICKS: number;
  REVENUE: number;
  TRANSACTIONS: number;
  ROAS: number;
  CTR: number;
  AOV: number;
  count: number;
}

export interface DayOfWeekData {
  DAY_OF_WEEK: string;
  IMPRESSIONS: number;
  CLICKS: number;
  REVENUE: number;
  TRANSACTIONS: number;
  count: number;
}

export interface AggregatedDataByDate {
  DATE: string;
  IMPRESSIONS: number;
  CLICKS: number;
  REVENUE: number;
  TRANSACTIONS: number;
  count: number;
}

export interface DashboardDataProcessingResult {
  aggregatedData: AggregatedDataByDate[];
  aggregatedDataByDayOfWeek: DayOfWeekData[];
  campaigns: string[];
  advertisers: string[];
  agencies: string[];
}

/**
 * Custom hook for Dashboard data processing and aggregation
 * Extracted from Dashboard.tsx for better maintainability
 */
export const useDashboardDataProcessing = (data: CampaignDataRow[]) => {
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
            DATE: dateStr,
            IMPRESSIONS: 0,
            CLICKS: 0,
            REVENUE: 0,
            TRANSACTIONS: 0,
            count: 0
          });
        }

        const entry = dateMap.get(dateStr);
        entry.IMPRESSIONS += Number(row.IMPRESSIONS) || 0;
        entry.CLICKS += Number(row.CLICKS) || 0;
        entry.REVENUE += Number(row.REVENUE) || 0;
        entry.TRANSACTIONS += Number(row.TRANSACTIONS) || 0;
        entry.count += 1;
      });

      // Sort by date ascending
      return Array.from(dateMap.values())
        .sort((a, b) => new Date(a.DATE).getTime() - new Date(b.DATE).getTime());
    } catch (error) {
      console.error("Error in getAggregatedData:", error);
      return [];
    }
  }, [data]);

  const aggregatedDataByDayOfWeek = useMemo(() => {
    if (!data || !data.length) return [];

    try {
      const dayMap = new Map();
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

      // Initialize all days of week
      dayNames.forEach((day, index) => {
        dayMap.set(index, {
          DAY_OF_WEEK: day,
          IMPRESSIONS: 0,
          CLICKS: 0,
          REVENUE: 0,
          TRANSACTIONS: 0,
          count: 0
        });
      });

      data.forEach(row => {
        if (!row.DATE) return;

        const dateStr = normalizeDate(row.DATE);
        if (!dateStr) return;

        const date = new Date(dateStr);
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

        const entry = dayMap.get(dayOfWeek);
        entry.IMPRESSIONS += Number(row.IMPRESSIONS) || 0;
        entry.CLICKS += Number(row.CLICKS) || 0;
        entry.REVENUE += Number(row.REVENUE) || 0;
        entry.TRANSACTIONS += Number(row.TRANSACTIONS) || 0;
        entry.count += 1;
      });

      // Convert to array and sort by day of week
      return Array.from(dayMap.values());
    } catch (error) {
      console.error("Error in getAggregatedDataByDayOfWeek:", error);
      return [];
    }
  }, [data]);

  const campaigns = useMemo(() => {
    if (!data?.length) return [];
    return Array.from(new Set(data.map(row => row['CAMPAIGN ORDER NAME']).filter(Boolean)));
  }, [data]);

  const advertisers = useMemo(() => {
    if (!data?.length) return [];
    // Extract advertisers from campaign names - would need the actual extraction logic
    return Array.from(new Set(data.map(row => {
      // Placeholder for advertiser extraction logic
      const campaignName = row['CAMPAIGN ORDER NAME'];
      return campaignName ? campaignName.split(':')[2]?.split('-')[0]?.trim() || '' : '';
    }).filter(Boolean)));
  }, [data]);

  const agencies = useMemo(() => {
    if (!data?.length) return [];
    // Extract agencies from campaign names - would need the actual extraction logic
    return Array.from(new Set(data.map(row => {
      // Placeholder for agency extraction logic
      const campaignName = row['CAMPAIGN ORDER NAME'];
      return campaignName ? campaignName.split(':')[1]?.trim() || '' : '';
    }).filter(Boolean)));
  }, [data]);

  return {
    aggregatedData,
    aggregatedDataByDayOfWeek,
    campaigns,
    advertisers,
    agencies
  };
};