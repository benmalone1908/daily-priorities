
import { parseDateString } from "@/lib/utils";

export const getSafeId = (name: string) => {
  return `gradient-${name.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-')}`;
};

export const getAdvertiserFromCampaign = (campaignName: string): string => {
  // Updated regex to correctly capture advertiser names before hyphens
  const match = campaignName.match(/SM:\s+(.*?)(?=-)/);
  return match ? match[1].trim() : "";
};

export const calculateSpend = (impressions: number, spendMode: 'default' | 'custom', customCPM: number) => {
  const cpmRate = spendMode === 'custom' ? customCPM : 15;
  return (impressions / 1000) * cpmRate;
};

export type MetricType = 
  | "impressions" 
  | "clicks" 
  | "ctr" 
  | "transactions" 
  | "revenue" 
  | "roas";

export interface MetricDetails {
  title: string;
  color: string;
  formatter: (value: number) => string;
}

export const getMetricDetails = (metricType: MetricType): MetricDetails => {
  switch(metricType) {
    case "impressions":
      return {
        title: "Impressions",
        color: "#0EA5E9",
        formatter: (value: number) => value.toLocaleString()
      };
    case "clicks":
      return {
        title: "Clicks",
        color: "#8B5CF6",
        formatter: (value: number) => value.toLocaleString()
      };
    case "ctr":
      return {
        title: "CTR",
        color: "#6366F1",
        formatter: (value: number) => `${value.toFixed(2)}%`
      };
    case "transactions":
      return {
        title: "Transactions",
        color: "#F97316",
        formatter: (value: number) => value.toLocaleString()
      };
    case "revenue":
      return {
        title: "Revenue",
        color: "#10B981",
        formatter: (value: number) => `$${value.toLocaleString()}`
      };
    case "roas":
      return {
        title: "ROAS",
        color: "#F59E0B",
        formatter: (value: number) => `${value.toFixed(2)}x`
      };
  }
};
