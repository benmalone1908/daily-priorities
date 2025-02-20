import { useMemo, useState } from "react";
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
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AnomalyDetails from "./AnomalyDetails";

interface DashboardProps {
  data: any[];
}

interface WeeklyData {
  periodStart: string;
  IMPRESSIONS: number;
  CLICKS: number;
  REVENUE: number;
  count: number;
}

const Dashboard = ({ data }: DashboardProps) => {
  const [selectedMetricsCampaign, setSelectedMetricsCampaign] = useState<string>("all");
  const [selectedRevenueCampaign, setSelectedRevenueCampaign] = useState<string>("all");

  const campaigns = useMemo(() => {
    if (!data.length) return [];
    return Array.from(new Set(data.map(row => row["CAMPAIGN ORDER NAME"]))).sort();
  }, [data]);

  const anomalies = useMemo(() => {
    if (!data.length) return null;

    const campaignData: Record<string, any[]> = {};
    data.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"];
      if (!campaignData[campaignName]) {
        campaignData[campaignName] = [];
      }
      campaignData[campaignName].push(row);
    });

    const metrics = ["IMPRESSIONS", "CLICKS", "REVENUE"];
    const results: Record<string, any> = {};

    metrics.forEach((metric) => {
      let allAnomalies: any[] = [];

      Object.entries(campaignData).forEach(([campaign, campaignRows]) => {
        const values = campaignRows.map((row) => Number(row[metric]) || 0);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(
          values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
        );

        const threshold = stdDev * 2;

        const campaignAnomalies = campaignRows.filter((row) => {
          const value = Number(row[metric]) || 0;
          return Math.abs(value - mean) > threshold;
        }).map(row => ({
          ...row,
          campaign,
          mean,
          actualValue: Number(row[metric]) || 0,
          deviation: ((Number(row[metric]) || 0) - mean) / mean * 100
        }));

        allAnomalies = [...allAnomalies, ...campaignAnomalies];
      });

      results[metric] = {
        anomalies: allAnomalies.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))
      };
    });

    return results;
  }, [data]);

  const getAggregatedData = (campaign: string) => {
    const filteredData = campaign === "all" 
      ? data 
      : data.filter(row => row["CAMPAIGN ORDER NAME"] === campaign);

    const dateGroups = filteredData.reduce((acc, row) => {
      const date = row.DATE;
      if (!acc[date]) {
        acc[date] = {
          DATE: date,
          IMPRESSIONS: 0,
          CLICKS: 0,
          REVENUE: 0
        };
      }
      acc[date].IMPRESSIONS += Number(row.IMPRESSIONS) || 0;
      acc[date].CLICKS += Number(row.CLICKS) || 0;
      acc[date].REVENUE += Number(row.REVENUE) || 0;
      return acc;
    }, {});

    return Object.values(dateGroups).sort((a: any, b: any) => 
      new Date(a.DATE).getTime() - new Date(b.DATE).getTime()
    );
  };

  const getWeeklyData = () => {
    const filteredData = selectedMetricsCampaign === "all" 
      ? data 
      : data.filter(row => row["CAMPAIGN ORDER NAME"] === selectedMetricsCampaign);

    const sortedData = [...filteredData].sort((a, b) => 
      new Date(b.DATE).getTime() - new Date(a.DATE).getTime()
    );

    if (sortedData.length === 0) return [];

    const mostRecentDate = new Date(sortedData[0].DATE);
    
    const periods: WeeklyData[] = [
      {
        periodStart: mostRecentDate.toISOString().split('T')[0],
        IMPRESSIONS: 0,
        CLICKS: 0,
        REVENUE: 0,
        count: 0
      },
      {
        periodStart: new Date(mostRecentDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        IMPRESSIONS: 0,
        CLICKS: 0,
        REVENUE: 0,
        count: 0
      }
    ];

    sortedData.forEach(row => {
      const rowDate = new Date(row.DATE);
      const daysDiff = Math.floor((mostRecentDate.getTime() - rowDate.getTime()) / (24 * 60 * 60 * 1000));
      
      if (daysDiff < 7) {
        periods[0].IMPRESSIONS += Number(row.IMPRESSIONS) || 0;
        periods[0].CLICKS += Number(row.CLICKS) || 0;
        periods[0].REVENUE += Number(row.REVENUE) || 0;
        periods[0].count += 1;
      } else if (daysDiff < 14) {
        periods[1].IMPRESSIONS += Number(row.IMPRESSIONS) || 0;
        periods[1].CLICKS += Number(row.CLICKS) || 0;
        periods[1].REVENUE += Number(row.REVENUE) || 0;
        periods[1].count += 1;
      }
    });

    return periods;
  };

  const weeklyData = useMemo(() => getWeeklyData(), [data, selectedMetricsCampaign]);
  const metricsData = useMemo(() => getAggregatedData(selectedMetricsCampaign), [data, selectedMetricsCampaign]);
  const revenueData = useMemo(() => getAggregatedData(selectedRevenueCampaign), [data, selectedRevenueCampaign]);

  const formatNumber = (value: number) => {
    return value.toLocaleString();
  };

  const formatRevenue = (value: number) => {
    return `$${Math.round(value).toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getMetricComparison = (metric: string, recentPeriod: WeeklyData, previousPeriod: WeeklyData) => {
    const currentValue = recentPeriod[metric];
    const previousValue = previousPeriod[metric];
    const percentChange = ((currentValue - previousValue) / previousValue) * 100;

    return {
      currentValue,
      previousValue,
      percentChange,
      increased: percentChange > 0
    };
  };

  const axisStyle = {
    fontSize: '0.75rem'
  };

  const labelStyle = {
    fontSize: '0.75rem',
    fill: '#64748b'
  };

  if (!anomalies) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Impression Anomalies"
          anomalies={anomalies.IMPRESSIONS.anomalies}
          metric="IMPRESSIONS"
        />
        <MetricCard
          title="Click Anomalies"
          anomalies={anomalies.CLICKS.anomalies}
          metric="CLICKS"
        />
        <MetricCard
          title="Revenue Anomalies"
          anomalies={anomalies.REVENUE.anomalies}
          metric="REVENUE"
        />
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Display Metrics Over Time</h3>
          <Select value={selectedMetricsCampaign} onValueChange={setSelectedMetricsCampaign}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Filter by campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns.map(campaign => (
                <SelectItem key={campaign} value={campaign}>{campaign}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={metricsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="DATE" 
                style={axisStyle}
              />
              <YAxis 
                yAxisId="left"
                orientation="left"
                stroke="#4ade80"
                label={{ value: 'Impressions', angle: -90, position: 'insideLeft', ...labelStyle }}
                tickFormatter={formatNumber}
                style={axisStyle}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#f59e0b"
                label={{ value: 'Clicks', angle: 90, position: 'insideRight', ...labelStyle }}
                tickFormatter={formatNumber}
                style={axisStyle}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [formatNumber(value), name]}
                contentStyle={{ fontSize: '0.75rem' }}
              />
              <Bar
                yAxisId="left"
                dataKey="IMPRESSIONS"
                fill="#4ade80"
                opacity={0.8}
                name="Impressions"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="CLICKS"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                name="Clicks"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Attribution Revenue Over Time</h3>
          <Select value={selectedRevenueCampaign} onValueChange={setSelectedRevenueCampaign}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Filter by campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns.map(campaign => (
                <SelectItem key={campaign} value={campaign}>{campaign}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="DATE" 
                style={axisStyle}
              />
              <YAxis 
                yAxisId="left"
                orientation="left"
                stroke="#4ade80"
                label={{ value: 'Impressions', angle: -90, position: 'insideLeft', ...labelStyle }}
                tickFormatter={formatNumber}
                style={axisStyle}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#ef4444"
                label={{ value: 'Revenue ($)', angle: 90, position: 'insideRight', ...labelStyle }}
                tickFormatter={formatRevenue}
                style={axisStyle}
              />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === "Revenue") return [formatRevenue(value), name];
                  return [formatNumber(value), name];
                }}
                contentStyle={{ fontSize: '0.75rem' }}
              />
              <Bar
                yAxisId="left"
                dataKey="IMPRESSIONS"
                fill="#4ade80"
                opacity={0.8}
                name="Impressions"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="REVENUE"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                name="Revenue"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">7-Day Period Comparison</h3>
        </div>

        {weeklyData.length >= 2 ? (
          <div className="grid gap-8 md:grid-cols-3">
            {/* Impressions Comparison */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Impressions</h4>
              <Card className="p-4">
                <h5 className="mb-2 text-sm font-medium text-muted-foreground">Previous 7 Days</h5>
                <p className="mb-1 text-2xl font-bold">
                  {formatNumber(weeklyData[1].IMPRESSIONS)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(weeklyData[1].periodStart)} - {' '}
                  {formatDate(new Date(new Date(weeklyData[1].periodStart).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString())}
                </p>
              </Card>
              <Card className="p-4">
                <h5 className="mb-2 text-sm font-medium text-muted-foreground">Most Recent 7 Days</h5>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">
                    {formatNumber(weeklyData[0].IMPRESSIONS)}
                  </p>
                  {(() => {
                    const comparison = getMetricComparison('IMPRESSIONS', weeklyData[0], weeklyData[1]);
                    return (
                      <div className={`flex items-center ${comparison.increased ? 'text-alert' : 'text-warning'}`}>
                        {comparison.increased ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span className="ml-1 text-sm">
                          {comparison.increased ? '+' : ''}{comparison.percentChange.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })()}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDate(weeklyData[0].periodStart)} - {' '}
                  {formatDate(new Date(new Date(weeklyData[0].periodStart).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString())}
                </p>
              </Card>
            </div>

            {/* Clicks Comparison */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Clicks</h4>
              <Card className="p-4">
                <h5 className="mb-2 text-sm font-medium text-muted-foreground">Previous 7 Days</h5>
                <p className="mb-1 text-2xl font-bold">
                  {formatNumber(weeklyData[1].CLICKS)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(weeklyData[1].periodStart)} - {' '}
                  {formatDate(new Date(new Date(weeklyData[1].periodStart).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString())}
                </p>
              </Card>
              <Card className="p-4">
                <h5 className="mb-2 text-sm font-medium text-muted-foreground">Most Recent 7 Days</h5>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">
                    {formatNumber(weeklyData[0].CLICKS)}
                  </p>
                  {(() => {
                    const comparison = getMetricComparison('CLICKS', weeklyData[0], weeklyData[1]);
                    return (
                      <div className={`flex items-center ${comparison.increased ? 'text-alert' : 'text-warning'}`}>
                        {comparison.increased ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span className="ml-1 text-sm">
                          {comparison.increased ? '+' : ''}{comparison.percentChange.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })()}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDate(weeklyData[0].periodStart)} - {' '}
                  {formatDate(new Date(new Date(weeklyData[0].periodStart).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString())}
                </p>
              </Card>
            </div>

            {/* Revenue Comparison */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Revenue</h4>
              <Card className="p-4">
                <h5 className="mb-2 text-sm font-medium text-muted-foreground">Previous 7 Days</h5>
                <p className="mb-1 text-2xl font-bold">
                  {formatRevenue(weeklyData[1].REVENUE)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(weeklyData[1].periodStart)} - {' '}
                  {formatDate(new Date(new Date(weeklyData[1].periodStart).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString())}
                </p>
              </Card>
              <Card className="p-4">
                <h5 className="mb-2 text-sm font-medium text-muted-foreground">Most Recent 7 Days</h5>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">
                    {formatRevenue(weeklyData[0].REVENUE)}
                  </p>
                  {(() => {
                    const comparison = getMetricComparison('REVENUE', weeklyData[0], weeklyData[1]);
                    return (
                      <div className={`flex items-center ${comparison.increased ? 'text-alert' : 'text-warning'}`}>
                        {comparison.increased ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span className="ml-1 text-sm">
                          {comparison.increased ? '+' : ''}{comparison.percentChange.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })()}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDate(weeklyData[0].periodStart)} - {' '}
                  {formatDate(new Date(new Date(weeklyData[0].periodStart).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString())}
                </p>
              </Card>
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground">
            Not enough data for period comparison
          </p>
        )}
      </Card>
    </div>
  );
};

const MetricCard = ({
  title,
  anomalies,
  metric
}: {
  title: string;
  anomalies: any[];
  metric: string;
}) => (
  <Card className="p-6 transition-all duration-300 hover:shadow-lg">
    <div className="flex items-start justify-between">
      <div>
        <h3 className="font-medium text-muted-foreground">{title}</h3>
        <p className="mt-2 text-2xl font-bold">{anomalies.length}</p>
      </div>
      {anomalies.length > 0 && (
        <div
          className={`p-2 rounded-full ${
            anomalies[0].deviation > 0
              ? "bg-alert/10 text-alert"
              : "bg-warning/10 text-warning"
          }`}
        >
          {anomalies[0].deviation > 0 ? (
            <TrendingUp className="w-5 h-5" />
          ) : (
            <TrendingDown className="w-5 h-5" />
          )}
        </div>
      )}
    </div>
    {anomalies.length > 0 && (
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2" />
            <span>Top anomalies:</span>
          </div>
          <AnomalyDetails anomalies={anomalies} metric={metric} />
        </div>
        {anomalies.slice(0, 2).map((anomaly, idx) => (
          <div key={idx} className="text-sm space-y-1">
            <div className="font-medium">{anomaly.campaign}</div>
            <div className="text-muted-foreground">
              Date: {anomaly.DATE} - {metric}: {anomaly.actualValue.toLocaleString()} 
              <span className={anomaly.deviation > 0 ? "text-alert" : "text-warning"}>
                {" "}({anomaly.deviation > 0 ? "+" : ""}{anomaly.deviation.toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
  </Card>
);

export default Dashboard;
