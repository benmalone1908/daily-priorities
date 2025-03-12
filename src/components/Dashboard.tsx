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

  // ... rest of code remains unchanged
}

export default Dashboard;
