import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CombinedMetricsChart from "./CombinedMetricsChart";
import { MultiSelect } from "./MultiSelect";
import { formatNumber } from "@/lib/utils";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { useCampaignFilter } from "@/contexts/CampaignFilterContext";

interface DashboardProps {
  data: any[];
  metricsData: any[];
  revenueData: any[];
  selectedMetricsCampaigns: string[];
  selectedRevenueCampaigns: string[];
  selectedRevenueAdvertisers: string[];
  selectedRevenueAgencies: string[];
  selectedMetricsAdvertisers: string[];
  selectedMetricsAgencies: string[];
  onMetricsCampaignsChange: (selected: string[]) => void;
  onRevenueCampaignsChange: (selected: string[]) => void;
  onRevenueAdvertisersChange: (selected: string[]) => void;
  onRevenueAgenciesChange: (selected: string[]) => void;
  onMetricsAdvertisersChange: (selected: string[]) => void;
  onMetricsAgenciesChange: (selected: string[]) => void;
  sortedCampaignOptions: string[];
  sortedAdvertiserOptions: string[];
  sortedAgencyOptions: string[];
  formattedCampaignOptions: any[];
  formattedAdvertiserOptions: any[];
  formattedAgencyOptions: any[];
  aggregatedMetricsData: any[];
  agencyToAdvertisersMap: Record<string, Set<string>>;
  agencyToCampaignsMap: Record<string, Set<string>>;
  advertiserToCampaignsMap: Record<string, Set<string>>;
  selectedWeeklyCampaigns: string[];
  onWeeklyCampaignsChange: (selected: string[]) => void;
  useGlobalFilters?: boolean;
  hideCharts?: string[];
  chartToggleComponent?: React.ReactNode;
  activeTab?: string;
  onChartTabChange?: (tab: string) => void;
  viewByDate?: boolean;
  hideChartTitle?: boolean;
  contractTermsData?: any[];
  customBarMetric?: string;
  customLineMetric?: string;
}

const Dashboard = ({
  data,
  metricsData,
  revenueData,
  selectedMetricsCampaigns,
  selectedRevenueCampaigns,
  selectedRevenueAdvertisers,
  selectedRevenueAgencies,
  selectedMetricsAdvertisers,
  selectedMetricsAgencies,
  onMetricsCampaignsChange,
  onRevenueCampaignsChange,
  onRevenueAdvertisersChange,
  onRevenueAgenciesChange,
  onMetricsAdvertisersChange,
  onMetricsAgenciesChange,
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
  selectedWeeklyCampaigns,
  onWeeklyCampaignsChange,
  useGlobalFilters = false,
  hideCharts = [],
  chartToggleComponent,
  activeTab,
  onChartTabChange,
  viewByDate = true,
  hideChartTitle = false,
  contractTermsData,
  customBarMetric,
  customLineMetric
}: DashboardProps) => {
  const { extractAdvertiserName, isTestCampaign, extractAgencyInfo } = useCampaignFilter();

  // State for managing chart visibility and interactions
  const [isLoading, setIsLoading] = useState(false);

  // Early return if no data
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  // Use filtered data for weekly comparison when global filters are enabled
  const weeklyComparisonData = useMemo(() => {
    // Use filtered data if global filters are enabled, otherwise use original data
    const sourceData = useGlobalFilters ? metricsData : data;
    
    if (!sourceData || sourceData.length === 0) return [];
    
    const weeklyData: Record<string, any> = {};
    
    sourceData.forEach(row => {
      if (!row.DATE || row.DATE === 'Totals') return;
      
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      if (isTestCampaign(campaignName)) return;
      
      // Filter by selected campaigns if any are selected
      if (selectedWeeklyCampaigns.length > 0 && !selectedWeeklyCampaigns.includes(campaignName)) {
        return;
      }
      
      try {
        const date = new Date(row.DATE);
        if (isNaN(date.getTime())) return;
        
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
        
        if (!weeklyData[dayOfWeek]) {
          weeklyData[dayOfWeek] = {
            day: dayOfWeek,
            impressions: 0,
            clicks: 0,
            revenue: 0,
            transactions: 0,
            spend: 0
          };
        }
        
        weeklyData[dayOfWeek].impressions += Number(row.IMPRESSIONS) || 0;
        weeklyData[dayOfWeek].clicks += Number(row.CLICKS) || 0;
        weeklyData[dayOfWeek].revenue += Number(row.REVENUE) || 0;
        weeklyData[dayOfWeek].transactions += Number(row.TRANSACTIONS) || 0;
        weeklyData[dayOfWeek].spend += Number(row.SPEND) || 0;
      } catch (error) {
        console.error('Error processing date:', row.DATE, error);
      }
    });
    
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return daysOfWeek.map(day => weeklyData[day] || {
      day,
      impressions: 0,
      clicks: 0,
      revenue: 0,
      transactions: 0,
      spend: 0
    });
  }, [useGlobalFilters ? metricsData : data, selectedWeeklyCampaigns, isTestCampaign, useGlobalFilters]);

  // Determine which data to use for the main charts
  const chartData = useGlobalFilters ? metricsData : data;

  return (
    <div className="space-y-6">
      {/* Chart Toggle Component */}
      {chartToggleComponent && (
        <div className="flex justify-center mb-4">
          {chartToggleComponent}
        </div>
      )}

      {/* Main Charts Section */}
      <div className="space-y-6">
        {/* Metrics Chart */}
        {!hideCharts.includes("metricsChart") && (
          <Card>
            <CardHeader>
              {!hideChartTitle && (
                <CardTitle className="text-lg font-semibold">
                  Campaign Metrics Over Time
                </CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <CombinedMetricsChart
                data={chartData}
                title="Campaign Metrics Over Time"
                onTabChange={onChartTabChange}
                initialTab={activeTab}
                customBarMetric={customBarMetric}
                customLineMetric={customLineMetric}
              />
            </CardContent>
          </Card>
        )}

        {/* Revenue Chart */}
        {!hideCharts.includes("revenueChart") && (
          <Card>
            <CardHeader>
              {!hideChartTitle && (
                <CardTitle className="text-lg font-semibold">
                  Revenue Attribution Over Time
                </CardTitle>
              )}
            </CardHeader>
            <CardContent>
              <CombinedMetricsChart
                data={revenueData}
                title="Revenue Attribution Over Time"
                onTabChange={onChartTabChange}
                initialTab={activeTab}
                customBarMetric={customBarMetric}
                customLineMetric={customLineMetric}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Weekly Comparison Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Weekly Performance Comparison</CardTitle>
            <div className="w-64">
              <MultiSelect
                options={formattedCampaignOptions}
                selected={selectedWeeklyCampaigns}
                onChange={onWeeklyCampaignsChange}
                placeholder="Select campaigns to compare"
                className="w-full"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyComparisonData}>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'revenue') return [`$${formatNumber(value)}`, 'Revenue'];
                    return [formatNumber(value), name.charAt(0).toUpperCase() + name.slice(1)];
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="impressions" stroke="#8884d8" strokeWidth={2} />
                <Line type="monotone" dataKey="clicks" stroke="#82ca9d" strokeWidth={2} />
                <Line type="monotone" dataKey="revenue" stroke="#ffc658" strokeWidth={2} />
                <Line type="monotone" dataKey="transactions" stroke="#ff7300" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
