import { CampaignDataRow } from "@/types/campaign";
import { SparkChartDataPoint, SparkChartItem, SparkChartMetricType, SparkChartViewMode } from "@/types/sparkCharts";
import { parseDateString } from "@/lib/utils";

/**
 * Utilities for processing spark chart data
 * Extracted from CampaignSparkCharts.tsx for better maintainability
 */

// Helper function to generate all dates in a range
export const generateDateRange = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

// Fill missing dates with zero values to show trend line going to zero
export const fillMissingDates = (
  timeSeriesData: SparkChartDataPoint[],
  allDates: Date[]
): SparkChartDataPoint[] => {
  const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  const dataByDate = new Map<string, SparkChartDataPoint>();

  // Create a map of existing data by date string (using consistent format)
  timeSeriesData.forEach(item => {
    if (item.rawDate) {
      // Use a consistent date key format
      const year = item.rawDate.getFullYear();
      const month = String(item.rawDate.getMonth() + 1).padStart(2, '0');
      const day = String(item.rawDate.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      dataByDate.set(dateKey, item);
    }
  });

  // Find the first and last dates with actual data
  const actualDataDates = timeSeriesData
    .map(item => item.rawDate)
    .filter(Boolean)
    .sort((a, b) => a.getTime() - b.getTime());

  if (actualDataDates.length === 0) {
    return [];
  }

  const firstDataDate = actualDataDates[0];
  const lastDataDate = actualDataDates[actualDataDates.length - 1];

  // Generate complete time series, filling gaps with zero values between first and last data points
  const result = allDates
    .filter(date => date >= firstDataDate && date <= lastDataDate) // Only include dates within campaign range
    .map(date => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      const existingData = dataByDate.get(dateKey);
      if (existingData) {
        return existingData;
      } else {
        // Fill gap with zero values to show continuous line dropping to zero
        return {
          date: dateFormat.format(date),
          rawDate: new Date(date),
          value: 0
        };
      }
    });

  return result;
};

// Calculate metric value based on type
export const calculateMetricValue = (
  row: CampaignDataRow,
  metric: SparkChartMetricType
): number => {
  const impressions = Number(row.IMPRESSIONS) || 0;
  const clicks = Number(row.CLICKS) || 0;
  const revenue = Number(row.REVENUE) || 0;
  const spend = Number(row.SPEND) || 0;
  const transactions = Number(row.TRANSACTIONS) || 0;

  switch (metric) {
    case "impressions":
      return impressions;
    case "clicks":
      return clicks;
    case "ctr":
      return impressions > 0 ? (clicks / impressions) * 100 : 0;
    case "transactions":
      return transactions;
    case "revenue":
      return revenue;
    case "roas":
      return spend > 0 ? revenue / spend : 0;
    default:
      return 0;
  }
};

// Process campaign data into time series for spark charts
export const processTimeSeriesData = (
  data: CampaignDataRow[],
  itemName: string,
  allDates: Date[],
  viewMode: SparkChartViewMode,
  extractAdvertiserName: (campaignName: string) => string,
  extractAgencyInfo: (campaignName: string) => { agency: string; abbreviation: string }
): SparkChartDataPoint[] => {
  const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

  // Filter data for this specific item
  const itemData = data.filter(row => {
    if (viewMode === "campaign") {
      return row["CAMPAIGN ORDER NAME"] === itemName;
    } else {
      const advertiser = extractAdvertiserName(row["CAMPAIGN ORDER NAME"] || "");
      return advertiser === itemName;
    }
  });

  // Group by date and sum metrics
  const dateGroups = new Map<string, {
    date: string;
    rawDate: Date;
    impressions: number;
    clicks: number;
    revenue: number;
    spend: number;
    transactions: number;
  }>();

  itemData.forEach(row => {
    const dateStr = row.DATE;
    if (!dateStr) return;

    const parsedDate = parseDateString(dateStr);
    if (!parsedDate) return;

    const dateKey = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;

    if (!dateGroups.has(dateKey)) {
      dateGroups.set(dateKey, {
        date: dateFormat.format(parsedDate),
        rawDate: parsedDate,
        impressions: 0,
        clicks: 0,
        revenue: 0,
        spend: 0,
        transactions: 0
      });
    }

    const group = dateGroups.get(dateKey)!;
    group.impressions += Number(row.IMPRESSIONS) || 0;
    group.clicks += Number(row.CLICKS) || 0;
    group.revenue += Number(row.REVENUE) || 0;
    group.spend += Number(row.SPEND) || 0;
    group.transactions += Number(row.TRANSACTIONS) || 0;
  });

  // Convert to array with calculated metrics
  const timeSeriesData = Array.from(dateGroups.values()).map(group => ({
    date: group.date,
    rawDate: group.rawDate,
    value: 0, // Will be set based on metric
    impressions: group.impressions,
    clicks: group.clicks,
    revenue: group.revenue,
    spend: group.spend,
    transactions: group.transactions,
    ctr: group.impressions > 0 ? (group.clicks / group.impressions) * 100 : 0,
    roas: group.spend > 0 ? group.revenue / group.spend : 0
  }));

  // Fill missing dates with zero values
  return fillMissingDates(timeSeriesData, allDates);
};

