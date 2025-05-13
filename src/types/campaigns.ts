
export type ViewMode = "campaign" | "advertiser";

export interface ModalData {
  isOpen: boolean;
  itemName: string;
  metricType: "impressions" | "clicks" | "ctr" | "transactions" | "revenue" | "roas";
  data: any[];
}

export interface ChartItem {
  name: string;
  timeSeriesData: any[];
  totals: {
    impressions: number;
    clicks: number;
    transactions: number;
    revenue: number;
    spend: number;
  };
  avgCtr: number;
  avgRoas: number;
}
