
import React, { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CampaignStatusToggle } from "./CampaignStatusToggle";
import CampaignSparkCharts from "./CampaignSparkCharts";
import { useCampaignFilter } from "@/contexts/CampaignFilterContext";
import { MultiSelect } from "./MultiSelect";
import DateRangePicker from "./DateRangePicker";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Bar,
  BarChart,
  Label,
} from "recharts";
import { setToStartOfDay, setToEndOfDay, parseDateString, formatNumber } from "@/lib/utils";
import AnomalyDetails from "./AnomalyDetails";
import MetricCard from "./MetricCard";

export interface DashboardProps {
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
  aggregatedMetricsData: any[];
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
  aggregatedMetricsData,
}: DashboardProps) => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getTime() - 28 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });
  const [tab, setTab] = useState("overview");
  
  const { showLiveOnly } = useCampaignFilter();
  
  const filteredData = data.filter((row) => {
    if (!row || !row.DATE || row.DATE === 'Totals') return false;
    
    if (!dateRange?.from) {
      return true;
    }
    
    const fromDate = setToStartOfDay(dateRange.from);
    const toDate = dateRange.to ? setToEndOfDay(dateRange.to) : setToEndOfDay(new Date());
    
    try {
      const dateStr = String(row.DATE).trim();
      const rowDate = parseDateString(dateStr);
      
      if (!rowDate) {
        return false;
      }
      
      return rowDate >= fromDate && rowDate <= toDate;
    } catch (error) {
      console.error(`Error in date filtering for row ${JSON.stringify(row)}:`, error);
      return false;
    }
  });

  // Format options for MultiSelect components
  const metricsCampaignOptions = sortedCampaignOptions.map(campaign => ({
    value: campaign,
    label: campaign
  }));
  
  const revenueCampaignOptions = sortedCampaignOptions.map(campaign => ({
    value: campaign,
    label: campaign
  }));
  
  const revenueAdvertiserOptions = sortedAdvertiserOptions.map(advertiser => ({
    value: advertiser,
    label: advertiser
  }));

  // Format agency options for MultiSelect
  const revenueAgencyOptions = sortedAgencyOptions.map(agency => ({
    value: agency,
    label: agency
  }));

  // Function to filter metrics data by selected campaigns
  const getFilteredMetricsData = () => {
    if (selectedMetricsCampaigns.length === 0) {
      return metricsData;
    }
    
    return metricsData.filter(item => 
      selectedMetricsCampaigns.includes(item.campaign)
    );
  };

  // Function to filter revenue data by selected campaigns, advertisers, and agencies
  const getFilteredRevenueData = () => {
    let filtered = [...revenueData];
    
    if (selectedRevenueCampaigns.length > 0) {
      filtered = filtered.filter(item => 
        selectedRevenueCampaigns.includes(item.campaign)
      );
    }
    
    if (selectedRevenueAdvertisers.length > 0) {
      filtered = filtered.filter(item => 
        selectedRevenueAdvertisers.includes(item.advertiser)
      );
    }
    
    // Add filtering by agency
    if (selectedRevenueAgencies.length > 0) {
      filtered = filtered.filter(item => 
        selectedRevenueAgencies.includes(item.agency)
      );
    }
    
    return filtered;
  };

  // Prepare the weekly comparison data
  const weeklyComparisonData = React.useMemo(() => {
    // Use filtered revenue data based on selections
    const filteredData = getFilteredRevenueData();
    
    // Group by week
    const weeklyData: Record<string, any> = {};
    
    filteredData.forEach(item => {
      const weekNumber = item.week;
      const weekLabel = `Week ${weekNumber}`;
      
      if (!weeklyData[weekLabel]) {
        weeklyData[weekLabel] = {
          name: weekLabel,
          week: weekNumber,
          revenue: 0,
          transactions: 0
        };
      }
      
      weeklyData[weekLabel].revenue += Number(item.revenue) || 0;
      weeklyData[weekLabel].transactions += Number(item.transactions) || 0;
    });
    
    // Convert to array and sort by week number
    return Object.values(weeklyData)
      .sort((a, b) => a.week - b.week);
  }, [getFilteredRevenueData]);

  // Get aggregate totals for the metrics cards
  const aggregateTotals = React.useMemo(() => {
    let impressions = 0;
    let clicks = 0;
    let ctr = 0;
    let revenue = 0;
    let roas = 0;
    let spend = 0;
    
    // Use filtered data for the totals
    const filteredMetricsData = getFilteredMetricsData();
    const filteredRevenueData = getFilteredRevenueData();
    
    // Aggregate metrics data
    filteredMetricsData.forEach(item => {
      impressions += Number(item.impressions) || 0;
      clicks += Number(item.clicks) || 0;
      spend += Number(item.spend) || 0;
    });
    
    // Calculate CTR
    if (impressions > 0) {
      ctr = (clicks / impressions) * 100;
    }
    
    // Aggregate revenue data
    filteredRevenueData.forEach(item => {
      revenue += Number(item.revenue) || 0;
    });
    
    // Calculate ROAS
    if (spend > 0) {
      roas = revenue / spend;
    }
    
    return {
      impressions,
      clicks,
      ctr,
      revenue,
      roas,
      spend
    };
  }, [getFilteredMetricsData, getFilteredRevenueData]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          {showLiveOnly && (
            <div className="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full">
              Showing Live Campaigns Only
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <CampaignStatusToggle />
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
          <TabsTrigger value="campaigns" className="flex-1">Campaign Details</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <MetricCard 
              title="Impressions" 
              anomalies={[]}
              metric="IMPRESSIONS"
              anomalyPeriod="daily"
            />
            <MetricCard 
              title="Clicks" 
              anomalies={[]}
              metric="CLICKS"
              anomalyPeriod="daily"
            />
            <MetricCard 
              title="CTR" 
              anomalies={[]}
              metric="CTR"
              anomalyPeriod="daily"
            />
            <MetricCard 
              title="Revenue" 
              anomalies={[]}
              metric="REVENUE"
              anomalyPeriod="daily"
            />
            <MetricCard 
              title="ROAS" 
              anomalies={[]}
              metric="ROAS"
              anomalyPeriod="daily"
            />
            <MetricCard 
              title="Ad Spend" 
              anomalies={[]}
              metric="SPEND"
              anomalyPeriod="daily"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Display Metrics Over Time</span>
                  <div className="flex items-center gap-2">
                    <MultiSelect 
                      options={metricsCampaignOptions}
                      selected={selectedMetricsCampaigns}
                      onChange={onMetricsCampaignsChange}
                      placeholder="Filter by Campaign"
                      className="w-[250px]"
                    />
                    {/* Add agency filter for Display Metrics */}
                    <MultiSelect 
                      options={revenueAgencyOptions}
                      selected={selectedRevenueAgencies}
                      onChange={onRevenueAgenciesChange}
                      placeholder="Filter by Agency"
                      className="w-[250px]"
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={getFilteredMetricsData()}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 25,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                    />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }}>
                      <Label 
                        value="Impressions" 
                        angle={-90} 
                        position="insideLeft" 
                        style={{ textAnchor: 'middle', fontSize: 12 }}
                      />
                    </YAxis>
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }}>
                      <Label 
                        value="Clicks" 
                        angle={90} 
                        position="insideRight" 
                        style={{ textAnchor: 'middle', fontSize: 12 }}
                      />
                    </YAxis>
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="impressions"
                      stroke="#8884d8"
                      dot={false}
                      name="Impressions"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="clicks"
                      stroke="#82ca9d"
                      dot={false}
                      name="Clicks"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Attribution Revenue Over Time</span>
                  <div className="flex flex-wrap justify-end gap-2">
                    <MultiSelect 
                      options={revenueCampaignOptions}
                      selected={selectedRevenueCampaigns}
                      onChange={onRevenueCampaignsChange}
                      placeholder="Filter by Campaign"
                      className="w-[200px]"
                    />
                    <MultiSelect 
                      options={revenueAdvertiserOptions}
                      selected={selectedRevenueAdvertisers}
                      onChange={onRevenueAdvertisersChange}
                      placeholder="Filter by Advertiser"
                      className="w-[200px]"
                    />
                    {/* Add agency filter for Attribution Revenue */}
                    <MultiSelect 
                      options={revenueAgencyOptions}
                      selected={selectedRevenueAgencies}
                      onChange={onRevenueAgenciesChange}
                      placeholder="Filter by Agency"
                      className="w-[200px]"
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={getFilteredRevenueData()}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 25,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fontSize: 12 }}>
                      <Label 
                        value="Revenue ($)" 
                        angle={-90} 
                        position="insideLeft" 
                        style={{ textAnchor: 'middle', fontSize: 12 }}
                      />
                    </YAxis>
                    <Tooltip formatter={(value) => [`$${value}`, "Revenue"]} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#82ca9d"
                      dot={false}
                      name="Revenue"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Weekly Comparison</span>
                <div className="flex flex-wrap justify-end gap-2">
                  <MultiSelect 
                    options={revenueCampaignOptions}
                    selected={selectedRevenueCampaigns}
                    onChange={onRevenueCampaignsChange}
                    placeholder="Filter by Campaign"
                    className="w-[200px]"
                  />
                  <MultiSelect 
                    options={revenueAdvertiserOptions}
                    selected={selectedRevenueAdvertisers}
                    onChange={onRevenueAdvertisersChange}
                    placeholder="Filter by Advertiser"
                    className="w-[200px]"
                  />
                  {/* Add agency filter for Weekly Comparison */}
                  <MultiSelect 
                    options={revenueAgencyOptions}
                    selected={selectedRevenueAgencies}
                    onChange={onRevenueAgenciesChange}
                    placeholder="Filter by Agency"
                    className="w-[200px]"
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weeklyComparisonData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis 
                    yAxisId="left"
                    orientation="left"
                    label={{ 
                      value: 'Revenue ($)', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle' }
                    }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    label={{ 
                      value: 'Transactions', 
                      angle: 90, 
                      position: 'insideRight',
                      style: { textAnchor: 'middle' }
                    }}
                  />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    yAxisId="left"
                    dataKey="revenue" 
                    fill="#8884d8" 
                    name="Revenue"
                  />
                  <Bar 
                    yAxisId="right"
                    dataKey="transactions" 
                    fill="#82ca9d" 
                    name="Transactions" 
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <AnomalyDetails 
            anomalies={[]}
            metric="REVENUE"
            anomalyPeriod="daily"
          />
        </TabsContent>
        <TabsContent value="campaigns" className="space-y-4">
          <CampaignSparkCharts data={filteredData} dateRange={dateRange} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
