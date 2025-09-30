/**
 * Dashboard calculation utilities
 * Extracted from Dashboard.tsx for better maintainability and reusability
 */

/**
 * Calculate ROAS (Return on Ad Spend) from revenue and impressions
 */
export const calculateROAS = (revenue: number, impressions: number): number => {
  if (impressions === 0) return 0;
  return (revenue / impressions) * 1000;
};

/**
 * Calculate CTR (Click-Through Rate) from clicks and impressions
 */
export const calculateCTR = (clicks: number, impressions: number): number => {
  if (impressions === 0) return 0;
  return (clicks / impressions) * 100;
};

/**
 * Calculate AOV (Average Order Value) from revenue and transactions
 */
export const calculateAOV = (revenue: number, transactions: number): number => {
  if (transactions === 0) return 0;
  return revenue / transactions;
};

/**
 * Calculate percentage change between two values
 */
export const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

/**
 * Determine trend direction and styling based on percentage change
 */
export const getTrendInfo = (percentChange: number, isPositiveGood: boolean = true) => {
  const isPositive = percentChange > 0;
  const isGoodTrend = isPositiveGood ? isPositive : !isPositive;

  return {
    isPositive,
    isGoodTrend,
    colorClasses: isGoodTrend
      ? "text-green-600"
      : "text-red-600",
    bgColorClasses: isGoodTrend
      ? "bg-green-50 border-green-200"
      : "bg-red-50 border-red-200"
  };
};

/**
 * Calculate metrics for a data period
 */
export const calculatePeriodMetrics = (data: any[]) => {
  if (!data || data.length === 0) {
    return {
      impressions: 0,
      clicks: 0,
      revenue: 0,
      transactions: 0,
      ctr: 0,
      roas: 0,
      aov: 0
    };
  }

  const totals = data.reduce((acc, row) => ({
    impressions: acc.impressions + (Number(row.IMPRESSIONS) || 0),
    clicks: acc.clicks + (Number(row.CLICKS) || 0),
    revenue: acc.revenue + (Number(row.REVENUE) || 0),
    transactions: acc.transactions + (Number(row.TRANSACTIONS) || 0)
  }), { impressions: 0, clicks: 0, revenue: 0, transactions: 0 });

  return {
    ...totals,
    ctr: calculateCTR(totals.clicks, totals.impressions),
    roas: calculateROAS(totals.revenue, totals.impressions),
    aov: calculateAOV(totals.revenue, totals.transactions)
  };
};

/**
 * Get data for a specific date range
 */
export const getDataForPeriod = (data: any[], startDate: Date, endDate: Date) => {
  return data.filter(row => {
    if (!row.DATE) return false;
    const rowDate = new Date(row.DATE);
    return rowDate >= startDate && rowDate <= endDate;
  });
};

/**
 * Get comparison period data
 */
export const getComparisonData = (data: any[], currentPeriod: any[], comparisonDays: number) => {
  if (!data || data.length === 0 || !currentPeriod || currentPeriod.length === 0) {
    return [];
  }

  // Find the date range of current period
  const currentDates = currentPeriod.map(row => new Date(row.DATE)).sort((a, b) => a.getTime() - b.getTime());
  const currentStart = currentDates[0];
  const currentEnd = currentDates[currentDates.length - 1];

  // Calculate previous period dates
  const periodLength = Math.abs(currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24);
  const previousEnd = new Date(currentStart.getTime() - (24 * 60 * 60 * 1000));
  const previousStart = new Date(previousEnd.getTime() - (periodLength * 24 * 60 * 60 * 1000));

  return getDataForPeriod(data, previousStart, previousEnd);
};

/**
 * Format date for consistent display
 */
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

/**
 * Get metric comparison data for dashboard cards
 */
export const getMetricComparison = (
  current: any[],
  previous: any[],
  metricKey: string
) => {
  const currentValue = current.reduce((sum, row) => sum + (Number(row[metricKey]) || 0), 0);
  const previousValue = previous.reduce((sum, row) => sum + (Number(row[metricKey]) || 0), 0);
  const percentChange = calculatePercentageChange(currentValue, previousValue);

  return {
    current: currentValue,
    previous: previousValue,
    percentChange,
    trend: getTrendInfo(percentChange, metricKey !== 'spend') // Spend decrease is good
  };
};