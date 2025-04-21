import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number, options: { 
  decimals?: number, 
  prefix?: string,
  suffix?: string,
  abbreviate?: boolean 
} = {}): string {
  const { 
    decimals = 0, 
    prefix = '', 
    suffix = '',
    abbreviate = true
  } = options;
  
  if (abbreviate) {
    if (value >= 1000000) {
      return `${prefix}${(value / 1000000).toFixed(1)}M${suffix}`;
    } else if (value >= 1000) {
      return `${prefix}${(value / 1000).toFixed(1)}K${suffix}`;
    }
  }
  
  // Round to specified decimal places and add commas
  return `${prefix}${value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${suffix}`;
}

/**
 * Creates a consistent date object from various date formats
 * Ensures that we handle strings, Date objects, and timezones properly
 */
export function createConsistentDate(date: Date | string): Date {
  if (!date) throw new Error('Date cannot be empty');
  
  if (typeof date === 'string') {
    // Handle MM/DD/YYYY format explicitly
    const mdyMatch = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdyMatch) {
      const month = parseInt(mdyMatch[1], 10) - 1; // JS months are 0-indexed
      const day = parseInt(mdyMatch[2], 10);
      const year = parseInt(mdyMatch[3], 10);
      // Create date at noon to avoid timezone issues
      return new Date(year, month, day, 12, 0, 0);
    }
    
    // Handle YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split('-').map(Number);
      return new Date(year, month - 1, day, 12, 0, 0);
    }
    
    // For other formats, parse but set to noon
    const parsedDate = new Date(date);
    return new Date(
      parsedDate.getFullYear(),
      parsedDate.getMonth(),
      parsedDate.getDate(),
      12, 0, 0
    );
  }
  
  // If it's already a Date, reset time to noon
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12, 0, 0
  );
}

// Utility function to standardize date handling without timezone complications
export function normalizeDate(date: Date | string): string {
  if (!date) return '';
  
  try {
    // Use the consistent date creation function
    const dateObj = createConsistentDate(date);
    
    // Extract date components without timezone adjustments
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error(`Error normalizing date ${date}:`, error);
    return '';
  }
}

// Helper for consistent date comparison
export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  if (!date1 || !date2) return false;
  
  try {
    const d1 = normalizeDate(date1);
    const d2 = normalizeDate(date2);
    return d1 === d2;
  } catch (error) {
    console.error(`Error comparing dates ${date1} and ${date2}:`, error);
    return false;
  }
}

// Helper to set time to end of day (23:59:59.999) for inclusive comparison
export function setToEndOfDay(date: Date): Date {
  const result = createConsistentDate(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

// Helper to set time to start of day (00:00:00.000)
export function setToStartOfDay(date: Date): Date {
  const result = createConsistentDate(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

// Helper to log date details for debugging
export function logDateDetails(label: string, date: Date | string, extraInfo: string = ''): void {
  try {
    const dateObj = typeof date === 'string' ? createConsistentDate(date) : date;
    if (isNaN(dateObj.getTime())) {
      console.error(`${label}: Invalid date: ${date} ${extraInfo}`);
      return;
    }
    
    console.log(`${label}: ${dateObj.toISOString()} (${dateObj.toLocaleString()}) ${extraInfo}`);
    console.log(`  - Year: ${dateObj.getFullYear()}, Month: ${dateObj.getMonth() + 1}, Day: ${dateObj.getDate()}`);
  } catch (error) {
    console.error(`Error logging date ${date}:`, error);
  }
}

// Improved function to parse CSV dates while preserving MM/DD/YYYY format
export function parseCsvDate(dateStr: string): string {
  if (!dateStr) return '';
  
  try {
    const trimmedDateStr = String(dateStr).trim();
    
    // Handle MM/DD/YYYY format - return as is
    const mdyMatch = trimmedDateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdyMatch) {
      const month = String(parseInt(mdyMatch[1], 10)).padStart(2, '0');
      const day = String(parseInt(mdyMatch[2], 10)).padStart(2, '0');
      const year = mdyMatch[3];
      return `${month}/${day}/${year}`;
    }
    
    // Handle YYYY-MM-DD format - convert to MM/DD/YYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDateStr)) {
      const [year, month, day] = trimmedDateStr.split('-');
      return `${month}/${day}/${year}`;
    }
    
    // For other formats, try to parse and format as MM/DD/YYYY
    const date = new Date(trimmedDateStr);
    if (!isNaN(date.getTime())) {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    }
    
    console.error(`Could not parse date string: "${trimmedDateStr}"`);
    return '';
  } catch (error) {
    console.error(`Error parsing CSV date "${dateStr}":`, error);
    return '';
  }
}

/**
 * Format date consistently as MM/DD/YYYY for display
 */
export function formatDateToDisplay(date: Date | string): string {
  if (!date) return '';
  
  try {
    // If it's already in MM/DD/YYYY format, return as is
    if (typeof date === 'string') {
      const mdyMatch = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (mdyMatch) return date;
    }
    
    // Use consistent date creation to handle timezone issues
    const dateObj = createConsistentDate(date);
    
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    const year = dateObj.getFullYear();
    
    return `${month}/${day}/${year}`;
  } catch (error) {
    console.error(`Error formatting date ${date}:`, error);
    return '';
  }
}

/**
 * Convert MM/DD/YYYY date string to comparable number format (YYYYMMDD)
 */
export function dateToComparableNumber(dateStr: string): number {
  if (!dateStr) return 0;
  
  try {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return 0;
    
    const month = parts[0].padStart(2, '0');
    const day = parts[1].padStart(2, '0');
    const year = parts[2];
    
    return parseInt(`${year}${month}${day}`);
  } catch (error) {
    console.error(`Error converting date ${dateStr} to comparable number:`, error);
    return 0;
  }
}
