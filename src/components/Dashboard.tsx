import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronsUpDown } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MetricCard from './MetricCard';
import { useCampaignFilter } from '@/contexts/CampaignFilterContext';
import { MultiSelect, Option } from './MultiSelect';
import { Separator } from './ui/separator';
import { getColorClasses } from '@/utils/anomalyColors';

interface Anomaly {
  date: string;
  metric: string;
  expected: number;
  actual: number;
  campaign: string;
}

interface CampaignRow {
  DATE: string;
  "CAMPAIGN ORDER NAME": string;
  IMPRESSIONS: number;
  CLICKS: number;
  REVENUE: number;
  SPEND: number;
}

type MetricType = "impressions" | "clicks" | "revenue";

const getWeekNumber = (d: Date) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
  return weekNo;
}

const Dashboard = ({
  data,
  metricsData,
  revenueData,
  selectedMetricsCampaigns,
  selectedRevenueCampaigns,
  selectedRevenueAdvertisers,
  selectedRevenueAgencies,
  onMetricsCampaignsChange,
  onRevenueCampaignsChange,
  onRevenueAdvertisersChange,
  onRevenueAgenciesChange,
  sortedCampaignOptions,
  sortedAdvertiserOptions,
  sortedAgencyOptions,
  formattedCampaignOptions,
  formattedAdvertiserOptions, 
  formattedAgencyOptions,
  aggregatedMetricsData,
  agencyToAdvertisersMap,
  agencyToCampaignsMap,
  advertiserToCampaignsMap,
  selectedWeeklyCampaigns = [], // Change from string to string[] with default empty array
  onWeeklyCampaignsChange = () => {} // Default empty function
}: {
  data: any[];
  metricsData: any[];
  revenueData: any[];
  selectedMetricsCampaigns: string[];
  selectedRevenueCampaigns: string[];
  selectedRevenueAdvertisers: string[];
  selectedRevenueAgencies: string[];
  onMetricsCampaignsChange: (selected: string[]) => void;
  onRevenueCampaignsChange: (selected: string[]) => void;
  onRevenueAdvertisersChange: (selected: string[]) => void;
  onRevenueAgenciesChange: (selected: string[]) => void;
  sortedCampaignOptions: string[];
  sortedAdvertiserOptions: string[];
  sortedAgencyOptions: string[];
  formattedCampaignOptions: Option[];
  formattedAdvertiserOptions: Option[];
  formattedAgencyOptions: Option[];
  aggregatedMetricsData: any[];
  agencyToAdvertisersMap: Record<string, Set<string>>;
  agencyToCampaignsMap: Record<string, Set<string>>;
  advertiserToCampaignsMap: Record<string, Set<string>>;
  selectedWeeklyCampaigns?: string[]; // Change type to string[] to support multi-select
  onWeeklyCampaignsChange?: (selected: string[]) => void; // Update handler for array
}) => {
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("impressions");
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const { extractAdvertiserName, isTestCampaign } = useCampaignFilter();
  const [attributionTab, setAttributionTab] = useState("revenue");

  const anomalyData = useMemo(() => {
    if (!metricsData || metricsData.length === 0) return [];
    
    const anomalies: Anomaly[] = [];
    
    metricsData.forEach(row => {
      if (row.DATE === 'Totals') return;
      
      const impressions = Number(row.IMPRESSIONS) || 0;
      const clicks = Number(row.CLICKS) || 0;
      const revenue = Number(row.REVENUE) || 0;
      
      const avgImpressions = impressions / metricsData.length;
      const avgClicks = clicks / metricsData.length;
      const avgRevenue = revenue / metricsData.length;
      
      const impressionsThreshold = avgImpressions * 0.5;
      const clicksThreshold = avgClicks * 0.5;
      const revenueThreshold = avgRevenue * 0.5;
      
      if (impressions > avgImpressions + impressionsThreshold) {
        anomalies.push({
          date: row.DATE,
          metric: "impressions",
          expected: avgImpressions,
          actual: impressions,
          campaign: row["CAMPAIGN ORDER NAME"]
        });
      }
      
      if (clicks > avgClicks + clicksThreshold) {
        anomalies.push({
          date: row.DATE,
          metric: "clicks",
          expected: avgClicks,
          actual: clicks,
          campaign: row["CAMPAIGN ORDER NAME"]
        });
      }
      
      if (revenue > avgRevenue + revenueThreshold) {
        anomalies.push({
          date: row.DATE,
          metric: "revenue",
          expected: avgRevenue,
          actual: revenue,
          campaign: row["CAMPAIGN ORDER NAME"]
        });
      }
    });
    
    setAnomalies(anomalies);
    return anomalies;
  }, [metricsData]);
  
  const filteredAnomalies = useMemo(() => {
    if (!selectedCampaign) return anomalyData;
    return anomalyData.filter(anomaly => anomaly.campaign === selectedCampaign);
  }, [anomalyData, selectedCampaign]);

  const campaignOptions = useMemo(() => {
    const campaignSet = new Set<string>();
    data.forEach(row => {
      campaignSet.add(row["CAMPAIGN ORDER NAME"]);
    });
    return Array.from(campaignSet).sort();
  }, [data]);
  
  const getWeeklyData = () => {
    // Extract dates from the data
    const dates = Array.from(new Set(data.map(row => row.DATE)))
      .filter(date => date && date !== 'Totals')
      .sort((a, b) => {
        try {
          return new Date(a).getTime() - new Date(b).getTime();
        } catch (e) {
          return 0;
        }
      });
    
    if (dates.length === 0) return [];
    
    // Create a map to aggregate the data
    const aggregatedData: Record<string, any> = {};
    
    // Initialize the map with one entry per date
    dates.forEach(date => {
      const weekNumber = getWeekNumber(new Date(date));
      const weekKey = `Week ${weekNumber}`;
      
      if (!aggregatedData[weekKey]) {
        aggregatedData[weekKey] = {
          week: weekKey,
          weekNumber: weekNumber,
          revenue: 0,
          spend: 0,
          transactions: 0,
          roas: 0
        };
      }
    });
    
    // Filter and aggregate the data
    data.forEach(row => {
      if (!row.DATE || row.DATE === 'Totals') return;
      
      const weekNumber = getWeekNumber(new Date(row.DATE));
      const weekKey = `Week ${weekNumber}`;
      
      if (!aggregatedData[weekKey]) return;
      
      // Skip if campaign doesn't match filter (if a filter is set)
      // Modified to check if the campaign is in the selectedWeeklyCampaigns array
      if (selectedWeeklyCampaigns.length > 0 && 
          !selectedWeeklyCampaigns.includes(row["CAMPAIGN ORDER NAME"])) {
        return;
      }
      
      aggregatedData[weekKey].revenue += Number(row.REVENUE) || 0;
      aggregatedData[weekKey].spend += Number(row.SPEND) || 0;
      aggregatedData[weekKey].transactions += Number(row.TRANSACTIONS) || 0;
    });
    
    // Calculate ROAS for each week
    Object.values(aggregatedData).forEach((week: any) => {
      week.roas = week.spend > 0 ? week.revenue / week.spend : 0;
    });
    
    // Convert to array and sort by week number
    return Object.values(aggregatedData)
      .sort((a: any, b: any) => a.weekNumber - b.weekNumber);
  };

  const formatRevenue = (value: number): string => {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  };

  const formatRoas = (value: number): string => {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const getMetricLabel = (metric: MetricType): string => {
    switch (metric) {
      case "impressions":
        return "Impressions";
      case "clicks":
        return "Clicks";
      case "revenue":
        return "Revenue";
      default:
        return "";
    }
  };

  const getMetricDataKey = (metric: MetricType): string => {
    switch (metric) {
      case "impressions":
        return "IMPRESSIONS";
      case "clicks":
        return "CLICKS";
      case "revenue":
        return "REVENUE";
      default:
        return "";
    }
  };

  const filteredRevenueCampaignOptions = useMemo(() => {
    let options = formattedCampaignOptions;
    
    if (selectedRevenueAgencies.length > 0) {
      const validCampaigns = new Set<string>();
      selectedRevenueAgencies.forEach(agency => {
        const campaigns = agencyToCampaignsMap[agency];
        if (campaigns) {
          campaigns.forEach(campaign => validCampaigns.add(campaign));
        }
      });
      options = options.filter(option => validCampaigns.has(option.value));
    }
    
    if (selectedRevenueAdvertisers.length > 0) {
      const validCampaigns = new Set<string>();
      selectedRevenueAdvertisers.forEach(advertiser => {
        const campaigns = advertiserToCampaignsMap[advertiser];
        if (campaigns) {
          campaigns.forEach(campaign => validCampaigns.add(campaign));
        }
      });
      options = options.filter(option => validCampaigns.has(option.value));
    }
    
    return options;
  }, [formattedCampaignOptions, selectedRevenueAgencies, selectedRevenueAdvertisers, agencyToCampaignsMap, advertiserToCampaignsMap]);

  const weeklyData = useMemo(() => getWeeklyData(), [data, selectedWeeklyCampaigns]);
  
  const renderRevenueChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={revenueData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="DATE" />
        <YAxis tickFormatter={(value) => `$${value}`} />
        <Tooltip formatter={(value) => `$${value}`} />
        <Legend />
        <Line type="monotone" dataKey="REVENUE" stroke="#82ca9d" activeDot={{ r: 8 }} />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderWeeklyComparisonChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={weeklyData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="week" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="revenue" name="Revenue" fill="#82ca9d" />
        <Bar dataKey="roas" name="ROAS" fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <div className="space-y-8 py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
        <MetricCard 
          title="Total Impressions" 
          value={metricsData.reduce((sum, row) => sum + Number(row.IMPRESSIONS), 0)} 
          trend={0} 
        />
        <MetricCard 
          title="Total Clicks" 
          value={metricsData.reduce((sum, row) => sum + Number(row.CLICKS), 0)} 
          trend={0} 
        />
        <MetricCard 
          title="Total Revenue" 
          value={metricsData.reduce((sum, row) => sum + Number(row.REVENUE), 0)} 
          trend={0} 
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Over Time Section */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <CardTitle>Attribution Revenue Over Time</CardTitle>
                <CardDescription>Track revenue performance trends over the selected date range</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <MultiSelect
                  options={filteredRevenueCampaignOptions}
                  selected={selectedRevenueCampaigns}
                  onChange={onRevenueCampaignsChange}
                  placeholder="Campaign"
                  className="w-[200px]"
                  popoverClassName="w-[400px]"
                />
                <MultiSelect
                  options={formattedAdvertiserOptions}
                  selected={selectedRevenueAdvertisers}
                  onChange={onRevenueAdvertisersChange}
                  placeholder="Advertiser"
                  className="w-[200px]"
                  popoverClassName="w-[400px]"
                />
                <MultiSelect
                  options={formattedAgencyOptions}
                  selected={selectedRevenueAgencies}
                  onChange={onRevenueAgenciesChange}
                  placeholder="Agency"
                  className="w-[200px]"
                  popoverClassName="w-[400px]"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderRevenueChart()}
          </CardContent>
        </Card>
        
        {/* Weekly Comparison Section - Replace Select with MultiSelect */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <CardTitle>Weekly Comparison</CardTitle>
                <CardDescription>Track revenue and ROAS by week</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <MultiSelect
                  options={filteredRevenueCampaignOptions}
                  selected={selectedWeeklyCampaigns}
                  onChange={onWeeklyCampaignsChange}
                  placeholder="Campaign"
                  className="w-[200px]"
                  popoverClassName="w-[400px]"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderWeeklyComparisonChart()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
