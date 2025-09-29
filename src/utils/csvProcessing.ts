import Papa from "papaparse";
import { CampaignDataRow } from "@/types/campaign";

/**
 * Required columns for campaign data CSV files
 */
export const REQUIRED_COLUMNS = [
  'DATE',
  'CAMPAIGN ORDER NAME',
  'IMPRESSIONS',
  'CLICKS',
  'REVENUE',
  'SPEND'
] as const;

/**
 * Optional columns that may be present in CSV files
 */
export const OPTIONAL_COLUMNS = [
  'TRANSACTIONS'
] as const;

/**
 * Validate that a CSV file contains all required columns
 */
export const validateCsvColumns = (headers: string[]): {
  isValid: boolean;
  missingColumns: string[]
} => {
  const missingColumns = REQUIRED_COLUMNS.filter(
    requiredCol => !headers.some(header =>
      header.trim().toLowerCase() === requiredCol.toLowerCase()
    )
  );

  return {
    isValid: missingColumns.length === 0,
    missingColumns
  };
};

/**
 * Clean and normalize CSV data
 * Removes empty rows, normalizes headers, converts numeric fields
 */
export const cleanCsvData = (rawData: Record<string, unknown>[]): CampaignDataRow[] => {
  return rawData
    .filter(row => {
      // Filter out empty rows and totals rows
      return row &&
             row.DATE &&
             row.DATE.trim() !== '' &&
             row.DATE.toLowerCase() !== 'totals' &&
             row['CAMPAIGN ORDER NAME'] &&
             row['CAMPAIGN ORDER NAME'].trim() !== '';
    })
    .map(row => ({
      DATE: String(row.DATE).trim(),
      'CAMPAIGN ORDER NAME': String(row['CAMPAIGN ORDER NAME']).trim(),
      IMPRESSIONS: Number(row.IMPRESSIONS) || 0,
      CLICKS: Number(row.CLICKS) || 0,
      REVENUE: Number(row.REVENUE) || 0,
      SPEND: Number(row.SPEND) || 0,
      TRANSACTIONS: Number(row.TRANSACTIONS) || 0
    }));
};

/**
 * Parse CSV file and return cleaned data
 */
export const parseCsvFile = (
  file: File
): Promise<{
  data: CampaignDataRow[];
  errors: string[];
  warnings: string[];
}> => {
  return new Promise((resolve) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
      complete: (results) => {
        try {
          // Validate columns
          const columnValidation = validateCsvColumns(results.meta.fields || []);
          if (!columnValidation.isValid) {
            errors.push(`Missing required columns: ${columnValidation.missingColumns.join(', ')}`);
            resolve({ data: [], errors, warnings });
            return;
          }

          // Clean and process data
          const cleanedData = cleanCsvData(results.data as Record<string, unknown>[]);

          // Add warnings for data quality issues
          if (cleanedData.length === 0) {
            warnings.push('No valid data rows found in CSV file');
          }

          const totalRows = (results.data as Record<string, unknown>[]).length;
          const validRows = cleanedData.length;
          if (validRows < totalRows) {
            warnings.push(`Filtered out ${totalRows - validRows} invalid rows`);
          }

          // Check for campaigns with zero impressions
          const zeroImpressionCampaigns = cleanedData.filter(row => row.IMPRESSIONS === 0);
          if (zeroImpressionCampaigns.length > 0) {
            warnings.push(`Found ${zeroImpressionCampaigns.length} rows with zero impressions`);
          }

          resolve({
            data: cleanedData,
            errors,
            warnings
          });
        } catch (error) {
          errors.push(`Error processing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
          resolve({ data: [], errors, warnings });
        }
      },
      error: (error) => {
        errors.push(`CSV parsing error: ${error.message}`);
        resolve({ data: [], errors, warnings });
      }
    });
  });
};

/**
 * Export data to CSV format
 */
export const exportToCsv = (
  data: CampaignDataRow[],
  filename: string = 'campaign-data.csv'
): void => {
  const csv = Papa.unparse(data, {
    header: true
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

/**
 * Validate individual data rows for common issues
 */
export const validateDataRow = (row: CampaignDataRow): {
  isValid: boolean;
  issues: string[];
} => {
  const issues: string[] = [];

  // Check for negative values where they shouldn't be
  if (row.IMPRESSIONS < 0) issues.push('Negative impressions');
  if (row.CLICKS < 0) issues.push('Negative clicks');
  if (row.REVENUE < 0) issues.push('Negative revenue');
  if (row.SPEND < 0) issues.push('Negative spend');

  // Check for impossible CTR (clicks > impressions)
  if (row.CLICKS > row.IMPRESSIONS && row.IMPRESSIONS > 0) {
    issues.push('Clicks exceed impressions');
  }

  // Check for unusual values
  if (row.IMPRESSIONS > 0 && row.CLICKS === 0) {
    // This might be normal, just a note
  }

  // Check date format
  const datePattern = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
  if (!datePattern.test(row.DATE)) {
    issues.push('Invalid date format');
  }

  return {
    isValid: issues.length === 0,
    issues
  };
};

/**
 * Get data quality report for a dataset
 */
export const getDataQualityReport = (data: CampaignDataRow[]): {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  issues: Record<string, number>;
  dateRange: {
    start: string;
    end: string;
  };
  campaigns: number;
} => {
  const issues: Record<string, number> = {};
  let validRows = 0;

  data.forEach(row => {
    const validation = validateDataRow(row);
    if (validation.isValid) {
      validRows++;
    } else {
      validation.issues.forEach(issue => {
        issues[issue] = (issues[issue] || 0) + 1;
      });
    }
  });

  // Get date range
  const dates = data
    .map(row => new Date(row.DATE))
    .filter(date => !isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  const dateRange = {
    start: dates.length > 0 ? dates[0].toLocaleDateString() : 'N/A',
    end: dates.length > 0 ? dates[dates.length - 1].toLocaleDateString() : 'N/A'
  };

  // Count unique campaigns
  const uniqueCampaigns = new Set(data.map(row => row['CAMPAIGN ORDER NAME']));

  return {
    totalRows: data.length,
    validRows,
    invalidRows: data.length - validRows,
    issues,
    dateRange,
    campaigns: uniqueCampaigns.size
  };
};