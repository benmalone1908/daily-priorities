import { useState, useEffect, useMemo } from "react";
import { formatNumber, parseDateString, formatDateSortable } from "@/lib/utils";
import { useCampaignFilter } from "@/contexts/use-campaign-filter";
import { CampaignDataRow } from "@/types/campaign";

// Interface for combo chart data point
interface ComboChartDataPoint {
  date: string;
  IMPRESSIONS: number;
  CLICKS: number;
  TRANSACTIONS: number;
  REVENUE: number;
}

export interface CombinedMetricsProps {
  data: CampaignDataRow[];
  rawData?: CampaignDataRow[];
  initialTab?: string;
  customBarMetric?: string;
  customLineMetric?: string;
}

export interface CombinedMetricsState {
  activeTab: string;
  modalOpen: boolean;
}

export interface CombinedMetricsActions {
  setActiveTab: (tab: string) => void;
  setModalOpen: (open: boolean) => void;
  handleTabChange: (tab: string, onTabChange?: (tab: string) => void) => void;
}

export interface ChartDataPoint {
  date?: string;
  DAY_OF_WEEK?: string;
  [key: string]: string | number | undefined;
}

export interface ProcessedMetricsData {
  chartData: ChartDataPoint[];
  isDayOfWeekData: boolean;
  barSize: number;
  hasData: boolean;
}

// Helper function to get complete date range from data
const getCompleteDateRange = (data: ChartDataPoint[]): Date[] => {
  const dates = data
    .map(row => row.DATE || row.DAY_OF_WEEK)
    .filter(date => date)
    .map(dateStr => {
      // Handle day of week data differently
      if (/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)/i.test(dateStr)) {
        return null; // Don't process day of week data for date ranges
      }
      return parseDateString(dateStr);
    })
    .filter(Boolean) as Date[];

  if (dates.length === 0) return [];

  dates.sort((a, b) => a.getTime() - b.getTime());
  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];

  const result = [];
  const current = new Date(minDate);

  while (current <= maxDate) {
    result.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return result;
};

// Helper function to fill missing dates with zero values for combo chart
const fillMissingDatesForCombo = (processedData: CampaignDataRow[], allDates: Date[]): ComboChartDataPoint[] => {

  // Check if we're dealing with day of week data
  const isDayOfWeekData = processedData.some(item => item.date && /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)/i.test(item.date));

  // Don't fill gaps for day of week data
  if (isDayOfWeekData) {
    return processedData;
  }

  // If no data, return empty array
  if (processedData.length === 0 || allDates.length === 0) return processedData;

  // Create a map of existing data by date string - normalize all dates to MM/DD/YY format
  const dataByDate = new Map();
  processedData.forEach(item => {
    if (item.date) {
      // Normalize the input date to MM/DD/YY format
      const parsedDate = parseDateString(item.date);
      if (parsedDate) {
        const normalizedDateStr = formatDateSortable(parsedDate);
        dataByDate.set(normalizedDateStr, {
          ...item,
          date: normalizedDateStr
        });
      }
    }
  });


  // Find the actual range of dates that have data
  const datesWithData = processedData
    .map(item => parseDateString(item.date))
    .filter(Boolean)
    .sort((a, b) => a!.getTime() - b!.getTime());

  if (datesWithData.length === 0) return processedData;

  const firstDataDate = datesWithData[0]!;
  // Instead of stopping at last data date, extend to the end of the full filter range
  const lastFilterDate = allDates.length > 0 ? allDates[allDates.length - 1] : datesWithData[datesWithData.length - 1]!;

  // Generate complete time series from first data date to end of filter range
  // Use consistent MM/DD/YY date format for proper sorting
  const result: ComboChartDataPoint[] = [];
  for (const date of allDates) {
    if (date >= firstDataDate && date <= lastFilterDate) {
      // Format date as MM/DD/YY for consistent sorting
      const dateStr = formatDateSortable(date);

      const existingData = dataByDate.get(dateStr);

      if (existingData) {
        // Use existing data as-is
        result.push(existingData);
      } else {
        // Fill gap with zero values to show data delivery issues visually
        result.push({
          date: dateStr,
          IMPRESSIONS: 0,
          CLICKS: 0,
          TRANSACTIONS: 0,
          REVENUE: 0
        });
      }
    }
  }


  return result;
};

/**
 * Custom hook for managing combined metrics chart data processing and state
 * Extracted from CombinedMetricsChart.tsx for better maintainability
 */
