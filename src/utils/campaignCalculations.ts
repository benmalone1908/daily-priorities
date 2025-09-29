import { CampaignDataRow, TimeSeriesDataPoint, CampaignTotals, TrendData } from "@/types/campaign";
import { calculatePercentChange } from "./dateUtils";

/**
 * Calculate CTR (Click Through Rate) as a percentage
 */
export const calculateCTR = (clicks: number, impressions: number): number => {
  if (impressions === 0) return 0;
  return (clicks / impressions) * 100;
};

/**
 * Calculate ROAS (Return on Ad Spend)
 */
export const calculateROAS = (revenue: number, spend: number): number => {
  if (spend === 0) return 0;
  return revenue / spend;
};

/**
 * Process raw campaign data row with calculated metrics
 */
export const processDataRow = (row: CampaignDataRow): TimeSeriesDataPoint => {
  const impressions = Number(row.IMPRESSIONS) || 0;
  const clicks = Number(row.CLICKS) || 0;
  const revenue = Number(row.REVENUE) || 0;
  const spend = Number(row.SPEND) || 0;
  const transactions = Number(row.TRANSACTIONS) || 0;

  return {
    date: row.DATE,
    IMPRESSIONS: impressions,
    CLICKS: clicks,
    REVENUE: revenue,
    SPEND: spend,
    TRANSACTIONS: transactions,
    CTR: calculateCTR(clicks, impressions),
    ROAS: calculateROAS(revenue, spend)
  };
};

/**
 * Aggregate campaign data by date
 */
export const aggregateDataByDate = (
  data: CampaignDataRow[],
  showDebugInfo = false
): TimeSeriesDataPoint[] => {
  if (showDebugInfo) {
    console.log('Starting time series aggregation...');
  }

  const dateGroups = new Map<string, {
    date: string;
    IMPRESSIONS: number;
    CLICKS: number;
    REVENUE: number;
    TRANSACTIONS: number;
    SPEND: number;
  }>();

  // Single pass aggregation for performance
  for (let index = 0; index < data.length; index++) {
    const row = data[index];
    if (!row?.DATE || row.DATE === 'Totals') {
      if (showDebugInfo && index < 5) {
        console.log('Skipping row:', row);
      }
      continue;
    }

    const dateStr = String(row.DATE).trim();
    let dateGroup = dateGroups.get(dateStr);

    if (!dateGroup) {
      dateGroup = {
        date: dateStr,
        IMPRESSIONS: 0,
        CLICKS: 0,
        REVENUE: 0,
        TRANSACTIONS: 0,
        SPEND: 0
      };
      dateGroups.set(dateStr, dateGroup);
    }

    // Fast numeric conversion and accumulation
    dateGroup.IMPRESSIONS += Number(row.IMPRESSIONS) || 0;
    dateGroup.CLICKS += Number(row.CLICKS) || 0;
    dateGroup.REVENUE += Number(row.REVENUE) || 0;
    dateGroup.TRANSACTIONS += Number(row.TRANSACTIONS) || 0;
    dateGroup.SPEND += Number(row.SPEND) || 0;
  }

  if (showDebugInfo) {
    console.log('Date groups created:', dateGroups.size);
  }

  // Convert Map to array, sort by date, and calculate metrics
  const result = Array.from(dateGroups.values())
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    })
    .map(group => ({
      ...group,
      CTR: calculateCTR(group.CLICKS, group.IMPRESSIONS),
      ROAS: calculateROAS(group.REVENUE, group.SPEND)
    }));

  if (showDebugInfo) {
    console.log('Final aggregated data:', result.length, 'entries');
  }

  return result;
};

/**
 * Calculate campaign totals from time series data
 */
export const calculateCampaignTotals = (
  timeSeriesData: TimeSeriesDataPoint[],
  showDebugInfo = false
): CampaignTotals => {
  if (showDebugInfo) {
    console.log('Calculating totals from timeSeriesData:', timeSeriesData.length, 'entries');
  }

  let impressions = 0;
  let clicks = 0;
  let revenue = 0;
  let transactions = 0;
  let spend = 0;

  // Fast accumulation without forEach for performance
  for (let i = 0; i < timeSeriesData.length; i++) {
    const day = timeSeriesData[i];
    impressions += day.IMPRESSIONS;
    clicks += day.CLICKS;
    revenue += day.REVENUE;
    transactions += day.TRANSACTIONS;
    spend += day.SPEND;
  }

  const ctr = calculateCTR(clicks, impressions);
  const roas = calculateROAS(revenue, spend);

  const totals = { impressions, clicks, ctr, revenue, transactions, spend, roas };

  if (showDebugInfo) {
    console.log('Final totals:', totals);
  }

  return totals;
};

/**
 * Calculate trends by comparing the last two data points
 */
export const calculateTrends = (timeSeriesData: TimeSeriesDataPoint[]): TrendData => {
  if (timeSeriesData.length < 2) {
    return {
      impressions: 0,
      clicks: 0,
      ctr: 0,
      revenue: 0,
      transactions: 0,
      roas: 0
    };
  }

  const last = timeSeriesData[timeSeriesData.length - 1];
  const secondLast = timeSeriesData[timeSeriesData.length - 2];

  const lastCTR = calculateCTR(last.CLICKS, last.IMPRESSIONS);
  const secondLastCTR = calculateCTR(secondLast.CLICKS, secondLast.IMPRESSIONS);

  const lastROAS = calculateROAS(last.REVENUE, last.SPEND);
  const secondLastROAS = calculateROAS(secondLast.REVENUE, secondLast.SPEND);

  return {
    impressions: calculatePercentChange(last.IMPRESSIONS, secondLast.IMPRESSIONS),
    clicks: calculatePercentChange(last.CLICKS, secondLast.CLICKS),
    ctr: calculatePercentChange(lastCTR, secondLastCTR),
    revenue: calculatePercentChange(last.REVENUE, secondLast.REVENUE),
    transactions: calculatePercentChange(last.TRANSACTIONS, secondLast.TRANSACTIONS),
    roas: calculatePercentChange(lastROAS, secondLastROAS)
  };
};

/**
 * Format numbers for display
 */
export const formatters = {
  number: (value: number): string => value.toLocaleString(),
  revenue: (value: number): string => `$${Math.round(value).toLocaleString()}`,
  ctr: (value: number): string => `${value.toFixed(2)}%`,
  roas: (value: number): string => value.toFixed(2),
  percentage: (value: number): string => `${value.toFixed(1)}%`
};

/**
 * Filter campaigns by various criteria
 */
export const filterCampaigns = (
  data: CampaignDataRow[],
  criteria: {
    campaigns?: string[];
    advertisers?: string[];
    agencies?: string[];
    excludeTestCampaigns?: boolean;
  }
): CampaignDataRow[] => {
  return data.filter(row => {
    // Add filtering logic here based on criteria
    // This would integrate with the existing campaign filtering logic
    return true;
  });
};