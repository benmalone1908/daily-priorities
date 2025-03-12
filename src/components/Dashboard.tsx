
import { useMemo, useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  ComposedChart,
} from "recharts";
import { AlertTriangle, TrendingDown, TrendingUp, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AnomalyDetails from "./AnomalyDetails";
import { getColorClasses } from "@/utils/anomalyColors";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MultiSelect, Option } from "./MultiSelect";
import MetricCard from "./MetricCard";

interface DashboardProps {
  data: any[];
  metricsData?: any[];
  revenueData?: any[];
  selectedMetricsCampaigns?: string[];
  selectedRevenueCampaigns?: string[];
  selectedRevenueAdvertisers?: string[];
  onMetricsCampaignsChange?: (selected: string[]) => void;
  onRevenueCampaignsChange?: (selected: string[]) => void;
  onRevenueAdvertisersChange?: (selected: string[]) => void;
  sortedCampaignOptions?: string[];
  sortedAdvertiserOptions?: string[];
}

interface WeeklyData {
  periodStart: string;
  periodEnd: string;
  IMPRESSIONS: number;
  CLICKS: number;
  REVENUE: number;
  ROAS: number;
  count: number;
}

interface WeeklyAggregation {
  weekStart: string;
  [metric: string]: any;
  rows: any[];
}

type AnomalyPeriod = "daily" | "weekly";