export const useCombinedMetrics = ({ data,
  rawData = [],
  initialTab = "display",
  customBarMetric = "IMPRESSIONS",
  customLineMetric = "CLICKS"
}: CombinedMetricsProps) => {
  const { extractAgencyInfo } = useCampaignFilter();

  // State management
  const [state, setState] = useState<CombinedMetricsState>({
    activeTab: initialTab,
    modalOpen: false
  });

  // Actions
  const setActiveTab = (tab: string) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  };

  const setModalOpen = (open: boolean) => {
    setState(prev => ({ ...prev, modalOpen: open }));
  };

  const handleTabChange = (value: string, onTabChange?: (tab: string) => void) => {
    setActiveTab(value);
    console.log(`CombinedMetricsChart: Tab changed to ${value}`);

    // Notify parent component about tab change
    if (onTabChange) {
      onTabChange(value);
    }
  };

  // Effect to sync with initialTab prop changes
  useEffect(() => {
    if (initialTab !== state.activeTab) {
      console.log(`CombinedMetricsChart: Syncing tab from props: ${initialTab}`);
      setActiveTab(initialTab);
    }
  }, [initialTab, state.activeTab]);

  // Process spend data for MediaJel Direct vs Channel Partners
  const processSpendData = useMemo(() => {
    const dataToUse = rawData.length > 0 ? rawData : data;
    const spendByDate = new Map();

    dataToUse.forEach(row => {
      const date = row.DATE || row.date;
      if (!date || date === 'Totals') return;

      const campaignName = row["CAMPAIGN ORDER NAME"] || row.campaignName || "";
      let spend = Number(row.SPEND || row.spend || 0);

      // Apply Orangellow CPM to $7 conversion
      const { agency, abbreviation } = extractAgencyInfo(campaignName);
      if (abbreviation === 'OG' || abbreviation === 'SM' || agency === 'Orangellow') {
        // Convert CPM campaigns to $7 CPM equivalent
        const impressions = Number(row.IMPRESSIONS || row.impressions || 0);
        if (impressions > 0) {
          spend = (impressions / 1000) * 7; // $7 CPM
        }
      }

      // Determine if it's MediaJel Direct or Channel Partners
      const isMediaJelDirect = agency === 'MediaJel Direct' || abbreviation === 'MJ';

      if (!spendByDate.has(date)) {
        spendByDate.set(date, {
          date,
          MediaJelDirect: 0,
          ChannelPartners: 0
        });
      }

      const dayData = spendByDate.get(date);
      if (isMediaJelDirect) {
        dayData.MediaJelDirect += spend;
      } else {
        dayData.ChannelPartners += spend;
      }
    });

    return Array.from(spendByDate.values()).sort((a, b) => {
      const dateA = parseDateString(a.date);
      const dateB = parseDateString(b.date);
      return dateA && dateB ? dateA.getTime() - dateB.getTime() : 0;
    });
  }, [data, rawData, extractAgencyInfo]);

  // Process main chart data
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Get complete date range for filling gaps
    const completeDateRange = getCompleteDateRange(data);

    // Process data to ensure we have all required fields and normalize dates
    const processed = data
      .filter(item => item && (item.DATE || item.DAY_OF_WEEK))
      .map(item => {
        let dateStr = item.DATE || item.DAY_OF_WEEK;

        // Normalize date format to MM/DD/YY for consistent sorting (only for DATE, not DAY_OF_WEEK)
        if (item.DATE) {
          const parsedDate = parseDateString(item.DATE);
          if (parsedDate) {
            dateStr = formatDateSortable(parsedDate);
          }
        }

        return {
          date: dateStr,
          IMPRESSIONS: Number(item.IMPRESSIONS || 0),
          CLICKS: Number(item.CLICKS || 0),
          TRANSACTIONS: Number(item.TRANSACTIONS || 0),
          REVENUE: Number(item.REVENUE || 0),
        };
      });

    // Check if we're dealing with day of week data
    const isDayOfWeekData = processed.some(item => item.date && /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)/i.test(item.date));

    // For spend mode, use different data processing
    const dataForChart = state.activeTab === "spend" ? processSpendData : processed;

    // Fill missing dates with zero values for continuous trend lines (only for date-based data)
    const filledData = state.activeTab === "spend" ? processSpendData : fillMissingDatesForCombo(processed, completeDateRange);

    // Only sort if we're dealing with dates, not days of week
    const sortedData = !isDayOfWeekData && filledData.some(item => item.date && !isNaN(new Date(item.date).getTime()))
      ? filledData.sort((a, b) => {
          try {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          } catch (e) {
            return 0;
          }
        })
      : filledData;

    return {
      chartData: sortedData,
      isDayOfWeekData,
      barSize: isDayOfWeekData ? 120 : 80,
      hasData: sortedData.length > 0
    };
  }, [data, state.activeTab, processSpendData]);

  // Format functions for different metrics
  const getMetricFormatter = (metric: string) => {
    switch (metric) {
      case "IMPRESSIONS":
      case "CLICKS":
      case "TRANSACTIONS":
        return (value: number) => formatNumber(value);
      case "REVENUE":
        return (value: number) => `$${formatNumber(value)}`;
      default:
        return (value: number) => formatNumber(value);
    }
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case "IMPRESSIONS":
        return "Impressions";
      case "CLICKS":
        return "Clicks";
      case "TRANSACTIONS":
        return "Transactions";
      case "REVENUE":
        return "Attributed Sales";
      default:
        return metric;
    }
  };

  // Custom tooltip formatter function
  const formatTooltipValue = (value: unknown, name: string) => {
    const numValue = Number(value);
    if (isNaN(numValue)) return [value, name];

    // Handle revenue formatting with dollar signs and cents
    if (name === "REVENUE" || name === "Revenue" || name.toLowerCase().includes("revenue")) {
      return [`$${numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Attributed Sales"];
    }

    // Handle other metrics with comma formatting
    switch (name) {
      case "IMPRESSIONS":
      case "Impressions":
        return [numValue.toLocaleString(), "Impressions"];
      case "CLICKS":
      case "Clicks":
        return [numValue.toLocaleString(), "Clicks"];
      case "TRANSACTIONS":
      case "Transactions":
        return [numValue.toLocaleString(), "Transactions"];
      default:
        return [numValue.toLocaleString(), name];
    }
  };

  const actions: CombinedMetricsActions = {
    setActiveTab,
    setModalOpen,
    handleTabChange
  };

  return {
    state,
    actions,
    data: processedData,
    utils: {
      getMetricFormatter,
      getMetricLabel,
      formatTooltipValue
    }
  };
};