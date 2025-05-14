import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricCard } from "@/components/MetricCard";
import MultiSelect from "@/components/MultiSelect";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { useCampaignFilter } from "@/contexts/CampaignFilterContext";

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
}: {
  data: any[];
  metricsData: any[];
  revenueData: any[];
  selectedMetricsCampaigns: string[];
  selectedRevenueCampaigns: string[];
  selectedRevenueAdvertisers: string[];
  selectedRevenueAgencies: string[];
  onMetricsCampaignsChange?: (selected: string[]) => void;
  onRevenueCampaignsChange?: (selected: string[]) => void;
  onRevenueAdvertisersChange?: (selected: string[]) => void;
  onRevenueAgenciesChange?: (selected: string[]) => void;
}) => {
  const [activeTab, setActiveTab] = useState("performance");
  const [showWeeklyExplainer, setShowWeeklyExplainer] = useState(false);

  const { extractAdvertiserName, extractAgencyInfo, showDebugInfo } = useCampaignFilter();

  // Get all available campaigns in the data
  const campaignOptions = useMemo(() => {
    const campaignsSet = new Set<string>();
    
    data.forEach(row => {
      const campaign = row["CAMPAIGN ORDER NAME"];
      if (campaign) campaignsSet.add(campaign);
    });
    
    return Array.from(campaignsSet).sort().map(campaign => ({
      value: campaign,
      label: campaign
    }));
  }, [data]);

  // Get performance metrics data
  const getPerformanceData = () => {
    if (!metricsData || metricsData.length === 0) return [];
    
    // Group data by date for time series
    const dateGroups: Record<string, any> = {};
    
    metricsData.forEach(row => {
      if (!row.DATE || row.DATE === 'Totals') return;
      
      const date = row.DATE;
      const impressionsValue = Number(row.IMPRESSIONS) || 0;
      const clicksValue = Number(row.CLICKS) || 0;
      
      if (!dateGroups[date]) {
        dateGroups[date] = {
          date,
          impressions: 0,
          clicks: 0
        };
      }
      
      dateGroups[date].impressions += impressionsValue;
      dateGroups[date].clicks += clicksValue;
    });
    
    return Object.values(dateGroups).sort((a: any, b: any) => {
      try {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      } catch {
        return 0;
      }
    });
  };

  // Get all available agencies in the data
  const agencyOptions = useMemo(() => {
    const agenciesSet = new Set<string>();
    
    data.forEach(row => {
      if (row["CAMPAIGN ORDER NAME"]) {
        const { agency } = extractAgencyInfo(row["CAMPAIGN ORDER NAME"]);
        if (agency) agenciesSet.add(agency);
      }
    });
    
    return Array.from(agenciesSet).sort().map(agency => ({
      value: agency,
      label: agency
    }));
  }, [data, extractAgencyInfo]);

  // Get all available advertisers based on selected agencies or all data
  const advertiserOptions = useMemo(() => {
    let filteredData = data;
    
    // Filter by selected agencies if any
    if (selectedRevenueAgencies.length > 0) {
      filteredData = data.filter(row => {
        if (!row["CAMPAIGN ORDER NAME"]) return false;
        const { agency } = extractAgencyInfo(row["CAMPAIGN ORDER NAME"]);
        return selectedRevenueAgencies.includes(agency);
      });
      
      if (showDebugInfo) {
        console.log(`Filtered to ${filteredData.length} rows by selected agencies: ${selectedRevenueAgencies.join(', ')}`);
      }
    }
    
    const advertisersSet = new Set<string>();
    
    filteredData.forEach(row => {
      if (row["CAMPAIGN ORDER NAME"]) {
        const advertiser = extractAdvertiserName(row["CAMPAIGN ORDER NAME"]);
        if (advertiser) advertisersSet.add(advertiser);
      }
    });
    
    return Array.from(advertisersSet).sort().map(advertiser => ({
      value: advertiser,
      label: advertiser
    }));
  }, [data, selectedRevenueAgencies, extractAdvertiserName, extractAgencyInfo, showDebugInfo]);

  // Get campaign options based on selected agencies and advertisers
  const campaignOptions = useMemo(() => {
    let filteredData = data;
    
    // Filter by selected agencies if any
    if (selectedRevenueAgencies.length > 0) {
      filteredData = filteredData.filter(row => {
        if (!row["CAMPAIGN ORDER NAME"]) return false;
        const { agency } = extractAgencyInfo(row["CAMPAIGN ORDER NAME"]);
        return selectedRevenueAgencies.includes(agency);
      });
    }
    
    // Filter by selected advertisers if any
    if (selectedRevenueAdvertisers.length > 0) {
      filteredData = filteredData.filter(row => {
        if (!row["CAMPAIGN ORDER NAME"]) return false;
        const advertiser = extractAdvertiserName(row["CAMPAIGN ORDER NAME"]);
        return selectedRevenueAdvertisers.includes(advertiser);
      });
    }
    
    const campaignsSet = new Set<string>();
    
    filteredData.forEach(row => {
      const campaign = row["CAMPAIGN ORDER NAME"];
      if (campaign) campaignsSet.add(campaign);
    });
    
    if (showDebugInfo) {
      console.log(`Generated ${campaignsSet.size} campaign options after filtering by agencies and advertisers`);
    }
    
    return Array.from(campaignsSet).sort().map(campaign => ({
      value: campaign,
      label: campaign
    }));
  }, [data, selectedRevenueAgencies, selectedRevenueAdvertisers, extractAdvertiserName, extractAgencyInfo, showDebugInfo]);

  // Get weekly comparison data
  const getWeeklyData = () => {
    if (!data || data.length === 0) return [];
    
    // Filter out totals row
    const filteredData = data.filter(row => row.DATE !== 'Totals');
    
    // Group data by date
    const dateGroups: Record<string, any> = {};
    
    filteredData.forEach(row => {
      if (!row.DATE) return;
      
      const date = row.DATE;
      const impressionsValue = Number(row.IMPRESSIONS) || 0;
      const clicksValue = Number(row.CLICKS) || 0;
      const revenueValue = Number(row.REVENUE) || 0;
      const transactionValue = Number(row.TRANSACTIONS) || 0;
      
      if (!dateGroups[date]) {
        dateGroups[date] = {
          date,
          impressions: 0,
          clicks: 0,
          revenue: 0,
          transactions: 0
        };
      }
      
      dateGroups[date].impressions += impressionsValue;
      dateGroups[date].clicks += clicksValue;
      dateGroups[date].revenue += revenueValue;
      dateGroups[date].transactions += transactionValue;
    });
    
    // Sort dates
    const sortedDates = Object.keys(dateGroups).sort((a, b) => {
      try {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateA.getTime() - dateB.getTime();
      } catch {
        return 0;
      }
    });
    
    // Group by week
    const weeklyData: any[] = [];
    let currentWeekData = {
      weekStart: '',
      weekEnd: '',
      impressions: 0,
      clicks: 0,
      revenue: 0,
      transactions: 0
    };
    
    let dayCounter = 0;
    
    sortedDates.forEach((dateStr, index) => {
      const dateData = dateGroups[dateStr];
      
      // Start a new week
      if (dayCounter === 0) {
        currentWeekData = {
          weekStart: dateStr,
          weekEnd: '',
          impressions: 0,
          clicks: 0,
          revenue: 0,
          transactions: 0
        };
      }
      
      // Add data to current week
      currentWeekData.impressions += dateData.impressions;
      currentWeekData.clicks += dateData.clicks;
      currentWeekData.revenue += dateData.revenue;
      currentWeekData.transactions += dateData.transactions;
      
      // End of week or last date
      if (dayCounter === 6 || index === sortedDates.length - 1) {
        currentWeekData.weekEnd = dateStr;
        weeklyData.push({
          ...currentWeekData,
          name: `${currentWeekData.weekStart} - ${currentWeekData.weekEnd}`
        });
        dayCounter = 0;
      } else {
        dayCounter++;
      }
    });
    
    return weeklyData;
  };

  // Updated getAttributionData to log filtering details
  const getAttributionData = () => {
    if (!data || data.length === 0) return [];
    
    let filteredData = data.filter(row => row.DATE !== 'Totals');
    
    // Debug logging for initial data
    if (showDebugInfo) {
      console.log(`Attribution data - starting with ${filteredData.length} rows`);
    }
    
    // Group data by date for time series
    const dateGroups: Record<string, any> = {};
    
    filteredData.forEach(row => {
      if (!row.DATE) return;
      
      const date = row.DATE;
      const revenueValue = Number(row.REVENUE) || 0;
      const transactionValue = Number(row.TRANSACTIONS) || 0;
      const spendValue = Number(row.SPEND) || 0;
      
      if (!dateGroups[date]) {
        dateGroups[date] = {
          date,
          revenue: 0,
          transactions: 0,
          spend: 0
        };
      }
      
      dateGroups[date].revenue += revenueValue;
      dateGroups[date].transactions += transactionValue;
      dateGroups[date].spend += spendValue;
    });
    
    // Debug logging for attribution revenue data
    if (showDebugInfo) {
      console.log(`Attribution data - generated ${Object.keys(dateGroups).length} date groups`);
    }
    
    return Object.values(dateGroups).sort((a: any, b: any) => {
      try {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      } catch {
        return 0;
      }
    });
  };

  // This useEffect will reset the campaign selection when advertisers change
  useEffect(() => {
    if (onRevenueCampaignsChange && selectedRevenueAdvertisers.length > 0) {
      onRevenueCampaignsChange([]);
    }
  }, [selectedRevenueAdvertisers, onRevenueCampaignsChange]);

  // This useEffect will reset both advertiser and campaign selections when agencies change
  useEffect(() => {
    if (onRevenueAdvertisersChange && selectedRevenueAgencies.length > 0) {
      onRevenueAdvertisersChange([]);
    }
    if (onRevenueCampaignsChange && selectedRevenueAgencies.length > 0) {
      onRevenueCampaignsChange([]);
    }
  }, [selectedRevenueAgencies, onRevenueAdvertisersChange, onRevenueCampaignsChange]);

  const performanceData = getPerformanceData();
  const weeklyData = getWeeklyData();
  const attributionData = getAttributionData();

  return (
    <div className="space-y-8 animate-fade-in">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
          <TabsTrigger value="weekly">Weekly Comparison</TabsTrigger>
          <TabsTrigger value="attribution">Attribution Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Performance Metrics Over Time</h3>
                  <p className="text-sm text-muted-foreground">
                    Track how impressions and clicks change over the campaign period
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Filter by:</span>
                  {onMetricsCampaignsChange && (
                    <MultiSelect
                      options={campaignOptions}
                      selected={selectedMetricsCampaigns}
                      onChange={onMetricsCampaignsChange}
                      placeholder="Campaign"
                      className="w-[200px]"
                    />
                  )}
                </div>
              </div>

              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={performanceData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 30,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }} 
                      tickMargin={10}
                    />
                    <YAxis 
                      yAxisId="left"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value: any, name: string) => {
                        if (name === 'impressions') {
                          return [value.toLocaleString(), 'Impressions'];
                        }
                        return [value.toLocaleString(), 'Clicks'];
                      }}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="impressions"
                      name="Impressions"
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="clicks"
                      name="Clicks"
                      stroke="#82ca9d"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Weekly Performance Comparison</h3>
                  <p className="text-sm text-muted-foreground">
                    Compare key metrics across weeks to identify trends
                    <button 
                      onClick={() => setShowWeeklyExplainer(!showWeeklyExplainer)}
                      className="ml-2 text-blue-500 hover:text-blue-700 underline"
                    >
                      {showWeeklyExplainer ? 'Hide info' : 'Learn more'}
                    </button>
                  </p>
                  {showWeeklyExplainer && (
                    <div className="mt-2 p-3 bg-muted rounded-md text-sm">
                      <p>This chart groups data by week to help identify trends over time. Each bar represents a full week of data.</p>
                      <p className="mt-1">Weeks start from the first date in your dataset and group the next 7 days together.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={weeklyData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 30,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }} 
                      tickMargin={10}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                    />
                    <YAxis 
                      yAxisId="left"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value: any, name: string) => {
                        if (name === 'impressions') {
                          return [value.toLocaleString(), 'Impressions'];
                        } else if (name === 'clicks') {
                          return [value.toLocaleString(), 'Clicks'];
                        } else if (name === 'revenue') {
                          return [`$${value.toLocaleString()}`, 'Revenue'];
                        } else {
                          return [value.toLocaleString(), name];
                        }
                      }}
                    />
                    <Legend />
                    <Bar 
                      yAxisId="left" 
                      dataKey="impressions" 
                      name="Impressions" 
                      fill="#8884d8" 
                    />
                    <Bar 
                      yAxisId="left" 
                      dataKey="clicks" 
                      name="Clicks" 
                      fill="#82ca9d" 
                    />
                    <Bar 
                      yAxisId="right" 
                      dataKey="revenue" 
                      name="Revenue" 
                      fill="#ffc658" 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attribution" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Attribution Revenue Over Time</h3>
                  <p className="text-sm text-muted-foreground">
                    Track how revenue from attributed transactions changes over the campaign period
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium mr-1">Filter by:</span>
                    <div className="flex items-center gap-2">
                      {onRevenueAgenciesChange && agencyOptions.length > 0 && (
                        <MultiSelect
                          options={agencyOptions}
                          selected={selectedRevenueAgencies}
                          onChange={onRevenueAgenciesChange}
                          placeholder="Agency"
                          className="w-[200px]"
                        />
                      )}
                      
                      {onRevenueAdvertisersChange && advertiserOptions.length > 0 && (
                        <MultiSelect
                          options={advertiserOptions}
                          selected={selectedRevenueAdvertisers}
                          onChange={onRevenueAdvertisersChange}
                          placeholder="Advertiser"
                          className="w-[200px]"
                        />
                      )}
                      
                      {onRevenueCampaignsChange && campaignOptions.length > 0 && (
                        <MultiSelect
                          options={campaignOptions}
                          selected={selectedRevenueCampaigns}
                          onChange={onRevenueCampaignsChange}
                          placeholder="Campaign"
                          className="w-[200px]"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={attributionData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 30,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }} 
                      tickMargin={10}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value: any) => [`$${value.toLocaleString()}`, 'Revenue']}
                    />
                    <Legend />
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      name="Revenue" 
                      stroke="#8884d8" 
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
