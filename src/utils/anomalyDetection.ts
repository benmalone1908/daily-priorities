export interface CampaignAnomaly {
  id?: string;
  campaign_name: string;
  anomaly_type: 'impression_change' | 'transaction_drop' | 'transaction_zero';
  date_detected: string; // YYYY-MM-DD format
  severity: 'high' | 'medium' | 'low';
  details: {
    previous_value?: number;
    current_value?: number;
    percentage_change?: number;
    consecutive_days?: number;
    threshold_exceeded?: number;
  };
  is_ignored: boolean;
  custom_duration?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CampaignDataRow {
  DATE: string;
  "CAMPAIGN ORDER NAME": string;
  IMPRESSIONS: number;
  CLICKS: number;
  REVENUE: number;
  SPEND: number;
  TRANSACTIONS?: number;
}

/**
 * Detects day-over-day impression changes of 20% or more
 */
export function detectImpressionAnomalies(
  data: CampaignDataRow[],
  thresholdPercentage: number = 20
): CampaignAnomaly[] {
  const anomalies: CampaignAnomaly[] = [];

  // Find the most recent date in the data to exclude it (likely incomplete)
  const validDates = data
    .filter(row => row.DATE !== 'Totals' && row.DATE)
    .map(row => row.DATE)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const mostRecentDate = validDates.length > 0 ? validDates[0] : null;

  // Group data by campaign
  const campaignGroups = data.reduce((acc, row) => {
    const campaignName = row["CAMPAIGN ORDER NAME"];
    if (!acc[campaignName]) {
      acc[campaignName] = [];
    }
    acc[campaignName].push(row);
    return acc;
  }, {} as Record<string, CampaignDataRow[]>);

  // Check each campaign for impression anomalies
  Object.entries(campaignGroups).forEach(([campaignName, campaignData]) => {
    // Sort by date and exclude most recent day's data (likely incomplete)
    const sortedData = campaignData
      .filter(row => row.DATE !== 'Totals' && row.DATE !== mostRecentDate)
      .sort((a, b) => new Date(a.DATE).getTime() - new Date(b.DATE).getTime());

    // Compare consecutive days
    for (let i = 1; i < sortedData.length; i++) {
      const currentDay = sortedData[i];
      const previousDay = sortedData[i - 1];

      const currentImpressions = Number(currentDay.IMPRESSIONS) || 0;
      const previousImpressions = Number(previousDay.IMPRESSIONS) || 0;

      // Skip if previous day had zero impressions (avoid division by zero)
      if (previousImpressions === 0) continue;

      const percentageChange = ((currentImpressions - previousImpressions) / previousImpressions) * 100;
      const absoluteChange = Math.abs(percentageChange);

      if (absoluteChange >= thresholdPercentage) {
        // Determine severity based on percentage change
        let severity: 'high' | 'medium' | 'low' = 'low';
        if (absoluteChange >= 50) severity = 'high';
        else if (absoluteChange >= 35) severity = 'medium';

        anomalies.push({
          campaign_name: campaignName,
          anomaly_type: 'impression_change',
          date_detected: currentDay.DATE,
          severity,
          details: {
            previous_value: previousImpressions,
            current_value: currentImpressions,
            percentage_change: Math.round(percentageChange * 100) / 100,
            threshold_exceeded: absoluteChange
          },
          is_ignored: false
        });
      }
    }
  });

  return anomalies;
}

/**
 * Detects transaction drops of 90% or more
 */
export function detectTransactionDropAnomalies(
  data: CampaignDataRow[],
  thresholdPercentage: number = 90
): CampaignAnomaly[] {
  const anomalies: CampaignAnomaly[] = [];

  // Find the most recent date in the data to exclude it (likely incomplete)
  const validDates = data
    .filter(row => row.DATE !== 'Totals' && row.DATE)
    .map(row => row.DATE)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const mostRecentDate = validDates.length > 0 ? validDates[0] : null;

  // Group data by campaign
  const campaignGroups = data.reduce((acc, row) => {
    const campaignName = row["CAMPAIGN ORDER NAME"];
    if (!acc[campaignName]) {
      acc[campaignName] = [];
    }
    acc[campaignName].push(row);
    return acc;
  }, {} as Record<string, CampaignDataRow[]>);

  // Check each campaign for transaction drop anomalies
  Object.entries(campaignGroups).forEach(([campaignName, campaignData]) => {
    // Sort by date and exclude most recent day's data (likely incomplete)
    const sortedData = campaignData
      .filter(row => row.DATE !== 'Totals' && row.DATE !== mostRecentDate)
      .sort((a, b) => new Date(a.DATE).getTime() - new Date(b.DATE).getTime());

    // Compare consecutive days
    for (let i = 1; i < sortedData.length; i++) {
      const currentDay = sortedData[i];
      const previousDay = sortedData[i - 1];

      const currentTransactions = Number(currentDay.TRANSACTIONS) || 0;
      const previousTransactions = Number(previousDay.TRANSACTIONS) || 0;

      // Skip if previous day had zero transactions (avoid division by zero)
      if (previousTransactions === 0) continue;

      const percentageChange = ((currentTransactions - previousTransactions) / previousTransactions) * 100;
      const percentageDrop = Math.abs(percentageChange);

      // Only flag drops (negative percentage change)
      if (percentageChange < 0 && percentageDrop >= thresholdPercentage) {
        anomalies.push({
          campaign_name: campaignName,
          anomaly_type: 'transaction_drop',
          date_detected: currentDay.DATE,
          severity: 'high', // Transaction drops are always high severity
          details: {
            previous_value: previousTransactions,
            current_value: currentTransactions,
            percentage_change: Math.round(percentageChange * 100) / 100,
            threshold_exceeded: percentageDrop
          },
          is_ignored: false
        });
      }
    }
  });

  return anomalies;
}

/**
 * Detects campaigns with zero transactions for consecutive days
 */
export function detectZeroTransactionAnomalies(
  data: CampaignDataRow[],
  consecutiveDaysThreshold: number = 2
): CampaignAnomaly[] {
  const anomalies: CampaignAnomaly[] = [];

  // Find the most recent date in the data to exclude it (likely incomplete)
  const validDates = data
    .filter(row => row.DATE !== 'Totals' && row.DATE)
    .map(row => row.DATE)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const mostRecentDate = validDates.length > 0 ? validDates[0] : null;

  // Group data by campaign
  const campaignGroups = data.reduce((acc, row) => {
    const campaignName = row["CAMPAIGN ORDER NAME"];
    if (!acc[campaignName]) {
      acc[campaignName] = [];
    }
    acc[campaignName].push(row);
    return acc;
  }, {} as Record<string, CampaignDataRow[]>);

  // Check each campaign for consecutive zero transaction days
  Object.entries(campaignGroups).forEach(([campaignName, campaignData]) => {
    // Sort by date and exclude most recent day's data (likely incomplete)
    const sortedData = campaignData
      .filter(row => row.DATE !== 'Totals' && row.DATE !== mostRecentDate)
      .sort((a, b) => new Date(a.DATE).getTime() - new Date(b.DATE).getTime());

    let consecutiveZeroDays = 0;
    let zeroStreakStart: string | null = null;

    sortedData.forEach((day, index) => {
      const transactions = Number(day.TRANSACTIONS) || 0;

      if (transactions === 0) {
        if (consecutiveZeroDays === 0) {
          zeroStreakStart = day.DATE;
        }
        consecutiveZeroDays++;

        // Check if we've hit the threshold and this is the end of data or next day has transactions
        const isEndOfData = index === sortedData.length - 1;
        const nextDayHasTransactions = !isEndOfData && (Number(sortedData[index + 1].TRANSACTIONS) || 0) > 0;

        if (consecutiveZeroDays >= consecutiveDaysThreshold && (isEndOfData || nextDayHasTransactions)) {
          // Determine severity based on consecutive days
          let severity: 'high' | 'medium' | 'low' = 'medium';
          if (consecutiveZeroDays >= 7) severity = 'high';
          else if (consecutiveZeroDays >= 4) severity = 'medium';
          else severity = 'low';

          anomalies.push({
            campaign_name: campaignName,
            anomaly_type: 'transaction_zero',
            date_detected: day.DATE, // Use the last day of the streak
            severity,
            details: {
              consecutive_days: consecutiveZeroDays,
              threshold_exceeded: consecutiveZeroDays
            },
            is_ignored: false
          });
        }
      } else {
        // Reset counter when transactions are found
        consecutiveZeroDays = 0;
        zeroStreakStart = null;
      }
    });
  });

  return anomalies;
}

/**
 * Main function to detect all types of anomalies
 */
export function detectAllAnomalies(
  data: CampaignDataRow[],
  options: {
    impressionThreshold?: number;
    transactionDropThreshold?: number;
    zeroTransactionDays?: number;
  } = {}
): CampaignAnomaly[] {
  const {
    impressionThreshold = 20,
    transactionDropThreshold = 90,
    zeroTransactionDays = 2
  } = options;

  const impressionAnomalies = detectImpressionAnomalies(data, impressionThreshold);
  const transactionDropAnomalies = detectTransactionDropAnomalies(data, transactionDropThreshold);
  const zeroTransactionAnomalies = detectZeroTransactionAnomalies(data, zeroTransactionDays);

  // Combine all anomalies and sort by date (most recent first)
  const allAnomalies = [
    ...impressionAnomalies,
    ...transactionDropAnomalies,
    ...zeroTransactionAnomalies
  ].sort((a, b) => new Date(b.date_detected).getTime() - new Date(a.date_detected).getTime());

  return allAnomalies;
}

/**
 * Helper function to format anomaly details for display
 */
export function formatAnomalyMessage(anomaly: CampaignAnomaly): string {
  switch (anomaly.anomaly_type) {
    case 'impression_change': {
      const changeDirection = (anomaly.details.percentage_change || 0) > 0 ? 'increased' : 'decreased';
      return `Impressions ${changeDirection} by ${Math.abs(anomaly.details.percentage_change || 0)}% (${anomaly.details.previous_value?.toLocaleString()} → ${anomaly.details.current_value?.toLocaleString()})`;
    }
    case 'transaction_drop':
      return `Transactions dropped by ${Math.abs(anomaly.details.percentage_change || 0)}% (${anomaly.details.previous_value} → ${anomaly.details.current_value})`;

    case 'transaction_zero':
      return `Zero transactions for ${anomaly.details.consecutive_days} consecutive day${(anomaly.details.consecutive_days || 0) > 1 ? 's' : ''}`;

    default:
      return 'Unknown anomaly type';
  }
}

/**
 * Helper function to get anomaly type display name
 */
export function getAnomalyTypeDisplayName(type: CampaignAnomaly['anomaly_type']): string {
  switch (type) {
    case 'impression_change':
      return 'Impression Change';
    case 'transaction_drop':
      return 'Transaction Drop';
    case 'transaction_zero':
      return 'Zero Transactions';
    default:
      return 'Unknown';
  }
}

/**
 * Helper function to get severity color
 */
export function getSeverityColor(severity: CampaignAnomaly['severity']): string {
  switch (severity) {
    case 'high':
      return 'text-red-600 bg-red-50';
    case 'medium':
      return 'text-yellow-600 bg-yellow-50';
    case 'low':
      return 'text-blue-600 bg-blue-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}