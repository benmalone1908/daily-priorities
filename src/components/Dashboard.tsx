
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
import { getColorClasses } from "@/utils/anomalyColors";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface DashboardProps {
  data: any[];
}

interface WeeklyData {
  periodStart: string;
  periodEnd: string;  // Added period end date for clarity
  IMPRESSIONS: number;
  CLICKS: number;
  REVENUE: number;
  ROAS: number;
  count: number;
}

// Interface for weekly aggregated data
interface WeeklyAggregation {
  weekStart: string;
  [metric: string]: any;
  rows: any[];
}

type AnomalyPeriod = "daily" | "weekly";

const Dashboard = ({ data }: DashboardProps) => {
  const [selectedMetricsCampaign, setSelectedMetricsCampaign] = useState<string>("all");
  const [selectedRevenueCampaign, setSelectedRevenueCampaign] = useState<string>("all");
  const [anomalyPeriod, setAnomalyPeriod] = useState<AnomalyPeriod>("daily");

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

      if (anomalyPeriod === "daily") {
        // Daily anomaly detection (existing logic)
        Object.entries(campaignData).forEach(([campaign, campaignRows]) => {
          const values = campaignRows.map((row) => Number(row[metric]) || 0);
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          const stdDev = Math.sqrt(
            values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
          );

          const threshold = stdDev * 2;

          const campaignAnomalies = campaignRows.filter((row) => {
            const value = Number(row[metric]) || 0;
            
            // Calculate deviation percentage
            const deviationPercent = ((value - mean) / mean) * 100;
            
            // Only include anomalies with more than 10% deviation (either direction)
            return Math.abs(deviationPercent) > 10 && Math.abs(value - mean) > threshold;
          }).map(row => ({
            ...row,
            campaign,
            mean,
            actualValue: Number(row[metric]) || 0,
            deviation: ((Number(row[metric]) || 0) - mean) / mean * 100,
            periodType: "daily"
          }));

          allAnomalies = [...allAnomalies, ...campaignAnomalies];
        });
      } else {
        // Week-over-week anomaly detection
        Object.entries(campaignData).forEach(([campaign, campaignRows]) => {
          // Group rows by week
          const weeklyData = campaignRows.reduce<Record<string, WeeklyAggregation>>((weeks, row) => {
            const date = new Date(row.DATE);
            // Get the week start (Sunday)
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            const weekKey = weekStart.toISOString().split('T')[0];
            
            if (!weeks[weekKey]) {
              weeks[weekKey] = {
                weekStart: weekKey,
                [metric]: 0,
                rows: []
              };
            }
            
            weeks[weekKey][metric] += Number(row[metric]) || 0;
            weeks[weekKey].rows.push(row);
            
            return weeks;
          }, {});
          
          const weeklyValues = Object.values(weeklyData);
          
          // We need at least 2 weeks of data for meaningful week-over-week analysis
          // Changed from 3 to 2 to handle smaller datasets
          if (weeklyValues.length < 2) return;
          
          const weeklyMetricValues = weeklyValues.map(week => week[metric]);
          const mean = weeklyMetricValues.reduce((a, b) => a + b, 0) / weeklyMetricValues.length;
          const stdDev = Math.sqrt(
            weeklyMetricValues.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / weeklyMetricValues.length
          );
          
          const threshold = stdDev * 2;
          
          // Sort weeks by date (newest first)
          const sortedWeeks = weeklyValues.sort((a, b) => 
            new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
          );
          
          // Check each week against the mean
          sortedWeeks.forEach((week, index) => {
            // Skip the most recent week if it's incomplete
            if (index === 0 && new Date().getDay() < 5) return;
            
            const value = week[metric];
            const deviationPercent = ((value - mean) / mean) * 100;
            
            if (Math.abs(deviationPercent) > 10 && Math.abs(value - mean) > threshold) {
              const weekStart = new Date(week.weekStart);
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekStart.getDate() + 6);
              
              allAnomalies.push({
                campaign,
                DATE: `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`,
                mean,
                actualValue: value,
                deviation: deviationPercent,
                periodType: "weekly",
                rows: week.rows
              });
            }
          });
        });
      }

      results[metric] = {
        anomalies: allAnomalies.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))
      };
    });

    return results;
  }, [data, anomalyPeriod]);

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

  const calculateROAS = (revenue: number, impressions: number): number => {
    const spend = (impressions * 15) / 1000; // $15 CPM
    return spend > 0 ? revenue / spend : 0;
  };

  const getWeeklyData = () => {
    try {
      const filteredData = selectedMetricsCampaign === "all" 
        ? data 
        : data.filter(row => row["CAMPAIGN ORDER NAME"] === selectedMetricsCampaign);

      // If there's no data, return empty array
      if (!filteredData.length) {
        console.log("No data available for weekly comparison");
        return [];
      }

      // Sort data by date (ascending)
      const sortedData = [...filteredData].sort((a, b) => 
        new Date(a.DATE).getTime() - new Date(b.DATE).getTime()
      );

      // Get date range
      const startDate = new Date(sortedData[0].DATE);
      const endDate = new Date(sortedData[sortedData.length - 1].DATE);

      // Calculate most recent complete week
      const mostRecentDate = new Date(endDate);
      
      // Find the start of the most recent complete week
      // This will be the most recent Sunday that is at least 7 days from the earliest date
      const endOfRecentPeriod = new Date(mostRecentDate);
      endOfRecentPeriod.setHours(0, 0, 0, 0);
      
      // Find the last complete 7-day period (ending at endOfRecentPeriod)
      const startOfRecentPeriod = new Date(endOfRecentPeriod);
      startOfRecentPeriod.setDate(endOfRecentPeriod.getDate() - 6);
      
      // Calculate previous period
      const endOfPreviousPeriod = new Date(startOfRecentPeriod);
      endOfPreviousPeriod.setDate(endOfPreviousPeriod.getDate() - 1);
      
      const startOfPreviousPeriod = new Date(endOfPreviousPeriod);
      startOfPreviousPeriod.setDate(endOfPreviousPeriod.getDate() - 6);
      
      // Ensure previous period is within our data range
      if (startOfPreviousPeriod < startDate) {
        console.log("Previous period is before our data range");
        // If there's only enough data for one period, just return that one
        const period: WeeklyData = {
          periodStart: startOfRecentPeriod.toISOString().split('T')[0],
          periodEnd: endOfRecentPeriod.toISOString().split('T')[0],
          IMPRESSIONS: 0,
          CLICKS: 0,
          REVENUE: 0,
          ROAS: 0,
          count: 0
        };
        
        // Calculate metrics for the period
        filteredData.forEach(row => {
          const rowDate = new Date(row.DATE);
          if (rowDate >= startOfRecentPeriod && rowDate <= endOfRecentPeriod) {
            period.IMPRESSIONS += Number(row.IMPRESSIONS) || 0;
            period.CLICKS += Number(row.CLICKS) || 0;
            period.REVENUE += Number(row.REVENUE) || 0;
            period.count += 1;
          }
        });
        
        period.ROAS = calculateROAS(period.REVENUE, period.IMPRESSIONS);
        
        return [period];
      }
      
      // Initialize the periods with their correct date ranges
      const periods: WeeklyData[] = [
        {
          periodStart: startOfRecentPeriod.toISOString().split('T')[0],
          periodEnd: endOfRecentPeriod.toISOString().split('T')[0],
          IMPRESSIONS: 0,
          CLICKS: 0,
          REVENUE: 0,
          ROAS: 0,
          count: 0
        },
        {
          periodStart: startOfPreviousPeriod.toISOString().split('T')[0],
          periodEnd: endOfPreviousPeriod.toISOString().split('T')[0],
          IMPRESSIONS: 0,
          CLICKS: 0,
          REVENUE: 0,
          ROAS: 0,
          count: 0
        }
      ];

      // Calculate metrics for each period
      filteredData.forEach(row => {
        const rowDate = new Date(row.DATE);
        rowDate.setHours(0, 0, 0, 0); // Normalize to start of day
        
        // Check if the date falls within the recent period
        if (rowDate >= startOfRecentPeriod && rowDate <= endOfRecentPeriod) {
          periods[0].IMPRESSIONS += Number(row.IMPRESSIONS) || 0;
          periods[0].CLICKS += Number(row.CLICKS) || 0;
          periods[0].REVENUE += Number(row.REVENUE) || 0;
          periods[0].count += 1;
        } 
        // Check if the date falls within the previous period
        else if (rowDate >= startOfPreviousPeriod && rowDate <= endOfPreviousPeriod) {
          periods[1].IMPRESSIONS += Number(row.IMPRESSIONS) || 0;
          periods[1].CLICKS += Number(row.CLICKS) || 0;
          periods[1].REVENUE += Number(row.REVENUE) || 0;
          periods[1].count += 1;
        }
      });

      // Calculate ROAS for both periods
      periods[0].ROAS = calculateROAS(periods[0].REVENUE, periods[0].IMPRESSIONS);
      periods[1].ROAS = calculateROAS(periods[1].REVENUE, periods[1].IMPRESSIONS);

      return periods;
    } catch (error) {
      console.error("Error in getWeeklyData:", error);
      return [];
    }
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
    const previousValue = previousPeriod ? previousPeriod[metric] : 0;
    
    // Avoid division by zero
    const percentChange = previousValue !== 0 
      ? ((currentValue - previousValue) / previousValue) * 100 
      : currentValue > 0 ? 100 : 0;
      
    const colorClasses = getColorClasses(percentChange);
    
    return {
      currentValue,
      previousValue,
      percentChange,
      colorClass: colorClasses.split(' ').find(c => c.startsWith('text-')),
      increased: percentChange > 0
    };
  };

  const formatROAS = (value: number) => {
    return value.toFixed(2);
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
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Anomaly Detection</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Anomaly period:</span>
            <ToggleGroup type="single" value={anomalyPeriod} onValueChange={(value) => value && setAnomalyPeriod(value as AnomalyPeriod)}>
              <ToggleGroupItem value="daily" aria-label="Daily anomalies" className="text-sm">
                Daily
              </ToggleGroupItem>
              <ToggleGroupItem value="weekly" aria-label="Weekly anomalies" className="text-sm">
                Week-over-Week
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            title="Impression Anomalies"
            anomalies={anomalies.IMPRESSIONS.anomalies}
            metric="IMPRESSIONS"
            anomalyPeriod={anomalyPeriod}
          />
          <MetricCard
            title="Click Anomalies"
            anomalies={anomalies.CLICKS.anomalies}
            metric="CLICKS"
            anomalyPeriod={anomalyPeriod}
          />
          <MetricCard
            title="Revenue Anomalies"
            anomalies={anomalies.REVENUE.anomalies}
            metric="REVENUE"
            anomalyPeriod={anomalyPeriod}
          />
        </div>
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
        <div className="mb-6">
          <h3 className="text-lg font-semibold">7-Day Period Comparison</h3>
        </div>

        {weeklyData.length >= 1 ? (
          <div className="grid gap-8 md:grid-cols-4">
            {/* Impressions Comparison */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Impressions</h4>
              <Card className="p-4">
                <h5 className="mb-2 text-sm font-medium text-muted-foreground">Most Recent 7 Days</h5>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">
                    {formatNumber(weeklyData[0].IMPRESSIONS)}
                  </p>
                  {weeklyData.length >= 2 && (() => {
                    const comparison = getMetricComparison('IMPRESSIONS', weeklyData[0], weeklyData[1]);
                    return (
                      <div className={`flex items-center ${comparison.colorClass}`}>
                        {comparison.increased ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span className="ml-1 text-sm">
                          {comparison.increased ? '+' : ''}{comparison.percentChange.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })()}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDate(weeklyData[0].periodStart)} - {formatDate(weeklyData[0].periodEnd)}
                </p>
              </Card>
              {weeklyData.length >= 2 && (
                <Card className="p-4">
                  <h5 className="mb-2 text-sm font-medium text-muted-foreground">Previous 7 Days</h5>
                  <p className="mb-1 text-2xl font-bold">
                    {formatNumber(weeklyData[1].IMPRESSIONS)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(weeklyData[1].periodStart)} - {formatDate(weeklyData[1].periodEnd)}
                  </p>
                </Card>
              )}
            </div>

            {/* Clicks Comparison */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Clicks</h4>
              <Card className="p-4">
                <h5 className="mb-2 text-sm font-medium text-muted-foreground">Most Recent 7 Days</h5>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">
                    {formatNumber(weeklyData[0].CLICKS)}
                  </p>
                  {weeklyData.length >= 2 && (() => {
                    const comparison = getMetricComparison('CLICKS', weeklyData[0], weeklyData[1]);
                    return (
                      <div className={`flex items-center ${comparison.colorClass}`}>
                        {comparison.increased ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span className="ml-1 text-sm">
                          {comparison.increased ? '+' : ''}{comparison.percentChange.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })()}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDate(weeklyData[0].periodStart)} - {formatDate(weeklyData[0].periodEnd)}
                </p>
              </Card>
              {weeklyData.length >= 2 && (
                <Card className="p-4">
                  <h5 className="mb-2 text-sm font-medium text-muted-foreground">Previous 7 Days</h5>
                  <p className="mb-1 text-2xl font-bold">
                    {formatNumber(weeklyData[1].CLICKS)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(weeklyData[1].periodStart)} - {formatDate(weeklyData[1].periodEnd)}
                  </p>
                </Card>
              )}
            </div>

            {/* Revenue Comparison */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Revenue</h4>
              <Card className="p-4">
                <h5 className="mb-2 text-sm font-medium text-muted-foreground">Most Recent 7 Days</h5>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">
                    {formatRevenue(weeklyData[0].REVENUE)}
                  </p>
                  {weeklyData.length >= 2 && (() => {
                    const comparison = getMetricComparison('REVENUE', weeklyData[0], weeklyData[1]);
                    return (
                      <div className={`flex items-center ${comparison.colorClass}`}>
                        {comparison.increased ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span className="ml-1 text-sm">
                          {comparison.increased ? '+' : ''}{comparison.percentChange.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })()}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDate(weeklyData[0].periodStart)} - {formatDate(weeklyData[0].periodEnd)}
                </p>
              </Card>
              {weeklyData.length >= 2 && (
                <Card className="p-4">
                  <h5 className="mb-2 text-sm font-medium text-muted-foreground">Previous 7 Days</h5>
                  <p className="mb-1 text-2xl font-bold">
                    {formatRevenue(weeklyData[1].REVENUE)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(weeklyData[1].periodStart)} - {formatDate(weeklyData[1].periodEnd)}
                  </p>
                </Card>
              )}
            </div>

            {/* ROAS Comparison */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">ROAS</h4>
              <Card className="p-4">
                <h5 className="mb-2 text-sm font-medium text-muted-foreground">Most Recent 7 Days</h5>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">
                    {formatROAS(weeklyData[0].ROAS)}
                  </p>
                  {weeklyData.length >= 2 && (() => {
                    const comparison = getMetricComparison('ROAS', weeklyData[0], weeklyData[1]);
                    return (
                      <div className={`flex items-center ${comparison.colorClass}`}>
                        {comparison.increased ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span className="ml-1 text-sm">
                          {comparison.increased ? '+' : ''}{comparison.percentChange.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })()}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDate(weeklyData[0].periodStart)} - {formatDate(weeklyData[0].periodEnd)}
                </p>
              </Card>
              {weeklyData.length >= 2 && (
                <Card className="p-4">
                  <h5 className="mb-2 text-sm font-medium text-muted-foreground">Previous 7 Days</h5>
                  <p className="mb-1 text-2xl font-bold">
                    {formatROAS(weeklyData[1].ROAS)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(weeklyData[1].periodStart)} - {formatDate(weeklyData[1].periodEnd)}
                  </p>
                </Card>
              )}
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
  metric,
  anomalyPeriod
}: {
  title: string;
  anomalies: any[];
  metric: string;
  anomalyPeriod: AnomalyPeriod;
}) => {
  const topAnomalyColor = anomalies.length > 0 ? getColorClasses(anomalies[0].deviation) : '';
  
  return (
    <Card className="p-6 transition-all duration-300 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-muted-foreground">{title}</h3>
          <p className="mt-2 text-2xl font-bold">{anomalies.length}</p>
        </div>
        {anomalies.length > 0 && (
          <div className={`p-2 rounded-full ${topAnomalyColor}`}>
            <AlertTriangle className={`w-5 h-5 ${topAnomalyColor.split(' ').find(c => c.startsWith('text-'))}`} />
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
            <AnomalyDetails 
              anomalies={anomalies} 
              metric={metric} 
              anomalyPeriod={anomalyPeriod}
            />
          </div>
          {anomalies.slice(0, 2).map((anomaly, idx) => {
            const colorClasses = getColorClasses(anomaly.deviation);
            return (
              <div key={idx} className="text-sm space-y-1">
                <div className="font-medium">{anomaly.campaign}</div>
                <div className="text-muted-foreground">
                  {anomalyPeriod === "weekly" ? "Week of: " : "Date: "}{anomaly.DATE} - {metric}: {anomaly.actualValue.toLocaleString()} 
                  <span className={colorClasses.split(' ').find(c => c.startsWith('text-'))}>
                    {" "}({anomaly.deviation > 0 ? "+" : ""}{anomaly.deviation.toFixed(1)}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default Dashboard;
