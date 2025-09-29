// Core Campaign Data Types
export interface CampaignDataRow {
  DATE: string;
  'CAMPAIGN ORDER NAME': string;
  IMPRESSIONS: number;
  CLICKS: number;
  REVENUE: number;
  SPEND: number;
  TRANSACTIONS?: number;
}

// Processed campaign data with calculated metrics
export interface ProcessedCampaignData extends CampaignDataRow {
  CTR: number;
  ROAS: number;
  advertiser: string;
  agency: string;
  isTestCampaign: boolean;
}

// Aggregated time series data point
export interface TimeSeriesDataPoint {
  date: string;
  IMPRESSIONS: number;
  CLICKS: number;
  REVENUE: number;
  TRANSACTIONS: number;
  SPEND: number;
  CTR: number;
  ROAS: number;
}

// Campaign metrics totals
export interface CampaignTotals {
  impressions: number;
  clicks: number;
  ctr: number;
  revenue: number;
  transactions: number;
  spend: number;
  roas: number;
}

// Trend analysis data
export interface TrendData {
  impressions: number;
  clicks: number;
  ctr: number;
  revenue: number;
  transactions: number;
  roas: number;
}

// Metric types for charts and modals
export type MetricType =
  | "impressions"
  | "clicks"
  | "ctr"
  | "transactions"
  | "revenue"
  | "roas";

// Modal data interface
export interface ModalData {
  isOpen: boolean;
  title: string;
  metricType: MetricType;
  data: TimeSeriesDataPoint[];
}

// Campaign filter data
export interface CampaignFilterData {
  campaigns: string[];
  advertisers: string[];
  agencies: string[];
}

// Chart data options
export interface ChartDataOptions {
  selectedCampaigns: string[];
  selectedAdvertisers: string[];
  selectedAgencies: string[];
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

// Pacing data interface
export interface PacingData {
  campaignName: string;
  currentPace: number;
  targetPace: number;
  daysRemaining: number;
  budgetSpent: number;
  totalBudget: number;
}

// Contract terms data
export interface ContractTermsData {
  campaignName: string;
  startDate: string;
  endDate: string;
  budget: number;
  terms: Record<string, unknown>;
}