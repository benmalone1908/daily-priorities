import { parseDateString, formatDateSortable } from "@/lib/utils";

/**
 * Get complete date range from campaign data
 * Creates an array of all dates between min and max dates in the data
 */
export const getCompleteDateRange = (data: { DATE: string }[]): Date[] => {
  const dates = data
    .map(row => row.DATE)
    .filter(date => date && date !== 'Totals')
    .map(dateStr => parseDateString(dateStr))
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

/**
 * Fill missing dates with zero values for aggregated time series data
 * Ensures continuous trend lines in charts by filling gaps
 */
export const fillMissingDatesForAggregated = <T extends { date: string }>(
  timeSeriesData: T[],
  allDates: Date[]
): T[] => {
  // If no data, return empty array
  if (timeSeriesData.length === 0 || allDates.length === 0) return timeSeriesData;

  // Create a map of existing data by date string
  const dataByDate = new Map<string, T>();
  timeSeriesData.forEach(item => {
    if (item.date) {
      dataByDate.set(item.date, item);
    }
  });

  // Find the actual range of dates that have data
  const datesWithData = timeSeriesData
    .map(item => parseDateString(item.date))
    .filter(Boolean)
    .sort((a, b) => a!.getTime() - b!.getTime());

  if (datesWithData.length === 0) return timeSeriesData;

  const firstDataDate = datesWithData[0]!;
  const lastDataDate = datesWithData[datesWithData.length - 1]!;

  // Generate complete time series only within the data range
  const result: T[] = [];
  for (const date of allDates) {
    if (date >= firstDataDate && date <= lastDataDate) {
      const dateStr = formatDateSortable(date);
      const existingData = dataByDate.get(dateStr);

      if (existingData) {
        result.push(existingData);
      } else {
        // Fill gap with zero values - cast as T for type safety
        result.push({
          date: dateStr,
          IMPRESSIONS: 0,
          CLICKS: 0,
          REVENUE: 0,
          TRANSACTIONS: 0,
          SPEND: 0,
          CTR: 0,
          ROAS: 0
        } as T);
      }
    }
  }

  return result;
};

/**
 * Calculate percentage change between two values
 */
export const calculatePercentChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

/**
 * Check if a date is within a date range
 */
export const isDateInRange = (
  date: Date,
  range: { from?: Date; to?: Date }
): boolean => {
  const { from, to } = range;

  if (from && date < from) return false;
  if (to && date > to) return false;

  return true;
};

/**
 * Get the start and end of today for filtering
 */
export const getTodayRange = () => {
  const today = new Date();
  return {
    start: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
  };
};

/**
 * Format date ranges for display
 */
export const formatDateRange = (from?: Date, to?: Date): string => {
  if (!from && !to) return "All time";
  if (from && !to) return `From ${from.toLocaleDateString()}`;
  if (!from && to) return `Until ${to.toLocaleDateString()}`;
  if (from && to) return `${from.toLocaleDateString()} - ${to.toLocaleDateString()}`;
  return "";
};