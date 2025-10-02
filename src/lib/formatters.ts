/**
 * Centralized formatting utilities for the Campaign Trends application
 * Consolidates duplicate formatting functions from multiple components
 */

export interface NumberFormatOptions {
  decimals?: number;
  compact?: boolean;
  fallback?: string;
}

export interface CurrencyFormatOptions {
  compact?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export interface PercentageFormatOptions {
  decimals?: number;
  multipliedBy100?: boolean;
}

/**
 * Formats numbers with locale support and optional compact notation
 * Consolidates various formatNumber implementations across components
 */
export const formatNumber = (
  value: number | undefined | null,
  options: NumberFormatOptions = {}
): string => {
  const { decimals = 0, compact = false, fallback = '0' } = options;

  if (value === undefined || value === null || isNaN(value)) {
    return fallback;
  }

  try {
    if (compact) {
      // Compact formatting (K, M, B)
      if (Math.abs(value) >= 1000000000) {
        return (value / 1000000000).toFixed(1) + 'B';
      } else if (Math.abs(value) >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M';
      } else if (Math.abs(value) >= 1000) {
        return (value / 1000).toFixed(1) + 'K';
      }
      return value.toFixed(decimals);
    }

    // Standard locale formatting
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  } catch (error) {
    console.error('Error formatting number:', error);
    return fallback;
  }
};

/**
 * Formats currency values with locale support
 * Consolidates various formatCurrency implementations across components
 */
export const formatCurrency = (
  value: number | undefined | null,
  options: CurrencyFormatOptions = {}
): string => {
  const {
    compact = false,
    minimumFractionDigits = 0,
    maximumFractionDigits = 2
  } = options;

  if (value === undefined || value === null || isNaN(value)) {
    return '$0';
  }

  try {
    if (compact) {
      // Simple compact format for some components
      return `$${Math.round(value).toLocaleString()}`;
    }

    // Standard currency formatting
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits,
      maximumFractionDigits
    }).format(value);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return '$0';
  }
};

/**
 * Formats percentage values
 * Consolidates various formatPercentage implementations across components
 */
export const formatPercentage = (
  value: number | undefined | null,
  options: PercentageFormatOptions = {}
): string => {
  const { decimals = 1, multipliedBy100 = false } = options;

  if (value === undefined || value === null || isNaN(value)) {
    return '0%';
  }

  try {
    const percentage = multipliedBy100 ? value : value * 100;
    return `${percentage.toFixed(decimals)}%`;
  } catch (error) {
    console.error('Error formatting percentage:', error);
    return '0%';
  }
};

/**
 * Formats CTR (Click-Through Rate) values
 * Specific formatting for CTR metrics
 */
export const formatCTR = (clicks: number, impressions: number): string => {
  if (!impressions || impressions === 0) return '0.00%';
  const ctr = (clicks / impressions) * 100;
  return `${ctr.toFixed(2)}%`;
};

/**
 * Formats pre-calculated CTR percentage values
 * For when CTR is already calculated as a percentage
 */
export const formatCTRPercentage = (ctrPercentage: number | undefined | null): string => {
  if (ctrPercentage === undefined || ctrPercentage === null || isNaN(ctrPercentage)) {
    return '0.00%';
  }
  return `${ctrPercentage.toFixed(2)}%`;
};

/**
 * Formats transaction numbers (just the number, without "transactions" label)
 */
export const formatTransactions = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0';
  }

  const rounded = Math.round(value);
  return formatNumber(rounded);
};

/**
 * Formats Average Order Value (AOV)
 */
export const formatAOV = (revenue: number, transactions: number): string => {
  if (!transactions || transactions === 0) return '$0.00';
  const aov = revenue / transactions;
  return formatCurrency(aov, { maximumFractionDigits: 2 });
};

/**
 * Formats pre-calculated AOV values
 * For when AOV is already calculated
 */
export const formatAOVValue = (aovValue: number | undefined | null): string => {
  if (aovValue === undefined || aovValue === null || isNaN(aovValue)) {
    return '$0.00';
  }
  return formatCurrency(aovValue, { maximumFractionDigits: 2 });
};

/**
 * Formats ROAS (Return on Ad Spend) values
 */
export const formatROAS = (revenue: number, spend: number): string => {
  if (!spend || spend === 0) return '0.00x';
  const roas = revenue / spend;
  return `${roas.toFixed(2)}x`;
};

/**
 * Formats large numbers for display in UI
 * Automatically chooses appropriate format based on value size
 */
export const formatDisplayNumber = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0';
  }

  // Use compact formatting for large numbers
  if (Math.abs(value) >= 1000) {
    return formatNumber(value, { compact: true });
  }

  // Use standard formatting for smaller numbers
  return formatNumber(value);
};

/**
 * Safe number conversion with fallback
 */
export const safeNumber = (value: string | number | undefined | null, fallback: number = 0): number => {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return isNaN(parsed) ? fallback : parsed;
  }

  return fallback;
};

/**
 * Formats dates in a consistent format across the application
 */
export const formatDisplayDate = (date: Date | string | undefined | null): string => {
  if (!date) return 'Unknown';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

// Re-export common formatting combinations for convenience
export const commonFormatters = {
  number: (value: number) => formatNumber(value),
  compactNumber: (value: number) => formatNumber(value, { compact: true }),
  currency: (value: number) => formatCurrency(value),
  percentage: (value: number) => formatPercentage(value),
  ctr: formatCTR,
  roas: formatROAS,
  aov: formatAOV,
  transactions: formatTransactions,
  display: formatDisplayNumber,
  date: formatDisplayDate
};