const Dashboard = ({ 
  data,
  metricsData,
  revenueData,
  selectedMetricsCampaigns = [],
  selectedRevenueCampaigns = [],
  selectedRevenueAdvertisers = [],
  onMetricsCampaignsChange,
  onRevenueCampaignsChange,
  onRevenueAdvertisersChange,
  sortedCampaignOptions = [],
  sortedAdvertiserOptions = []
}: DashboardProps) => {
  const [selectedWeeklyCampaign, setSelectedWeeklyCampaign] = useState<string>("all");
  const [selectedWeeklyAdvertisers, setSelectedWeeklyAdvertisers] = useState<string[]>([]);
  const [selectedMetricsAdvertisers, setSelectedMetricsAdvertisers] = useState<string[]>([]);
  const [anomalyPeriod, setAnomalyPeriod] = useState<AnomalyPeriod>("daily");

  const campaigns = useMemo(() => {
    if (sortedCampaignOptions.length > 0) return sortedCampaignOptions;
    if (!data || !data.length) return [];
    return Array.from(new Set(data.map(row => row["CAMPAIGN ORDER NAME"]))).filter(Boolean).sort();
  }, [data, sortedCampaignOptions]);

  const advertisers = useMemo(() => {
    if (sortedAdvertiserOptions.length > 0) return sortedAdvertiserOptions;
    if (!data || !data.length) return [];
    
    const uniqueAdvertisers = new Set<string>();
    
    data.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      const match = campaignName.match(/SM:\s+([^-]+)/);
      if (match) {
        const advertiser = match[1].trim();
        if (advertiser) {
          uniqueAdvertisers.add(advertiser);
        }
      }
    });
    
    return Array.from(uniqueAdvertisers).sort();
  }, [data, sortedAdvertiserOptions]);

  const campaignOptions: Option[] = useMemo(() => {
    return campaigns.map(campaign => ({
      value: campaign,
      label: campaign
    }));
  }, [campaigns]);

  const advertiserOptions: Option[] = useMemo(() => {
    return advertisers.map(advertiser => ({
      value: advertiser,
      label: advertiser
    }));
  }, [advertisers]);

  const filteredMetricsCampaignOptions = useMemo(() => {
    if (!selectedMetricsAdvertisers.length) return campaignOptions;
    
    return campaignOptions.filter(option => {
      const campaignName = option.value;
      const match = campaignName.match(/SM:\s+([^-]+)/);
      const advertiser = match ? match[1].trim() : "";
      return selectedMetricsAdvertisers.includes(advertiser);
    });
  }, [campaignOptions, selectedMetricsAdvertisers]);

  const filteredRevenueCampaignOptions = useMemo(() => {
    if (!selectedRevenueAdvertisers.length) return campaignOptions;
    
    return campaignOptions.filter(option => {
      const campaignName = option.value;
      const match = campaignName.match(/SM:\s+([^-]+)/);
      const advertiser = match ? match[1].trim() : "";
      return selectedRevenueAdvertisers.includes(advertiser);
    });
  }, [campaignOptions, selectedRevenueAdvertisers]);

  const filteredWeeklyCampaignOptions = useMemo(() => {
    if (!selectedWeeklyAdvertisers.length) {
      return [
        { value: "all", label: "All Campaigns" },
        ...campaignOptions
      ];
    }
    
    const filteredCampaigns = campaignOptions.filter(option => {
      const campaignName = option.value;
      const match = campaignName.match(/SM:\s+([^-]+)/);
      const advertiser = match ? match[1].trim() : "";
      return selectedWeeklyAdvertisers.includes(advertiser);
    });
    
    return [
      { value: "all", label: "All Campaigns" },
      ...filteredCampaigns
    ];
  }, [campaignOptions, selectedWeeklyAdvertisers]);

  const handleMetricsAdvertisersChange = (selected: string[]) => {
    setSelectedMetricsAdvertisers(selected);
    
    if (onMetricsCampaignsChange) {
      if (selected.length > 0) {
        const validCampaigns = selectedMetricsCampaigns.filter(campaign => {
          const match = campaign.match(/SM:\s+([^-]+)/);
          const advertiser = match ? match[1].trim() : "";
          return selected.includes(advertiser);
        });
        
        onMetricsCampaignsChange(validCampaigns);
      }
    }
  };

  const handleWeeklyAdvertisersChange = (selected: string[]) => {
    setSelectedWeeklyAdvertisers(selected);
    
    if (selected.length > 0 && selectedWeeklyCampaign !== "all") {
      const match = selectedWeeklyCampaign.match(/SM:\s+([^-]+)/);
      const advertiser = match ? match[1].trim() : "";
      
      if (!selected.includes(advertiser)) {
        setSelectedWeeklyCampaign("all");
      }
    }
  };

  // Return the actual dashboard UI
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Display Metrics Over Time</h2>
          <div className="space-y-3">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Filter by Advertiser</label>
              <MultiSelect
                options={advertiserOptions}
                selected={selectedMetricsAdvertisers}
                onChange={handleMetricsAdvertisersChange}
                placeholder="Select advertisers..."
              />
            </div>
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Filter by Campaign</label>
              <MultiSelect
                options={filteredMetricsCampaignOptions}
                selected={selectedMetricsCampaigns || []}
                onChange={onMetricsCampaignsChange || (() => {})}
                placeholder="Select campaigns..."
              />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Revenue Analysis</h2>
          <div className="space-y-3">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Filter by Advertiser</label>
              <MultiSelect
                options={advertiserOptions}
                selected={selectedRevenueAdvertisers || []}
                onChange={onRevenueAdvertisersChange || (() => {})}
                placeholder="Select advertisers..."
              />
            </div>
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Filter by Campaign</label>
              <MultiSelect
                options={filteredRevenueCampaignOptions}
                selected={selectedRevenueCampaigns || []}
                onChange={onRevenueCampaignsChange || (() => {})}
                placeholder="Select campaigns..."
              />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Weekly Trend Analysis</h2>
          <div className="space-y-3">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Filter by Advertiser</label>
              <MultiSelect
                options={advertiserOptions}
                selected={selectedWeeklyAdvertisers}
                onChange={handleWeeklyAdvertisersChange}
                placeholder="Select advertisers..."
              />
            </div>
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Select Campaign</label>
              <Select value={selectedWeeklyCampaign} onValueChange={setSelectedWeeklyCampaign}>
                <SelectTrigger>
                  <SelectValue placeholder="Select campaign" />
                </SelectTrigger>
                <SelectContent>
                  {filteredWeeklyCampaignOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Anomaly Detection</h2>
            <ToggleGroup type="single" value={anomalyPeriod} onValueChange={(value: AnomalyPeriod) => value && setAnomalyPeriod(value)}>
              <ToggleGroupItem value="daily" aria-label="Daily" className="text-xs">
                Daily
              </ToggleGroupItem>
              <ToggleGroupItem value="weekly" aria-label="Weekly" className="text-xs">
                Weekly
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Impression Anomalies"
              anomalies={[]}
              metric="IMPRESSIONS"
              anomalyPeriod={anomalyPeriod}
            />
            <MetricCard
              title="Click Anomalies"
              anomalies={[]}
              metric="CLICKS"
              anomalyPeriod={anomalyPeriod}
            />
            <MetricCard
              title="Revenue Anomalies"
              anomalies={[]}
              metric="REVENUE"
              anomalyPeriod={anomalyPeriod}
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
