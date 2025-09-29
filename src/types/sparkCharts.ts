import { CampaignDataRow } from "./campaign";

// Spark Chart specific types
export type SparkChartMetricType =
  | "impressions"
  | "clicks"
  | "ctr"
  | "transactions"
  | "revenue"
  | "roas";

export type SparkChartViewMode = "campaign" | "advertiser";

export interface SparkChartDataPoint {
  date: string;
  rawDate: Date;
  value: number;
  campaign?: string;
  advertiser?: string;
  agency?: string;
}

export interface SparkChartItem {
  name: string;
  agency?: string;
  advertiser?: string;
  data: SparkChartDataPoint[];
  totals: {
    impressions: number;
    clicks: number;
    ctr: number;
    transactions: number;
    revenue: number;
    roas: number;
  };
}

export interface SparkChartModalData {
  isOpen: boolean;
  itemName: string;
  metricType: SparkChartMetricType;
  data: SparkChartDataPoint[];
}

export interface SparkChartFilters {
  selectedAgencies: string[];
  selectedAdvertisers: string[];
  selectedCampaigns: string[];
  viewMode: SparkChartViewMode;
  useGlobalFilters: boolean;
}

export interface SparkChartMetricConfig {
  title: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  formatter: (value: number) => string;
}

export interface SparkChartProps {
  item: SparkChartItem;
  metric: SparkChartMetricType;
  config: SparkChartMetricConfig;
  onChartClick: (itemName: string, metric: SparkChartMetricType, data: SparkChartDataPoint[]) => void;
  className?: string;
}

export interface SparkChartGridProps {
  items: SparkChartItem[];
  filters: SparkChartFilters;
  onFiltersChange: (filters: Partial<SparkChartFilters>) => void;
  onChartClick: (itemName: string, metric: SparkChartMetricType, data: SparkChartDataPoint[]) => void;
  agencyOptions?: { value: string; label: string }[];
  advertiserOptions?: { value: string; label: string }[];
  campaignOptions?: { value: string; label: string }[];
}

export interface CampaignSparkChartsProps {
  data: CampaignDataRow[];
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  useGlobalFilters?: boolean;
}