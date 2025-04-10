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

// Utility function to standardize date handling without timezone complications
export function normalizeDate(date: Date | string): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) {
      console.error(`Invalid date: ${date}`);
      return '';
    }
    
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
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

// Helper to set time to start of day (00:00:00.000)
export function setToStartOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

// Helper to log date details for debugging
export function logDateDetails(label: string, date: Date | string, extraInfo: string = ''): void {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) {
      console.error(`${label}: Invalid date: ${date} ${extraInfo}`);
      return;
    }
    
    console.log(`${label}: ${dateObj.toISOString()} (${dateObj.toLocaleString()}) ${extraInfo}`);
  } catch (error) {
    console.error(`Error logging date ${date}:`, error);
  }
}

// Helper to create a date object that correctly handles different formats
export function createConsistentDate(date: Date | string): Date {
  if (!date) throw new Error('Date cannot be empty');
  
  if (typeof date === 'string') {
    // Handle YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // Create date at noon to avoid timezone issues
      return new Date(`${date}T12:00:00`);
    }
    return new Date(date);
  }
  return date;
}

// Improved function to parse date strings from CSV without timezone issues
export function parseCsvDate(dateStr: string): string {
  if (!dateStr) return '';
  
  try {
    // Ensure string
    const trimmedDateStr = String(dateStr).trim();
    
    // Handle MM/DD/YYYY format (most common in CSV files)
    const mdyMatch = trimmedDateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdyMatch) {
      const month = String(parseInt(mdyMatch[1], 10)).padStart(2, '0');
      const day = String(parseInt(mdyMatch[2], 10)).padStart(2, '0');
      const year = mdyMatch[3];
      return `${year}-${month}-${day}`;
    }
    
    // Handle YYYY-MM-DD format (directly return)
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDateStr)) {
      return trimmedDateStr;
    }
    
    // Handle DD-MM-YYYY or DD.MM.YYYY format
    const dmyMatch = trimmedDateStr.match(/^(\d{1,2})[.-](\d{1,2})[.-](\d{4})$/);
    if (dmyMatch) {
      const day = String(parseInt(dmyMatch[1], 10)).padStart(2, '0');
      const month = String(parseInt(dmyMatch[2], 10)).padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }
    
    // Last resort - try standard parsing but be careful with timezone
    const date = new Date(trimmedDateStr);
    if (!isNaN(date.getTime())) {
      // Create a string in YYYY-MM-DD format from local date components
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    console.error(`Could not parse date string: ${trimmedDateStr}`);
    return '';
  } catch (error) {
    console.error(`Error parsing CSV date ${dateStr}:`, error);
    return '';
  }
}

// Format date to MM/DD/YYYY
export function formatDateToDisplay(date: Date | string): string {
  if (!date) return '';
  
  try {
    let dateObj: Date;
    
    if (typeof date === 'string') {
      // If it's already in YYYY-MM-DD format, parse it directly
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-').map(Number);
        dateObj = new Date(year, month - 1, day);
      } else {
        // Otherwise try standard parsing
        dateObj = new Date(date);
      }
    } else {
      dateObj = date;
    }
    
    if (isNaN(dateObj.getTime())) {
      console.error(`Invalid date for formatting: ${date}`);
      return '';
    }
    
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    const year = dateObj.getFullYear();
    
    return `${month}/${day}/${year}`;
  } catch (error) {
    console.error(`Error formatting date ${date}:`, error);
    return '';
  }
}
