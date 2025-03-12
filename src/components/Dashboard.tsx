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
import { Button } from "@/components/ui/button";

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
    
    if (selected.length > 0 && onMetricsCampaignsChange) {
      const validCampaigns = selectedMetricsCampaigns.filter(campaign => {
        const match = campaign.match(/SM:\s+([^-]+)/);
        const advertiser = match ? match[1].trim() : "";
        return selected.includes(advertiser);
      });
      
      onMetricsCampaignsChange(validCampaigns);
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

  const detectAnomalies = (inputData: any[]) => {
    if (!inputData || !inputData.length) return {
      IMPRESSIONS: { anomalies: [] },
      CLICKS: { anomalies: [] },
      REVENUE: { anomalies: [] }
    };

    try {
      const campaignData: Record<string, any[]> = {};
      inputData.forEach(row => {
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
              
              const deviationPercent = ((value - mean) / mean) * 100;
              
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
          Object.entries(campaignData).forEach(([campaign, campaignRows]) => {
            if (!campaignRows.length) return;
            
            const mostRecentDate = campaignRows.reduce((latest, row) => {
              if (!row.DATE) return latest;
              
              try {
                const rowDate = new Date(row.DATE);
                if (isNaN(rowDate.getTime())) return latest;
                
                return rowDate > latest ? rowDate : latest;
              } catch (err) {
                console.error("Error comparing dates:", err);
                return latest;
              }
            }, new Date(0));
            
            const weeklyData: Record<number, WeeklyAggregation> = {};
            
            campaignRows.forEach(row => {
              if (!row.DATE) return;
              
              try {
                const rowDate = new Date(row.DATE);
                if (isNaN(rowDate.getTime())) return;
                
                const dayDiff = Math.floor((mostRecentDate.getTime() - rowDate.getTime()) / (1000 * 60 * 60 * 24));
                const weekNumber = Math.floor(dayDiff / 7);
                
                if (!weeklyData[weekNumber]) {
                  const periodEnd = new Date(mostRecentDate);
                  periodEnd.setDate(periodEnd.getDate() - (weekNumber * 7));
                  
                  const periodStart = new Date(periodEnd);
                  periodStart.setDate(periodEnd.getDate() - 6);
                  
                  weeklyData[weekNumber] = {
                    weekStart: `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`,
                    weekNumber,
                    [metric]: 0,
                    rows: []
                  };
                }
                
                weeklyData[weekNumber][metric] += Number(row[metric]) || 0;
                weeklyData[weekNumber].rows.push(row);
              } catch (err) {
                console.error("Error processing week grouping:", err);
              }
            });
            
            const weeklyValues = Object.values(weeklyData);
            if (weeklyValues.length < 2) return;
            
            for (let i = 0; i < weeklyValues.length - 1; i++) {
              const currentWeek = weeklyValues[i];
              const previousWeek = weeklyValues[i + 1];
              
              if (currentWeek.rows.length < 3 || previousWeek.rows.length < 3) continue;
              
              const currentValue = currentWeek[metric];
              const previousValue = previousWeek[metric];
              
              const percentChange = ((currentValue - previousValue) / previousValue) * 100;
              
              if (Math.abs(percentChange) > 15) {
                const weekLabel = currentWeek.weekStart;
                
                allAnomalies.push({
                  campaign,
                  DATE: weekLabel,
                  mean: previousValue,
                  actualValue: currentValue,
                  deviation: percentChange,
                  periodType: "weekly",
                  rows: currentWeek.rows,
                  weekNumber: currentWeek.weekNumber,
                  comparedTo: previousWeek.weekStart
                });
              }
            }
            
            if (weeklyValues.length >= 3) {
              const allWeekValues = weeklyValues.map(week => week[metric]);
              const mean = allWeekValues.reduce((a, b) => a + b, 0) / allWeekValues.length;
              const stdDev = Math.sqrt(
                allWeekValues.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / allWeekValues.length
              );
              
              const threshold = stdDev * 1.2;
              
              weeklyValues.forEach(week => {
                if (week.rows.length < 3) return;
                
                const value = week[metric];
                const deviationFromAvg = ((value - mean) / mean) * 100;
                
                if (Math.abs(deviationFromAvg) > 15 && Math.abs(value - mean) > threshold) {
                  const alreadyDetected = allAnomalies.some(
                    a => a.campaign === campaign && 
                         a.periodType === "weekly" && 
                         a.weekNumber === week.weekNumber
                  );
                  
                  if (!alreadyDetected) {
                    allAnomalies.push({
                      campaign,
                      DATE: week.weekStart,
                      mean: mean,
                      actualValue: value,
                      deviation: deviationFromAvg,
                      periodType: "weekly",
                      rows: week.rows,
                      weekNumber: week.weekNumber,
                      comparedTo: "overall average"
                    });
                  }
                }
              });
            }
          });
        }

        results[metric] = {
          anomalies: allAnomalies.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))
        };
      });

      return results;
    } catch (error) {
      console.error("Error in anomaly detection:", error);
      return {
        IMPRESSIONS: { anomalies: [] },
        CLICKS: { anomalies: [] },
        REVENUE: { anomalies: [] }
      };
    }
  };

  const anomalies = useMemo(() => {
    return detectAnomalies(data);
  }, [data, anomalyPeriod]);

  const getAggregatedData = (filteredData: any[]) => {
    try {
      if (!filteredData || !filteredData.length) return [];
      
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
      const spend = (impressions * 15) / 1000;
      return spend > 0 ? revenue / spend : 0;
    } catch (error) {
      console.error("Error calculating ROAS:", error);
      return 0;
    }
  };

  const getWeeklyData = (selectedCampaign: string, selectedAdvertisers: string[]) => {
    try {
      if (!data || !data.length) {
        console.log("No data available");
        return [];
      }

      let filteredData = data;
      
      if (selectedAdvertisers.length > 0) {
        filteredData = data.filter(row => {
          const campaignName = row["CAMPAIGN ORDER NAME"] || "";
          const match = campaignName.match(/SM:\s+([^-]+)/);
          const advertiser = match ? match[1].trim() : "";
          return selectedAdvertisers.includes(advertiser);
        });
      }
      
      if (selectedCampaign !== "all") {
        filteredData = filteredData.filter(row => row["CAMPAIGN ORDER NAME"] === selectedCampaign);
      }

      if (!filteredData.length) {
        console.log("No filtered data available");
        return [];
      }

      const mostRecentDate = filteredData.reduce((latest, row) => {
        if (!row.DATE) return latest;
        
        try {
          const rowDate = new Date(row.DATE);
          if (isNaN(rowDate.getTime())) return latest;
          
          return rowDate > latest ? rowDate : latest;
        } catch (err) {
          console.error("Error comparing dates:", err);
          return latest;
        }
      }, new Date(0));

      const earliestDate = filteredData.reduce((earliest, row) => {
        if (!row.DATE) return earliest;
        
        try {
          const rowDate = new Date(row.DATE);
          if (isNaN(rowDate.getTime())) return earliest;
          
          return rowDate < earliest ? rowDate : earliest;
        } catch (err) {
          console.error("Error comparing dates:", err);
          return earliest;
        }
      }, new Date());

      const totalDays = Math.floor((mostRecentDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24));
      const maxPeriods = Math.floor(totalDays / 7);
      
      const periodsToCreate = Math.min(maxPeriods, 12);

      const periods: WeeklyData[] = [];

      for (let i = 0; i < periodsToCreate; i++) {
        const periodEnd = new Date(mostRecentDate);
        periodEnd.setDate(periodEnd.getDate() - (i * 7));
        
        const periodStart = new Date(periodEnd);
        periodStart.setDate(periodEnd.getDate() - 6);
        
        const periodStartStr = periodStart.toISOString().split('T')[0];
        const periodEndStr = periodEnd.toISOString().split('T')[0];
        
        periods.push({
          periodStart: periodStartStr,
          periodEnd: periodEndStr,
          IMPRESSIONS: 0,
          CLICKS: 0,
          REVENUE: 0,
          ROAS: 0,
          count: 0
        });
      }

      filteredData.forEach(row => {
        try {
          if (!row.DATE) return;
          
          const rowDate = new Date(row.DATE);
          if (isNaN(rowDate.getTime())) return;
          
          const rowDateStr = rowDate.toISOString().split('T')[0];
          
          for (let i = 0; i < periods.length; i++) {
            const periodStart = periods[i].periodStart;
            const periodEnd = periods[i].periodEnd;
            
            if (rowDateStr >= periodStart && rowDateStr <= periodEnd) {
              periods[i].IMPRESSIONS += Number(row.IMPRESSIONS) || 0;
              periods[i].CLICKS += Number(row.CLICKS) || 0;
              periods[i].REVENUE += Number(row.REVENUE) || 0;
              periods[i].count += 1;
              break;
            }
          }
        } catch (err) {
          console.error("Error processing row for period metrics:", err);
        }
      });

      periods.forEach(period => {
        period.ROAS = calculateROAS(period.REVENUE, period.IMPRESSIONS);
      });

      return periods;
    } catch (error) {
      console.error("Error in getWeeklyData:", error);
      return [];
    }
  };

  const weeklyData = useMemo(() => getWeeklyData(selectedWeeklyCampaign, selectedWeeklyAdvertisers), 
    [data, selectedWeeklyCampaign, selectedWeeklyAdvertisers]);
    
  const processedMetricsData = useMemo(() => getAggregatedData(metricsData || []), [metricsData]);
  const processedRevenueData = useMemo(() => getAggregatedData(revenueData || []), [revenueData]);

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

  const dataDateRange = () => {
    if (!data || data.length === 0) return null;
    
    try {
      const dates = data.map(row => new Date(row.DATE)).filter(d => !isNaN(d.getTime()));
      if (dates.length === 0) return null;
      
      const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
      
      return {
        from: minDate,
        to: maxDate
      };
    } catch (error) {
      console.error("Error calculating date range:", error);
      return null;
    }
  };

  const dateRange = dataDateRange();
  const dateRangeText = dateRange 
    ? `${dateRange.from.toLocaleDateString()} to ${dateRange.to.toLocaleDateString()}`
    : "All time";

  if (!anomalies) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No anomaly data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {dateRange && (
        <div className="text-sm text-muted-foreground text-center">
          Showing data for: <span className="font-medium">{dateRangeText}</span> 
          ({data.length.toLocaleString()} records)
        </div>
      )}
      
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
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium mr-1">Filter by:</span>
            <div className="flex items-center gap-2">
              <MultiSelect
                options={advertiserOptions}
                selected={selectedMetricsAdvertisers}
                onChange={handleMetricsAdvertisersChange}
                placeholder="Advertiser"
                className="w-[200px]"
              />
              
              {onMetricsCampaignsChange && filteredMetricsCampaignOptions.length > 0 && (
                <MultiSelect
                  options={filteredMetricsCampaignOptions}
                  selected={selectedMetricsCampaigns}
                  onChange={onMetricsCampaignsChange}
                  placeholder="Campaign"
                  className="w-[200px]"
                  isWide={true}
                />
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  handleMetricsAdvertisersChange([]);
                  onMetricsCampaignsChange?.([]);
                }}
                disabled={selectedMetricsAdvertisers.length === 0 && selectedMetricsCampaigns.length === 0}
                className="h-9"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
        <div className="h-[400px]">
          {processedMetricsData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={processedMetricsData}>
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
              <p className="text-muted-foreground">No data available for the selected filters</p>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Attribution Revenue Over Time</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium mr-1">Filter by:</span>
            <div className="flex items-center gap-2">
              {onRevenueAdvertisersChange && advertiserOptions.length > 0 && (
                <MultiSelect
                  options={advertiserOptions}
                  selected={selectedRevenueAdvertisers}
                  onChange={onRevenueAdvertisersChange}
                  placeholder="Advertiser"
                  className="w-[200px]"
                />
              )}
              
              {onRevenueCampaignsChange && filteredRevenueCampaignOptions.length > 0 && (
                <>
                  <MultiSelect
                    options={filteredRevenueCampaignOptions}
                    selected={selectedRevenueCampaigns}
                    onChange={onRevenueCampaignsChange}
                    placeholder="Campaign"
                    className="w-[200px]"
                    isWide={true}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onRevenueAdvertisersChange?.([]);
                      onRevenueCampaignsChange([]);
                    }}
                    disabled={selectedRevenueAdvertisers.length === 0 && selectedRevenueCampaigns.length === 0}
                    className="h-9"
                  >
                    Clear
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="h-[400px]">
          {processedRevenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={processedRevenueData}>
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
              <p className="text-muted-foreground">No revenue data available for the selected filters</p>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">7-Day Period Comparison</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {weeklyData.length} periods found ({weeklyData.length * 7} days of data)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium mr-1">Filter by:</span>
              <div className="flex items-center gap-2">
                <MultiSelect
                  options={advertiserOptions}
                  selected={selectedWeeklyAdvertisers}
                  onChange={handleWeeklyAdvertisersChange}
                  placeholder="Advertiser"
                  className="w-[200px]"
                />
                
                <Select 
                  value={selectedWeeklyCampaign} 
                  onValueChange={setSelectedWeeklyCampaign}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredWeeklyCampaignOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {weeklyData.length >= 1 ? (
          <ScrollArea className="h-[460px]">
            <div className="grid gap-8 md:grid-cols-4 pb-4 pr-4">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Impressions</h4>
                <div className="space-y-4">
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
                        {idx < weeklyData.length - 1 && (
                          (() => {
                            const comparison = getMetricComparison('IMPRESSIONS', period, weeklyData[idx+1]);
                            return (
                              <div className={`flex items-center ${comparison.colorClass}`}>
                                {comparison.increased ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                <span className="ml-1 text-sm">
                                  {comparison.increased ? '+' : ''}{comparison.percentChange.toFixed(1)}%
                                </span>
                              </div>
                            );
                          })()
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {period.periodStart} to {period.periodEnd}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Clicks</h4>
                <div className="space-y-4">
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
                        {idx < weeklyData.length - 1 && (
                          (() => {
                            const comparison = getMetricComparison('CLICKS', period, weeklyData[idx+1]);
                            return (
                              <div className={`flex items-center ${comparison.colorClass}`}>
                                {comparison.increased ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                <span className="ml-1 text-sm">
                                  {comparison.increased ? '+' : ''}{comparison.percentChange.toFixed(1)}%
                                </span>
                              </div>
                            );
                          })()
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {period.periodStart} to {period.periodEnd}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Revenue</h4>
                <div className="space-y-4">
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
                        {idx < weeklyData.length - 1 && (
                          (() => {
                            const comparison = getMetricComparison('REVENUE', period, weeklyData[idx+1]);
                            return (
                              <div className={`flex items-center ${comparison.colorClass}`}>
                                {comparison.increased ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                <span className="ml-1 text-sm">
                                  {comparison.increased ? '+' : ''}{comparison.percentChange.toFixed(1)}%
                                </span>
                              </div>
                            );
                          })()
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {period.periodStart} to {period.periodEnd}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">ROAS</h4>
                <div className="space-y-4">
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
                        {idx < weeklyData.length - 1 && (
                          (() => {
                            const comparison = getMetricComparison('ROAS', period, weeklyData[idx+1]);
                            return (
                              <div className={`flex items-center ${comparison.colorClass}`}>
                                {comparison.increased ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                <span className="ml-1 text-sm">
                                  {comparison.increased ? '+' : ''}{comparison.percentChange.toFixed(1)}%
                                </span>
                              </div>
                            );
                          })()
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {period.periodStart} to {period.periodEnd}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
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
                {anomaly.comparedTo && (
                  <div className="text-xs text-muted-foreground">
                    Compared to: {anomaly.comparedTo}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default Dashboard;
