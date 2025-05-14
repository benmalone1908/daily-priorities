import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MultiSelect, Option } from '@/components/MultiSelect';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useIsMobile } from '@/hooks/use-mobile';
import SparkChartModal from './SparkChartModal';
import CampaignSparkCharts from './CampaignSparkCharts';
import MetricCard from './MetricCard';
import { AnomalyColor } from '@/utils/anomalyColors';
import AnomalyDetails from './AnomalyDetails';
import { CampaignStatusToggle } from './CampaignStatusToggle';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

interface Anomaly {
  date: string;
  metric: string;
  expected: number;
  actual: number;
  campaign: string;
}

interface CampaignMetrics {
  campaign: string;
  impressions: number;
  clicks: number;
  revenue: number;
  transactions: number;
}

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

interface DashboardProps {
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
  selectedWeeklyCampaigns?: string[]; // Changed from selectedWeeklyCampaign (string)
  onWeeklyCampaignsChange?: (selected: string[]) => void; // Changed handler
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
  selectedWeeklyCampaigns = [], // Default to empty array
  onWeeklyCampaignsChange = () => {}, // Default no-op function
}: DashboardProps) => {
  const isMobile = useIsMobile();
  const [showSparkChart, setShowSparkChart] = useState(false);
  const [sparkChartData, setSparkChartData] = useState<any[]>([]);
  const [sparkChartTitle, setSparkChartTitle] = useState('');
  const [showAnomalies, setShowAnomalies] = useState(false);
  
  // Filter campaign names from data
  const campaignNames = useMemo(() => {
    const names = new Set<string>();
    data.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"];
      if (campaignName && campaignName !== 'Totals') {
        names.add(campaignName);
      }
    });
    return Array.from(names).sort();
  }, [data]);
  
  // Process anomalies
  const anomalies: Anomaly[] = useMemo(() => {
    if (!metricsData) return [];
    return metricsData.map(item => ({
      date: item.DATE,
      metric: item.METRIC,
      expected: item.EXPECTED,
      actual: item.ACTUAL,
      campaign: item.CAMPAIGN,
    }));
  }, [metricsData]);
  
  // Aggregate campaign metrics
  const aggregatedCampaignMetrics: CampaignMetrics[] = useMemo(() => {
    const campaignMetricsMap: Record<string, CampaignMetrics> = {};
    
    data.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"];
      if (campaignName && campaignName !== 'Totals') {
        if (!campaignMetricsMap[campaignName]) {
          campaignMetricsMap[campaignName] = {
            campaign: campaignName,
            impressions: 0,
            clicks: 0,
            revenue: 0,
            transactions: 0,
          };
        }
        
        campaignMetricsMap[campaignName].impressions += Number(row.IMPRESSIONS) || 0;
        campaignMetricsMap[campaignName].clicks += Number(row.CLICKS) || 0;
        campaignMetricsMap[campaignName].revenue += Number(row.REVENUE) || 0;
        campaignMetricsMap[campaignName].transactions += Number(row.TRANSACTIONS) || 0;
      }
    });
    
    return Object.values(campaignMetricsMap);
  }, [data]);
  
  // Calculate total metrics
  const totalImpressions = useMemo(() => aggregatedMetricsData.reduce((sum, day) => sum + day.IMPRESSIONS, 0), [aggregatedMetricsData]);
  const totalClicks = useMemo(() => aggregatedMetricsData.reduce((sum, day) => sum + day.CLICKS, 0), [aggregatedMetricsData]);
  const totalRevenue = useMemo(() => aggregatedMetricsData.reduce((sum, day) => sum + day.REVENUE, 0), [aggregatedMetricsData]);
  const totalTransactions = useMemo(() => aggregatedMetricsData.reduce((sum, day) => sum + day.TRANSACTIONS, 0), [aggregatedMetricsData]);

  // Get weekly data for last 4 weeks
  const getWeeklyData = useMemo(() => {
    // If no campaigns are selected, return an empty array
    if (!selectedWeeklyCampaigns || selectedWeeklyCampaigns.length === 0) {
      return [];
    }
    
    // Create a lookup set for faster membership checking
    const selectedCampaignsSet = new Set(selectedWeeklyCampaigns);
    
    // Group data by week
    const weeklyData: Record<string, any> = {};
    
    data.forEach(row => {
      if (!row || !row.DATE || row.DATE === 'Totals') return;
      
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      // Check if this campaign is in our selected campaigns
      if (!selectedCampaignsSet.has(campaignName)) return;
      
      const date = new Date(row.DATE);
      if (isNaN(date.getTime())) return;
      
      // Get the week number (Sunday-based)
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().slice(0, 10);
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          week: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          impressions: 0,
          clicks: 0,
          revenue: 0
        };
      }
      
      weeklyData[weekKey].impressions += Number(row.IMPRESSIONS) || 0;
      weeklyData[weekKey].clicks += Number(row.CLICKS) || 0;
      weeklyData[weekKey].revenue += Number(row.REVENUE) || 0;
    });
    
    // Sort and limit to last 4 weeks
    return Object.values(weeklyData)
      .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime())
      .slice(-4);
  }, [data, selectedWeeklyCampaigns]);

  const handleSparkChartClick = (campaignName: string) => {
    const filteredData = data.filter(item => item["CAMPAIGN ORDER NAME"] === campaignName);
    setSparkChartData(filteredData);
    setSparkChartTitle(campaignName);
    setShowSparkChart(true);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Campaign Dashboard</h1>
      
      <CampaignStatusToggle />
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <MetricCard title="Total Impressions" anomalies={[]} metric="IMPRESSIONS" anomalyPeriod="daily" />
        <MetricCard title="Total Clicks" anomalies={[]} metric="CLICKS" anomalyPeriod="daily" />
        <MetricCard title="Total Revenue" anomalies={[]} metric="REVENUE" anomalyPeriod="daily" />
        <MetricCard title="Total Transactions" anomalies={[]} metric="TRANSACTIONS" anomalyPeriod="daily" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* Weekly Comparison Chart - Updated to use MultiSelect */}
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-2">Weekly Comparison</h2>
          <div className="mb-4">
            <MultiSelect
              options={formattedCampaignOptions}
              selected={selectedWeeklyCampaigns || []}
              onChange={onWeeklyCampaignsChange}
              placeholder="Select campaigns"
              className="w-full"
            />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getWeeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
              <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="impressions" fill="#8884d8" name="Impressions" />
              <Bar yAxisId="right" dataKey="revenue" fill="#82ca9d" name="Revenue ($)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        
        {/* Attribution Revenue Chart */}
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-2">Attribution Revenue</h2>
          <div className="mb-4 space-y-2">
            <div>
              <p className="text-sm font-medium">Campaigns:</p>
              <MultiSelect
                options={formattedCampaignOptions}
                selected={selectedRevenueCampaigns}
                onChange={onRevenueCampaignsChange}
                placeholder="Select campaigns"
              />
            </div>
            <Separator className="my-2" />
            <div>
              <p className="text-sm font-medium">Advertisers:</p>
              <MultiSelect
                options={formattedAdvertiserOptions}
                selected={selectedRevenueAdvertisers}
                onChange={onRevenueAdvertisersChange}
                placeholder="Select advertisers"
              />
            </div>
            <Separator className="my-2" />
            <div>
              <p className="text-sm font-medium">Agencies:</p>
              <MultiSelect
                options={formattedAgencyOptions}
                selected={selectedRevenueAgencies}
                onChange={onRevenueAgenciesChange}
                placeholder="Select agencies"
              />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={revenueData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={isMobile ? 80 : 100}
                fill="#8884d8"
                label={renderCustomizedLabel}
                labelLine={false}
              >
                {revenueData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Campaign Metrics Details</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impressions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clicks</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {aggregatedCampaignMetrics.map((campaign, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">{campaign.campaign}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{campaign.impressions}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{campaign.clicks}</td>
                  <td className="px-6 py-4 whitespace-nowrap">${campaign.revenue.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{campaign.transactions}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      className="text-blue-500 hover:text-blue-700"
                      onClick={() => handleSparkChartClick(campaign.campaign)}
                    >
                      View Chart
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {showAnomalies && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Anomalies</h2>
          {anomalies.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Anomaly Score</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {anomalies.map((anomaly, index) => {
                    const anomalyScore = Math.abs(anomaly.actual - anomaly.expected) / anomaly.expected;
                    let anomalyColorClass = AnomalyColor(anomalyScore);
                    
                    return (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">{anomaly.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{anomaly.campaign}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{anomaly.metric}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{anomaly.expected.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{anomaly.actual.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`px-2 py-1 rounded inline-block ${anomalyColorClass}`}>
                            {(anomalyScore * 100).toFixed(1)}%
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No anomalies found.</p>
          )}
        </div>
      )}
      
      {showSparkChart && (
        <SparkChartModal
          open={showSparkChart}
          onOpenChange={() => setShowSparkChart(false)}
          data={sparkChartData}
          title={sparkChartTitle}
        />
      )}
    </div>
  );
};

export default Dashboard;