// Calculate totals for a campaign or advertiser
export const calculateTotals = (data: CampaignDataRow[]): {
  impressions: number;
  clicks: number;
  ctr: number;
  transactions: number;
  revenue: number;
  roas: number;
} => {
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalRevenue = 0;
  let totalSpend = 0;
  let totalTransactions = 0;

  data.forEach(row => {
    totalImpressions += Number(row.IMPRESSIONS) || 0;
    totalClicks += Number(row.CLICKS) || 0;
    totalRevenue += Number(row.REVENUE) || 0;
    totalSpend += Number(row.SPEND) || 0;
    totalTransactions += Number(row.TRANSACTIONS) || 0;
  });

  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  return {
    impressions: totalImpressions,
    clicks: totalClicks,
    ctr,
    transactions: totalTransactions,
    revenue: totalRevenue,
    roas
  };
};

// Filter data based on selections
export const filterDataBySelections = (
  data: CampaignDataRow[],
  filters: {
    selectedAgencies: string[];
    selectedAdvertisers: string[];
    selectedCampaigns: string[];
  },
  extractAdvertiserName: (campaignName: string) => string,
  extractAgencyInfo: (campaignName: string) => { agency: string; abbreviation: string }
): CampaignDataRow[] => {
  return data.filter(row => {
    const campaignName = row["CAMPAIGN ORDER NAME"] || "";

    // Filter by agencies
    if (filters.selectedAgencies.length > 0) {
      const { agency } = extractAgencyInfo(campaignName);
      if (!filters.selectedAgencies.includes(agency)) {
        return false;
      }
    }

    // Filter by advertisers
    if (filters.selectedAdvertisers.length > 0) {
      const advertiser = extractAdvertiserName(campaignName);
      if (!filters.selectedAdvertisers.includes(advertiser)) {
        return false;
      }
    }

    // Filter by campaigns
    if (filters.selectedCampaigns.length > 0) {
      if (!filters.selectedCampaigns.includes(campaignName)) {
        return false;
      }
    }

    return true;
  });
};

// Get unique agencies from data
export const getUniqueAgencies = (
  data: CampaignDataRow[],
  extractAgencyInfo: (campaignName: string) => { agency: string; abbreviation: string },
  isTestCampaign: (campaignName: string) => boolean
): { value: string; label: string }[] => {
  const agencies = new Set<string>();

  data.forEach(row => {
    const campaignName = row["CAMPAIGN ORDER NAME"] || "";

    // Skip test/demo/draft campaigns
    if (isTestCampaign(campaignName)) {
      return;
    }

    const { agency } = extractAgencyInfo(campaignName);
    if (agency) {
      agencies.add(agency);
    }
  });

  return Array.from(agencies)
    .sort((a, b) => a.localeCompare(b))
    .map(agency => ({
      value: agency,
      label: agency
    }));
};

// Get unique advertisers from data (filtered by selected agencies)
export const getUniqueAdvertisers = (
  data: CampaignDataRow[],
  selectedAgencies: string[],
  extractAdvertiserName: (campaignName: string) => string,
  extractAgencyInfo: (campaignName: string) => { agency: string; abbreviation: string },
  isTestCampaign: (campaignName: string) => boolean
): { value: string; label: string }[] => {
  const advertisers = new Set<string>();

  // Filter by selected agencies if any
  let filteredData = data;
  if (selectedAgencies.length > 0) {
    filteredData = data.filter(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      const { agency } = extractAgencyInfo(campaignName);
      return selectedAgencies.includes(agency);
    });
  }

  filteredData.forEach(row => {
    const campaignName = row["CAMPAIGN ORDER NAME"] || "";

    // Skip test/demo/draft campaigns
    if (isTestCampaign(campaignName)) {
      return;
    }

    const advertiser = extractAdvertiserName(campaignName);
    if (advertiser) {
      advertisers.add(advertiser);
    }
  });

  return Array.from(advertisers)
    .sort((a, b) => a.localeCompare(b))
    .map(advertiser => ({
      value: advertiser,
      label: advertiser
    }));
};