import { CampaignDataRow } from "./campaign";

// CSV Data Types
export interface CSVRow {
  [key: string]: string | number;
}

// Processed data with calculated metrics
export interface ProcessedCampaignRow extends CampaignDataRow {
  CTR: number;
  ROAS: number;
  advertiser?: string;
  agency?: string;
}

export interface DeliveryDataRow {
  DATE: string;
  'CAMPAIGN ORDER NAME': string;
  IMPRESSIONS: string | number;
  CLICKS?: string | number;
  REVENUE?: string | number;
  SPEND?: string | number;
  TRANSACTIONS?: string | number;
}

export interface ContractTermsRow {
  Name: string;
  'Start Date': string;
  'End Date': string;
  Budget: string | number;
  CPM?: string | number;
  'Impressions Goal'?: string | number;
  [key: string]: string | number | undefined;
}

// Simplified Dashboard Props - drastically reduced from 70+ props
export interface DashboardProps {
  data: CampaignDataRow[];

  // Optional configuration
  hideCharts?: string[];
  useGlobalFilters?: boolean;
  showDailyTotalsTable?: boolean;
  hideDashboardSparkCharts?: boolean;

  // Chart configuration
  customBarMetric?: string;
  customLineMetric?: string;
  initialTab?: string;

  // Event handlers
  onTabChange?: (tab: string) => void;

  // Additional data
  contractTermsData?: ContractTermsRow[];
}

// Chart-specific interfaces
export interface ChartContainerProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export interface MetricCardProps {
  title: string;
  anomalies: AnomalyData[];
  metric: string;
  anomalyPeriod: "daily" | "weekly";
}

export interface FilterControlsProps {
  data: CampaignDataRow[];
  onFiltersChange?: (filters: DashboardFilters) => void;
}

export interface DashboardFilters {
  campaigns: string[];
  advertisers: string[];
  agencies: string[];
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

// Chart data interfaces
export interface ChartDataPoint {
  date: string;
  [metric: string]: number | string;
}

export interface AnomalyData {
  date: string;
  value: number;
  expected: number;
  severity: "high" | "medium" | "low";
  metric: string;
}

// Dashboard layout configuration
export interface DashboardLayout {
  showAnomalySection: boolean;
  showChartsSection: boolean;
  showFiltersSection: boolean;
  chartGridColumns: number;
}