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
  
  return `${prefix}${value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${suffix}`;
}

function parseDateString(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  try {
    const parts = dateStr.split('/');
    if (parts.length !== 3) {
      console.warn(`Invalid date format: ${dateStr} - expected MM/DD/YYYY`);
      return null;
    }
    
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    if (isNaN(month) || isNaN(day) || isNaN(year)) {
      console.warn(`Invalid date parts: month=${parts[0]}, day=${parts[1]}, year=${parts[2]}`);
      return null;
    }
    
    if (month < 1 || month > 12) {
      console.warn(`Invalid month: ${month}`);
      return null;
    }
    if (day < 1 || day > 31) {
      console.warn(`Invalid day: ${day}`);
      return null;
    }
    
    const date = new Date(year, month - 1, day, 12, 0, 0, 0);
    
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date created from: ${dateStr}`);
      return null;
    }
    
    console.log(`Parsed date string: ${dateStr} -> ${date.toISOString()}`);
    return date;
  } catch (error) {
    console.error(`Error parsing date string: ${dateStr}`, error);
    return null;
  }
}

export function normalizeDate(date: Date | string): string {
  if (!date) return '';
  
  try {
    let dateObj: Date | null;
    
    if (typeof date === 'string') {
      dateObj = parseDateString(date);
      
      if (!dateObj) {
        dateObj = new Date(date);
      }
    } else {
      dateObj = date;
    }
    
    if (!dateObj || isNaN(dateObj.getTime())) {
      console.error(`Invalid date: ${date}`);
      return '';
    }
    
    const month = String(dateObj.getMonth() + 1);
    const day = String(dateObj.getDate());
    const year = dateObj.getFullYear();
    
    return `${month}/${day}/${year}`;
  } catch (error) {
    console.error(`Error normalizing date ${date}:`, error);
    return '';
  }
}

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

export function setToEndOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function setToStartOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

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

export function createConsistentDate(date: Date | string): Date {
  if (!date) throw new Error('Date cannot be empty');
  
  if (typeof date === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Date(`${date}T12:00:00`);
    }
    return new Date(date);
  }
  return date;
}
