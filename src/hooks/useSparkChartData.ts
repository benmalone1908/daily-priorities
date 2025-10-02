import { useMemo, useState } from "react";
import { CampaignDataRow } from "@/types/campaign";
import {
  SparkChartItem,
  SparkChartFilters,
  SparkChartViewMode,
  SparkChartModalData,
  SparkChartMetricType
} from "@/types/sparkCharts";
import {
  generateDateRange,
  processTimeSeriesData,
  calculateTotals,
  filterDataBySelections,
  getUniqueAgencies,
  getUniqueAdvertisers
} from "@/utils/sparkChartUtils";
import { setToStartOfDay, setToEndOfDay, parseDateString } from "@/lib/utils";
import { useCampaignFilter } from "@/contexts/use-campaign-filter";

interface UseSparkChartDataProps {
  data: CampaignDataRow[];
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  useGlobalFilters?: boolean;
}

/**
 * Custom hook for managing spark chart data and state
 * Extracted from CampaignSparkCharts.tsx for better maintainability
 */
export const useSparkChartData = ({
  data,
  dateRange,
  useGlobalFilters = false
}: UseSparkChartDataProps) => {
  // State management
  const [filters, setFilters] = useState<SparkChartFilters>({
    selectedAgencies: [],
    selectedCampaigns: [],
    selectedAdvertisers: [],
    viewMode: "campaign",
    useGlobalFilters
  });

  const [modalData, setModalData] = useState<SparkChartModalData>({
    isOpen: false,
    itemName: "",
    metricType: "impressions",
    data: []
  });

  // Get filter functions from context
  const { extractAdvertiserName, extractAgencyInfo, isTestCampaign } = useCampaignFilter();

  // Filter data by date range
  const dateFilteredData = useMemo(() => {
    if (!dateRange?.from && !dateRange?.to) return data;

    return data.filter(row => {
      const rowDate = parseDateString(row.DATE);
      if (!rowDate) return false;

      const startDate = dateRange.from ? setToStartOfDay(new Date(dateRange.from)) : null;
      const endDate = dateRange.to ? setToEndOfDay(new Date(dateRange.to)) : null;

      if (startDate && rowDate < startDate) return false;
      if (endDate && rowDate > endDate) return false;

      return true;
    });
  }, [data, dateRange]);

  // Get agency options
  const agencyOptions = useMemo(() => {
    return getUniqueAgencies(dateFilteredData, extractAgencyInfo, isTestCampaign);
  }, [dateFilteredData, extractAgencyInfo, isTestCampaign]);

  // Get advertiser options (filtered by selected agencies)
  const advertiserOptions = useMemo(() => {
    return getUniqueAdvertisers(
      dateFilteredData,
      filters.selectedAgencies,
      extractAdvertiserName,
      extractAgencyInfo,
      isTestCampaign
    );
  }, [dateFilteredData, filters.selectedAgencies, extractAdvertiserName, extractAgencyInfo, isTestCampaign]);

  // Get campaign options (filtered by agencies and advertisers)
  const campaignOptions = useMemo(() => {
    const campaigns = new Set<string>();

    // Apply filters
    const filteredData = filterDataBySelections(
      dateFilteredData,
      {
        selectedAgencies: filters.selectedAgencies,
        selectedAdvertisers: filters.selectedAdvertisers,
        selectedCampaigns: [] // Don't filter by campaigns when building campaign options
      },
      extractAdvertiserName,
      extractAgencyInfo
    );

    filteredData.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";

      // Skip test/demo/draft campaigns
      if (isTestCampaign(campaignName)) {
        return;
      }

      campaigns.add(campaignName);
    });

    return Array.from(campaigns)
      .sort((a, b) => a.localeCompare(b))
      .map(campaign => ({
        value: campaign,
        label: campaign
      }));
  }, [dateFilteredData, filters.selectedAgencies, filters.selectedAdvertisers, extractAdvertiserName, extractAgencyInfo, isTestCampaign]);

  // Get filtered data for charts
  const filteredData = useMemo(() => {
    return filterDataBySelections(
      dateFilteredData,
      filters,
      extractAdvertiserName,
      extractAgencyInfo
    );
  }, [dateFilteredData, filters, extractAdvertiserName, extractAgencyInfo]);

  // Generate complete date range for consistent x-axis
  const allDates = useMemo(() => {
    if (filteredData.length === 0) return [];

    const dates = filteredData
      .map(row => parseDateString(row.DATE))
      .filter(Boolean) as Date[];

    if (dates.length === 0) return [];

    dates.sort((a, b) => a.getTime() - b.getTime());
    const minDate = dates[0];
    const maxDate = dates[dates.length - 1];

    return generateDateRange(minDate, maxDate);
  }, [filteredData]);

  // Process chart data
  const chartData = useMemo(() => {
    if (filteredData.length === 0) return [];

    const items = new Set<string>();

    // Collect unique items based on view mode
    filteredData.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";

      if (isTestCampaign(campaignName)) {
        return;
      }

      if (filters.viewMode === "campaign") {
        items.add(campaignName);
      } else {
        const advertiser = extractAdvertiserName(campaignName);
        if (advertiser) {
          items.add(advertiser);
        }
      }
    });

    // Process each item
    return Array.from(items)
      .sort((a, b) => a.localeCompare(b))
      .map(itemName => {
        // Get data for this specific item
        const itemData = filteredData.filter(row => {
          if (filters.viewMode === "campaign") {
            return row["CAMPAIGN ORDER NAME"] === itemName;
          } else {
            const advertiser = extractAdvertiserName(row["CAMPAIGN ORDER NAME"] || "");
            return advertiser === itemName;
          }
        });

        // Process time series data
        const timeSeriesData = processTimeSeriesData(
          itemData,
          itemName,
          allDates,
          filters.viewMode,
          extractAdvertiserName,
          extractAgencyInfo
        );

        // Calculate totals
        const totals = calculateTotals(itemData);

        // Get agency and advertiser info
        let agency = "";
        let advertiser = "";

        if (itemData.length > 0) {
          const firstRow = itemData[0];
          const campaignName = firstRow["CAMPAIGN ORDER NAME"] || "";
          agency = extractAgencyInfo(campaignName).agency;
          advertiser = extractAdvertiserName(campaignName);
        }

        return {
          name: itemName,
          agency,
          advertiser: filters.viewMode === "campaign" ? advertiser : itemName,
          data: timeSeriesData,
          totals
        };
      });
  }, [filteredData, filters.viewMode, allDates, extractAdvertiserName, extractAgencyInfo, isTestCampaign]);

  // Modal handlers
  const openModal = (itemName: string, metricType: SparkChartMetricType, data: SparkChartDataPoint[]) => {
    setModalData({
      isOpen: true,
      itemName,
      metricType,
      data
    });
  };

  const closeModal = () => {
    setModalData(prev => ({
      ...prev,
      isOpen: false
    }));
  };

  // Filter update handler
  const updateFilters = (newFilters: Partial<SparkChartFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  };

  return {
    // Data
    chartData,
    filteredData,
    allDates,

    // Options for filters
    agencyOptions,
    advertiserOptions,
    campaignOptions,

    // State
    filters,
    updateFilters,

    // Modal state
    modalData,
    openModal,
    closeModal,

    // Computed values
    hasData: chartData.length > 0,
    totalItems: chartData.length
  };
};