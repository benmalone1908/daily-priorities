
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
    // Handle YYYY-MM-DD format explicitly to avoid timezone issues
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split('-').map(Number);
      // Create date at noon to avoid timezone issues
      return new Date(year, month - 1, day, 12, 0, 0);
    }
    
    // Handle MM/DD/YYYY format explicitly
    const mdyMatch = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdyMatch) {
      const month = parseInt(mdyMatch[1], 10) - 1; // JS months are 0-indexed
      const day = parseInt(mdyMatch[2], 10);
      const year = parseInt(mdyMatch[3], 10);
      return new Date(year, month, day, 12, 0, 0);
    }
    
    // For other formats, use standard parsing but set to noon
    const parsedDate = new Date(date);
    // Reset time to noon to avoid timezone issues
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

/**
 * Improved function to parse date strings from CSV without timezone issues
 * Handles multiple formats including MM/DD/YYYY and YYYY-MM-DD
 */
export function parseCsvDate(dateStr: string): string {
  if (!dateStr) return '';
  
  try {
    // Ensure string
    const trimmedDateStr = String(dateStr).trim();
    console.log(`Parsing CSV date: "${trimmedDateStr}"`);
    
    // Handle MM/DD/YYYY format (most common in CSV files)
    const mdyMatch = trimmedDateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdyMatch) {
      const month = String(parseInt(mdyMatch[1], 10)).padStart(2, '0');
      const day = String(parseInt(mdyMatch[2], 10)).padStart(2, '0');
      const year = mdyMatch[3];
      const normalized = `${year}-${month}-${day}`;
      console.log(`Parsed MM/DD/YYYY: "${trimmedDateStr}" -> "${normalized}"`);
      return normalized;
    }
    
    // Handle YYYY-MM-DD format (directly return)
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDateStr)) {
      console.log(`Already in YYYY-MM-DD format: "${trimmedDateStr}"`);
      return trimmedDateStr;
    }
    
    // Handle DD-MM-YYYY or DD.MM.YYYY format
    const dmyMatch = trimmedDateStr.match(/^(\d{1,2})[.-](\d{1,2})[.-](\d{4})$/);
    if (dmyMatch) {
      const day = String(parseInt(dmyMatch[1], 10)).padStart(2, '0');
      const month = String(parseInt(dmyMatch[2], 10)).padStart(2, '0');
      const year = dmyMatch[3];
      const normalized = `${year}-${month}-${day}`;
      console.log(`Parsed DD-MM-YYYY: "${trimmedDateStr}" -> "${normalized}"`);
      return normalized;
    }
    
    // Last resort - try standard parsing but be careful with timezone
    try {
      const date = new Date(trimmedDateStr);
      if (!isNaN(date.getTime())) {
        // Create a string in YYYY-MM-DD format from local date components
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const normalized = `${year}-${month}-${day}`;
        console.log(`Parsed with standard Date: "${trimmedDateStr}" -> "${normalized}"`);
        return normalized;
      }
    } catch (e) {
      console.error(`Standard date parsing failed for "${trimmedDateStr}":`, e);
    }
    
    console.error(`Could not parse date string: "${trimmedDateStr}"`);
    return '';
  } catch (error) {
    console.error(`Error parsing CSV date "${dateStr}":`, error);
    return '';
  }
}

/**
 * Format date to MM/DD/YYYY for consistent display
 */
export function formatDateToDisplay(date: Date | string): string {
  if (!date) return '';
  
  try {
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
