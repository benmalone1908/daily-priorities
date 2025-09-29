import { useMemo } from "react";
import { CampaignDataRow, TimeSeriesDataPoint, CampaignTotals, TrendData } from "@/types/campaign";
import {
  aggregateDataByDate,
  calculateCampaignTotals,
  calculateTrends
} from "@/utils/campaignCalculations";
import {
  getCompleteDateRange,
  fillMissingDatesForAggregated
} from "@/utils/dateUtils";
import { useCampaignFilter } from "@/contexts/CampaignFilterContext";

interface UseCampaignDataProps {
  data: CampaignDataRow[];
}

interface UseCampaignDataReturn {
  timeSeriesData: TimeSeriesDataPoint[];
  totals: CampaignTotals;
  trends: TrendData;
  completeDateRange: Date[];
  isLoading: boolean;
}

/**
 * Custom hook for processing campaign data
 * Handles aggregation, calculations, and trend analysis
 */
export const useCampaignData = ({ data }: UseCampaignDataProps): UseCampaignDataReturn => {
  const { showDebugInfo } = useCampaignFilter();

  // Get complete date range for filling gaps
  const completeDateRange = useMemo(() => {
    return getCompleteDateRange(data);
  }, [data]);

  // Group data by date for time series with optimization
  const timeSeriesData = useMemo(() => {
    if (!data || data.length === 0) return [];

    if (showDebugInfo) {
      console.log('useCampaignData: Starting time series aggregation...');
    }

    // Aggregate raw data by date
    const aggregatedData = aggregateDataByDate(data, showDebugInfo);

    // Fill missing dates with zero values for continuous trend lines
    const filledData = fillMissingDatesForAggregated(aggregatedData, completeDateRange);

    if (showDebugInfo) {
      console.log('useCampaignData: Final filled data:', filledData.length, 'entries');
    }

    return filledData;
  }, [data, completeDateRange, showDebugInfo]);

  // Calculate totals with optimization
  const totals = useMemo(() => {
    return calculateCampaignTotals(timeSeriesData, showDebugInfo);
  }, [timeSeriesData, showDebugInfo]);

  // Calculate trends (comparing last two data points)
  const trends = useMemo(() => {
    return calculateTrends(timeSeriesData);
  }, [timeSeriesData]);

  const isLoading = useMemo(() => {
    return data.length === 0;
  }, [data]);

  return {
    timeSeriesData,
    totals,
    trends,
    completeDateRange,
    isLoading
  };
};

/**
 * Hook for filtering campaign data
 */
interface UseFilteredCampaignDataProps extends UseCampaignDataProps {
  selectedCampaigns?: string[];
  selectedAdvertisers?: string[];
  selectedAgencies?: string[];
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

export const useFilteredCampaignData = (props: UseFilteredCampaignDataProps) => {
  const {
    data,
    selectedCampaigns,
    selectedAdvertisers,
    selectedAgencies,
    dateRange
  } = props;

  // Filter data based on selections
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Apply campaign filter
    if (selectedCampaigns && selectedCampaigns.length > 0) {
      filtered = filtered.filter(row =>
        selectedCampaigns.includes(row['CAMPAIGN ORDER NAME'])
      );
    }

    // Apply date range filter
    if (dateRange?.from || dateRange?.to) {
      filtered = filtered.filter(row => {
        const rowDate = new Date(row.DATE);
        if (dateRange.from && rowDate < dateRange.from) return false;
        if (dateRange.to && rowDate > dateRange.to) return false;
        return true;
      });
    }

    // TODO: Add advertiser and agency filtering
    // This would require integration with the campaign parsing logic

    // Note: selectedAdvertisers and selectedAgencies not yet implemented
    console.log('Filters not yet implemented:', { selectedAdvertisers, selectedAgencies });

    return filtered;
  }, [data, selectedCampaigns, selectedAdvertisers, selectedAgencies, dateRange]);

  // Use the main hook with filtered data
  return useCampaignData({ data: filteredData });
};