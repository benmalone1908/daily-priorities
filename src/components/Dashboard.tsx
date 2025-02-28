



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
    if (!data || !data.length) return [];
    return Array.from(new Set(data.map(row => row["CAMPAIGN ORDER NAME"]))).sort();
  }, [data]);

  const anomalies = useMemo(() => {
    if (!data || !data.length) return {
      IMPRESSIONS: { anomalies: [] },
      CLICKS: { anomalies: [] },
      REVENUE: { anomalies: [] }
    };

    try {
      const campaignData: Record<string, any[]> = {};
      data.forEach(row => {
        if (!row || typeof row !== 'object') return;
        
        const campaignName = row["CAMPAIGN ORDER NAME"];
        if (!campaignName) return;
        
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
          // Daily anomaly detection
          Object.entries(campaignData).forEach(([campaign, campaignRows]) => {
            if (!campaignRows.length) return;
            
            const values = campaignRows.map((row) => Number(row[metric]) || 0);
            if (!values.length) return;
            
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
            if (!campaignRows.length) return;
            
            // Group rows by week
            const weeklyData = campaignRows.reduce<Record<string, WeeklyAggregation>>((weeks, row) => {
              if (!row.DATE) return weeks;
              
              try {
                const date = new Date(row.DATE);
                if (isNaN(date.getTime())) return weeks;
                
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
              } catch (err) {
                console.error("Error processing date in weekly grouping:", err);
              }
              
              return weeks;
            }, {});
            
            const weeklyValues = Object.values(weeklyData);
            
            // We need at least 2 weeks of data for meaningful week-over-week analysis
            if (weeklyValues.length < 2) return;
            
            const weeklyMetricValues = weeklyValues.map(week => week[metric]);
            const mean = weeklyMetricValues.reduce((a, b) => a + b, 0) / weeklyMetricValues.length;
            const stdDev = Math.sqrt(
              weeklyMetricValues.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / weeklyMetricValues.length
            );
            
            const threshold = stdDev * 2;
            
            // Sort weeks by date (newest first)
            const sortedWeeks = [...weeklyValues].sort((a, b) => {
              try {
                return new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime();
              } catch (err) {
                console.error("Error sorting weeks:", err);
                return 0;
              }
            });
            
            // Check each week against the mean
            sortedWeeks.forEach((week, index) => {
              try {
                // Skip the most recent week if it's incomplete
                if (index === 0 && new Date().getDay() < 5) return;
                
                const value = week[metric];
                if (typeof value !== 'number') return;
                
                const deviationPercent = ((value - mean) / mean) * 100;
                
                if (Math.abs(deviationPercent) > 10 && Math.abs(value - mean) > threshold) {
                  const weekStart = new Date(week.weekStart);
                  if (isNaN(weekStart.getTime())) return;
                  
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
              } catch (err) {
                console.error("Error processing week for anomalies:", err);
              }
            });
          });
        }

        results[metric] = {
          anomalies: allAnomalies.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))
        };
      });

      return results;
    } catch (error) {
      console.error("Error in anomaly detection:", error);
      // Return empty anomalies in case of error
      return {
        IMPRESSIONS: { anomalies: [] },
        CLICKS: { anomalies: [] },
        REVENUE: { anomalies: [] }
      };
    }
  }, [data, anomalyPeriod]);

  const getAggregatedData = (campaign: string) => {
    try {
      if (!data || !data.length) return [];
      
      const filteredData = campaign === "all" 
        ? data 
        : data.filter(row => row["CAMPAIGN ORDER NAME"] === campaign);

      if (!filteredData.length) return [];

      const dateGroups = filteredData.reduce((acc, row) => {
        if (!row || !row.DATE) return acc;
        
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

      return Object.values(dateGroups).sort((a: any, b: any) => {
        try {
          return new Date(a.DATE).getTime() - new Date(b.DATE).getTime();
        } catch (err) {
          return 0;
        }
      });
    } catch (error) {
      console.error("Error in getAggregatedData:", error);
      return [];
    }
  };

  const calculateROAS = (revenue: number, impressions: number): number => {
    try {
      const spend = (impressions * 15) / 1000; // $15 CPM
      return spend > 0 ? revenue / spend : 0;
    } catch (error) {
      console.error("Error calculating ROAS:", error);
      return 0;
    }
  };

  const getWeeklyData = () => {
    try {
      if (!data || !data.length) {
        console.log("No data available");
        return [];
      }

      const filteredData = selectedMetricsCampaign === "all" 
        ? data 
        : data.filter(row => row["CAMPAIGN ORDER NAME"] === selectedMetricsCampaign);

      if (!filteredData.length) {
        console.log("No filtered data available");
        return [];
      }

      // Extract all dates from the data
      const allDates = filteredData
        .map(row => {
          try {
            if (!row.DATE) return null;
            const date = new Date(row.DATE);
            return isNaN(date.getTime()) ? null : date;
          } catch (err) {
            console.error("Error parsing date:", err);
            return null;
          }
        })
        .filter(Boolean) as Date[];

      if (allDates.length === 0) {
        console.log("No valid dates found in data");
        return [];
      }

      // Find the most recent date using timestamp comparison
      const mostRecentDateTimestamp = Math.max(...allDates.map(date => date.getTime()));
      const mostRecentDate = new Date(mostRecentDateTimestamp);
      const startDate = new Date(Math.min(...allDates.map(date => date.getTime())));

      console.log(`Date range: ${startDate.toISOString()} to ${mostRecentDate.toISOString()}`);
      console.log(`Most recent date is: ${mostRecentDate.toLocaleDateString()}`);
      
      // Normalize the end date to end of day
      mostRecentDate.setHours(23, 59, 59, 999);
      
      const periods: WeeklyData[] = [];
      
      // Create three 7-day periods starting from the most recent date and going backward
      // Period 1: Most recent 7 days
      const period1End = new Date(mostRecentDate);
      const period1Start = new Date(period1End);
      period1Start.setDate(period1End.getDate() - 6); // Start 6 days before (7 days total)
      
      // Period 2: Previous 7 days
      const period2End = new Date(period1Start);
      period2End.setDate(period2End.getDate() - 1); // End day before period 1 starts
      const period2Start = new Date(period2End);
      period2Start.setDate(period2End.getDate() - 6); // Start 6 days before
      
      // Period 3: 7 days before that
      const period3End = new Date(period2Start);
      period3End.setDate(period3End.getDate() - 1); // End day before period 2 starts
      const period3Start = new Date(period3End);
      period3Start.setDate(period3End.getDate() - 6); // Start 6 days before
      
      console.log(`Period 1: ${period1Start.toLocaleDateString()} to ${period1End.toLocaleDateString()}`);
      console.log(`Period 2: ${period2Start.toLocaleDateString()} to ${period2End.toLocaleDateString()}`);
      console.log(`Period 3: ${period3Start.toLocaleDateString()} to ${period3End.toLocaleDateString()}`);
      
      // Only add periods that are within our data range
      if (period1Start <= mostRecentDate) {
        periods.push({
          periodStart: period1Start.toISOString().split('T')[0],
          periodEnd: period1End.toISOString().split('T')[0],
          IMPRESSIONS: 0,
          CLICKS: 0,
          REVENUE: 0,
          ROAS: 0,
          count: 0
        });
        console.log(`Adding period 1 (most recent): ${period1Start.toLocaleDateString()} - ${period1End.toLocaleDateString()}`);
      }
      
      if (period2Start <= mostRecentDate) {
        periods.push({
          periodStart: period2Start.toISOString().split('T')[0],
          periodEnd: period2End.toISOString().split('T')[0],
          IMPRESSIONS: 0,
          CLICKS: 0,
          REVENUE: 0,
          ROAS: 0,
          count: 0
        });
        console.log(`Adding period 2 (previous): ${period2Start.toLocaleDateString()} - ${period2End.toLocaleDateString()}`);
      }
      
      if (period3Start <= mostRecentDate) {
        periods.push({
          periodStart: period3Start.toISOString().split('T')[0],
          periodEnd: period3End.toISOString().split('T')[0],
          IMPRESSIONS: 0,
          CLICKS: 0,
          REVENUE: 0,
          ROAS: 0,
          count: 0
        });
        console.log(`Adding period 3 (earlier): ${period3Start.toLocaleDateString()} - ${period3End.toLocaleDateString()}`);
      }
      
      // Calculate metrics for each period - reset the summing logic
      filteredData.forEach(row => {
        try {
          if (!row.DATE) return;
          
          const rowDate = new Date(row.DATE);
          if (isNaN(rowDate.getTime())) return;
          
          // Normalize to start of day
          rowDate.setHours(0, 0, 0, 0);
          
          // Check which period this row belongs to
          for (let i = 0; i < periods.length; i++) {
            const periodStart = new Date(periods[i].periodStart + 'T00:00:00');
            const periodEnd = new Date(periods[i].periodEnd + 'T23:59:59');
            
            // Include the row if it falls within the date range (inclusive)
            if (rowDate >= periodStart && rowDate <= periodEnd) {
              periods[i].IMPRESSIONS += Number(row.IMPRESSIONS) || 0;
              periods[i].CLICKS += Number(row.CLICKS) || 0;
              periods[i].REVENUE += Number(row.REVENUE) || 0;
              periods[i].count += 1;
              break; // Each row can only belong to one period
            }
          }
        } catch (err) {
          console.error("Error processing row for period metrics:", err);
        }
      });

      // Calculate ROAS for all periods
      periods.forEach(period => {
        period.ROAS = calculateROAS(period.REVENUE, period.IMPRESSIONS);
      });

      console.log(`Generated ${periods.length} weekly periods with metrics:`);
      periods.forEach((p, i) => {
        console.log(`Period ${i}: ${p.periodStart} - ${p.periodEnd}, Impressions: ${p.IMPRESSIONS}, Clicks: ${p.CLICKS}, Revenue: ${p.REVENUE}`);
      });

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
    try {
      return value.toLocaleString();
    } catch (error) {
      console.error("Error formatting number:", error);
      return "0";
    }
  };

  const formatRevenue = (value: number) => {
    try {
      return `$${Math.round(value).toLocaleString()}`;
    } catch (error) {
      console.error("Error formatting revenue:", error);
      return "$0";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  };

  const getMetricComparison = (metric: string, currentPeriod: WeeklyData, previousPeriod: WeeklyData) => {
    try {
      const currentValue = currentPeriod[metric as keyof WeeklyData] as number;
      const previousValue = previousPeriod ? (previousPeriod[metric as keyof WeeklyData] as number) : 0;
      
      // Avoid division by zero
      const percentChange = previousValue !== 0 
        ? ((currentValue - previousValue) / previousValue) * 100 
        : currentValue > 0 ? 100 : 0;
        
      const colorClasses = getColorClasses(percentChange);
      const colorClass = colorClasses.split(' ').find(c => c.startsWith('text-')) || '';
      
      return {
        currentValue,
        previousValue,
        percentChange,
        colorClass,
        increased: percentChange > 0
      };
    } catch (error) {
      console.error("Error calculating metric comparison:", error);
      return {
        currentValue: 0,
        previousValue: 0,
        percentChange: 0,
        colorClass: '',
        increased: false
      };
    }
  };

  const formatROAS = (value: number) => {
    try {
      return value.toFixed(2);
    } catch (error) {
      console.error("Error formatting ROAS:", error);
      return "0.00";
    }
  };

  const axisStyle = {
    fontSize: '0.75rem'
  };

  const labelStyle = {
    fontSize: '0.75rem',
    fill: '#64748b'
  };

  if (!anomalies) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No anomaly data available</p>
      </div>
    );
  }

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
                Weekly
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            title="Impression Anomalies"
            anomalies={anomalies.IMPRESSIONS?.anomalies || []}
            metric="IMPRESSIONS"
            anomalyPeriod={anomalyPeriod}
          />
          <MetricCard
            title="Click Anomalies"
            anomalies={anomalies.CLICKS?.anomalies || []}
            metric="CLICKS"
            anomalyPeriod={anomalyPeriod}
          />
          <MetricCard
            title="Revenue Anomalies"
            anomalies={anomalies.REVENUE?.anomalies || []}
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
          {metricsData.length > 0 ? (
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
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No data available for the selected campaign</p>
            </div>
          )}
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
          {revenueData.length > 0 ? (
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
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No revenue data available for the selected campaign</p>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold">7-Day Period Comparison</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {weeklyData.length} periods found ({weeklyData.length * 7} days of data)
          </p>
        </div>

        {weeklyData.length >= 1 ? (
          <div className="grid gap-8 md:grid-cols-4">
            {/* Impressions Comparison */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Impressions</h4>
              {weeklyData.map((period, idx) => (
                <Card key={`impressions-${idx}`} className="p-4">
                  <h5 className="mb-2 text-sm font-medium text-muted-foreground">
                    {idx === 0 ? "Most Recent 7 Days" : 
                     idx === 1 ? "Previous 7 Days" : 
                     `${idx + 1} Weeks Ago`}
                  </h5>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">
                      {formatNumber(period.IMPRESSIONS)}
                    </p>
                    {/* Only show trend for idx > 0 (not for the oldest period) */}
                    {idx < weeklyData.length - 1 && (() => {
                      const comparison = getMetricComparison('IMPRESSIONS', weeklyData[idx], weeklyData[idx+1]);
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
                    {formatDate(period.periodStart)} - {formatDate(period.periodEnd)}
                  </p>
                </Card>
              ))}
            </div>

            {/* Clicks Comparison */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Clicks</h4>
              {weeklyData.map((period, idx) => (
                <Card key={`clicks-${idx}`} className="p-4">
                  <h5 className="mb-2 text-sm font-medium text-muted-foreground">
                    {idx === 0 ? "Most Recent 7 Days" : 
                     idx === 1 ? "Previous 7 Days" : 
                     `${idx + 1} Weeks Ago`}
                  </h5>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">
                      {formatNumber(period.CLICKS)}
                    </p>
                    {/* Only show trend for idx > 0 (not for the oldest period) */}
                    {idx < weeklyData.length - 1 && (() => {
                      const comparison = getMetricComparison('CLICKS', weeklyData[idx], weeklyData[idx+1]);
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
                    {formatDate(period.periodStart)} - {formatDate(period.periodEnd)}
                  </p>
                </Card>
              ))}
            </div>

            {/* Revenue Comparison */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Revenue</h4>
              {weeklyData.map((period, idx) => (
                <Card key={`revenue-${idx}`} className="p-4">
                  <h5 className="mb-2 text-sm font-medium text-muted-foreground">
                    {idx === 0 ? "Most Recent 7 Days" : 
                     idx === 1 ? "Previous 7 Days" : 
                     `${idx + 1} Weeks Ago`}
                  </h5>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">
                      {formatRevenue(period.REVENUE)}
                    </p>
                    {/* Only show trend for idx > 0 (not for the oldest period) */}
                    {idx < weeklyData.length - 1 && (() => {
                      const comparison = getMetricComparison('REVENUE', weeklyData[idx], weeklyData[idx+1]);
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
                    {formatDate(period.periodStart)} - {formatDate(period.periodEnd)}
                  </p>
                </Card>
              ))}
            </div>

            {/* ROAS Comparison */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">ROAS</h4>
              {weeklyData.map((period, idx) => (
                <Card key={`roas-${idx}`} className="p-4">
                  <h5 className="mb-2 text-sm font-medium text-muted-foreground">
                    {idx === 0 ? "Most Recent 7 Days" : 
                     idx === 1 ? "Previous 7 Days" : 
                     `${idx + 1} Weeks Ago`}
                  </h5>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">
                      {formatROAS(period.ROAS)}
                    </p>
                    {/* Only show trend for idx > 0 (not for the oldest period) */}
                    {idx < weeklyData.length - 1 && (() => {
                      const comparison = getMetricComparison('ROAS', weeklyData[idx], weeklyData[idx+1]);
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
                    {formatDate(period.periodStart)} - {formatDate(period.periodEnd)}
                  </p>
                </Card>
              ))}
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
