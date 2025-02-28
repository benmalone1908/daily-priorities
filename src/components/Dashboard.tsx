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
import FileUpload from "./FileUpload";
import { Button } from "@/components/ui/button";

interface DashboardProps {
  data: any[];
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
  const [selectedWeeklyCampaign, setSelectedWeeklyCampaign] = useState<string>("all");
  const [anomalyPeriod, setAnomalyPeriod] = useState<AnomalyPeriod>("daily");
  const [historicalData, setHistoricalData] = useState<any[]>([]);

  const campaigns = useMemo(() => {
    if (!data || !data.length) return [];
    return Array.from(new Set(data.map(row => row["CAMPAIGN ORDER NAME"]))).sort();
  }, [data]);

  // Calculate day-of-week baselines from historical data
  const dayOfWeekBaselines = useMemo(() => {
    if (!historicalData.length) return {};
    
    try {
      // Group historical data by campaign and day of week
      const campaignDayMetrics: Record<string, Record<string, number[]>> = {};
      
      historicalData.forEach(row => {
        if (!row.DATE || !row["CAMPAIGN ORDER NAME"]) return;
        
        const campaign = row["CAMPAIGN ORDER NAME"];
        const date = new Date(row.DATE);
        
        if (isNaN(date.getTime())) return;
        
        const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
        
        if (!campaignDayMetrics[campaign]) {
          campaignDayMetrics[campaign] = {};
        }
        
        if (!campaignDayMetrics[campaign][dayOfWeek]) {
          campaignDayMetrics[campaign][dayOfWeek] = {
            IMPRESSIONS: [],
            CLICKS: [],
            REVENUE: []
          };
        }
        
        // Add metrics to respective arrays
        ["IMPRESSIONS", "CLICKS", "REVENUE"].forEach(metric => {
          campaignDayMetrics[campaign][dayOfWeek][metric].push(Number(row[metric]) || 0);
        });
      });
      
      // Calculate averages for each day of week and campaign
      const baselines: Record<string, Record<string, Record<string, number>>> = {};
      
      Object.entries(campaignDayMetrics).forEach(([campaign, dayMetrics]) => {
        baselines[campaign] = {};
        
        Object.entries(dayMetrics).forEach(([day, metrics]) => {
          baselines[campaign][day] = {};
          
          Object.entries(metrics).forEach(([metric, values]) => {
            // Calculate average (mean) if we have data
            if (values.length > 0) {
              baselines[campaign][day][metric] = values.reduce((a, b) => a + b, 0) / values.length;
            } else {
              baselines[campaign][day][metric] = 0;
            }
          });
        });
      });
      
      return baselines;
    } catch (error) {
      console.error("Error calculating day-of-week baselines:", error);
      return {};
    }
  }, [historicalData]);
  
  // Calculate average weekly distribution patterns
  const weeklyDistributionPatterns = useMemo(() => {
    if (!historicalData.length) return {};
    
    try {
      // First, group data by campaign and week
      const campaignWeeks: Record<string, any[][]> = {};
      
      historicalData.forEach(row => {
        if (!row.DATE || !row["CAMPAIGN ORDER NAME"]) return;
        
        const campaign = row["CAMPAIGN ORDER NAME"];
        const date = new Date(row.DATE);
        
        if (isNaN(date.getTime())) return;
        
        // Get week number and year (for grouping)
        const weekYear = `${date.getFullYear()}-${Math.floor((date.getDate() - 1 + date.getDay()) / 7) + 1}`;
        
        if (!campaignWeeks[campaign]) {
          campaignWeeks[campaign] = {};
        }
        
        if (!campaignWeeks[campaign][weekYear]) {
          campaignWeeks[campaign][weekYear] = [];
        }
        
        campaignWeeks[campaign][weekYear].push(row);
      });
      
      // For each campaign and week, calculate day distribution
      const distributions: Record<string, Record<string, { percent: number, count: number }>> = {};
      
      Object.entries(campaignWeeks).forEach(([campaign, weeks]) => {
        if (!distributions[campaign]) {
          distributions[campaign] = {
            Sun: { percent: 0, count: 0 },
            Mon: { percent: 0, count: 0 },
            Tue: { percent: 0, count: 0 },
            Wed: { percent: 0, count: 0 },
            Thu: { percent: 0, count: 0 },
            Fri: { percent: 0, count: 0 },
            Sat: { percent: 0, count: 0 }
          };
        }
        
        // Process each week
        Object.values(weeks).forEach(weekRows => {
          if (!weekRows || weekRows.length < 3) return; // Skip weeks with insufficient data
          
          // Calculate total metrics for the week
          const weekMetrics = {
            IMPRESSIONS: 0,
            CLICKS: 0,
            REVENUE: 0
          };
          
          // Daily metrics by day of week
          const dailyMetrics: Record<string, any> = {};
          
          weekRows.forEach(row => {
            const date = new Date(row.DATE);
            if (isNaN(date.getTime())) return;
            
            const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
            
            // Add to week totals
            ["IMPRESSIONS", "CLICKS", "REVENUE"].forEach(metric => {
              weekMetrics[metric] += Number(row[metric]) || 0;
            });
            
            // Group by day of week
            if (!dailyMetrics[dayOfWeek]) {
              dailyMetrics[dayOfWeek] = {
                IMPRESSIONS: 0,
                CLICKS: 0,
                REVENUE: 0
              };
            }
            
            ["IMPRESSIONS", "CLICKS", "REVENUE"].forEach(metric => {
              dailyMetrics[dayOfWeek][metric] += Number(row[metric]) || 0;
            });
          });
          
          // Calculate percentages for each day and metric
          Object.entries(dailyMetrics).forEach(([day, metrics]) => {
            ["IMPRESSIONS", "CLICKS", "REVENUE"].forEach(metric => {
              if (weekMetrics[metric] > 0) {
                const percent = (metrics[metric] / weekMetrics[metric]) * 100;
                
                // Add to running averages
                distributions[campaign][day].percent += percent;
                distributions[campaign][day].count++;
              }
            });
          });
          
          // Calculate final averages
          Object.keys(distributions[campaign]).forEach(day => {
            if (distributions[campaign][day].count > 0) {
              distributions[campaign][day].percent /= distributions[campaign][day].count;
            }
          });
        });
      });
      
      return distributions;
    } catch (error) {
      console.error("Error calculating weekly distribution patterns:", error);
      return {};
    }
  }, [historicalData]);

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

            // Use day-of-week baselines if available
            const useDayOfWeekBaselines = dayOfWeekBaselines[campaign] !== undefined;

            const campaignAnomalies = campaignRows.filter((row) => {
              const value = Number(row[metric]) || 0;
              
              let expectedValue = mean;
              
              if (useDayOfWeekBaselines && row.DATE) {
                try {
                  const date = new Date(row.DATE);
                  if (!isNaN(date.getTime())) {
                    const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
                    if (dayOfWeekBaselines[campaign][dayOfWeek] && 
                        dayOfWeekBaselines[campaign][dayOfWeek][metric] !== undefined) {
                      expectedValue = dayOfWeekBaselines[campaign][dayOfWeek][metric];
                    }
                  }
                } catch (e) {
                  console.error("Error processing day baseline:", e);
                  // Fallback to overall mean
                }
              }
              
              // Calculate deviation percentage
              const deviationPercent = ((value - expectedValue) / expectedValue) * 100;
              
              // Only include anomalies with more than 10% deviation (either direction)
              return Math.abs(deviationPercent) > 10 && Math.abs(value - expectedValue) > threshold;
            }).map(row => {
              let expectedValue = mean;
              let dayOfWeek;
              
              if (useDayOfWeekBaselines && row.DATE) {
                try {
                  const date = new Date(row.DATE);
                  if (!isNaN(date.getTime())) {
                    dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
                    if (dayOfWeekBaselines[campaign][dayOfWeek] && 
                        dayOfWeekBaselines[campaign][dayOfWeek][metric] !== undefined) {
                      expectedValue = dayOfWeekBaselines[campaign][dayOfWeek][metric];
                    }
                  }
                } catch (e) {
                  console.error("Error processing day baseline:", e);
                  // Fallback to overall mean
                }
              }
              
              return {
                ...row,
                campaign,
                mean: expectedValue,
                actualValue: Number(row[metric]) || 0,
                deviation: ((Number(row[metric]) || 0) - expectedValue) / expectedValue * 100,
                periodType: "daily",
                dayOfWeek
              };
            });

            allAnomalies = [...allAnomalies, ...campaignAnomalies];
          });
        } else {
          // Week-over-week anomaly detection with day-of-week pattern analysis
          Object.entries(campaignData).forEach(([campaign, campaignRows]) => {
            if (!campaignRows.length) return;
            
            // Find the most recent date
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
            
            // Group rows by week with reference to the most recent date
            const weeklyData: Record<number, WeeklyAggregation> = {};
            
            campaignRows.forEach(row => {
              if (!row.DATE) return;
              
              try {
                const rowDate = new Date(row.DATE);
                if (isNaN(rowDate.getTime())) return;
                
                // Calculate which week period this belongs to (0 = current, 1 = previous, etc.)
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
            
            // Convert to array and ensure we have at least 2 weeks of data
            const weeklyValues = Object.values(weeklyData);
            if (weeklyValues.length < 2) return;
            
            // Compare each week with the previous week (week to week comparison)
            for (let i = 0; i < weeklyValues.length - 1; i++) {
              const currentWeek = weeklyValues[i];
              const previousWeek = weeklyValues[i + 1];
              
              // Skip very incomplete weeks (less than 3 days of data)
              if (currentWeek.rows.length < 3 || previousWeek.rows.length < 3) continue;
              
              const currentValue = currentWeek[metric];
              const previousValue = previousWeek[metric];
              
              // Calculate week-over-week percentage change
              const percentChange = ((currentValue - previousValue) / previousValue) * 100;
              
              // Analyze day-of-week distribution if we have historical patterns
              let dayOfWeekDistribution;
              let dayOfWeekBaselinesForWeek;
              
              if (weeklyDistributionPatterns[campaign]) {
                dayOfWeekDistribution = {};
                dayOfWeekBaselinesForWeek = {};
                
                // Calculate actual distribution for this week
                const weekTotal = currentWeek.rows.reduce((total, row) => total + (Number(row[metric]) || 0), 0);
                
                // Group current week by day of week
                const dayGroups: Record<string, { total: number, rows: any[] }> = {};
                
                currentWeek.rows.forEach(row => {
                  if (!row.DATE) return;
                  
                  try {
                    const date = new Date(row.DATE);
                    if (isNaN(date.getTime())) return;
                    
                    const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
                    
                    if (!dayGroups[dayOfWeek]) {
                      dayGroups[dayOfWeek] = { total: 0, rows: [] };
                    }
                    
                    dayGroups[dayOfWeek].total += Number(row[metric]) || 0;
                    dayGroups[dayOfWeek].rows.push(row);
                  } catch (e) {
                    console.error("Error grouping by day of week:", e);
                  }
                });
                
                // Compare to historical distribution
                Object.entries(weeklyDistributionPatterns[campaign]).forEach(([day, { percent }]) => {
                  const actualValue = dayGroups[day]?.total || 0;
                  const actualPercent = weekTotal > 0 ? (actualValue / weekTotal) * 100 : 0;
                  
                  dayOfWeekDistribution[day] = {
                    expected: percent,
                    actual: actualPercent
                  };
                  
                  // Store daily baselines for later use
                  if (dayOfWeekBaselines[campaign] && dayOfWeekBaselines[campaign][day]) {
                    dayOfWeekBaselinesForWeek[day] = dayOfWeekBaselines[campaign][day][metric];
                  }
                });
              }
              
              // Detect significant week-over-week changes (more than 15% change)
              if (Math.abs(percentChange) > 15) {
                const weekLabel = currentWeek.weekStart;
                
                // Calculate daily expected values based on day-of-week baselines
                let dailyExpectedValues;
                
                if (dayOfWeekBaselinesForWeek && Object.keys(dayOfWeekBaselinesForWeek).length > 0) {
                  dailyExpectedValues = currentWeek.rows.map(row => {
                    if (!row.DATE) return previousValue / previousWeek.rows.length;
                    
                    try {
                      const date = new Date(row.DATE);
                      if (isNaN(date.getTime())) return previousValue / previousWeek.rows.length;
                      
                      const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
                      
                      return dayOfWeekBaselinesForWeek[dayOfWeek] || (previousValue / previousWeek.rows.length);
                    } catch (e) {
                      console.error("Error calculating daily expected value:", e);
                      return previousValue / previousWeek.rows.length;
                    }
                  });
                }
                
                allAnomalies.push({
                  campaign,
                  DATE: weekLabel,
                  mean: previousValue, // Use previous week's value as the baseline
                  actualValue: currentValue,
                  deviation: percentChange,
                  periodType: "weekly",
                  rows: currentWeek.rows,
                  weekNumber: currentWeek.weekNumber,
                  comparedTo: previousWeek.weekStart, // Add info about which week this is compared to
                  dayOfWeekDistribution,
                  dayOfWeekBaselines: dayOfWeekBaselinesForWeek,
                  dailyExpectedValues
                });
              }
            }
            
            // Also compare to the overall average (for detecting long-term anomalies)
            if (weeklyValues.length >= 3) {
              // Calculate mean and standard deviation across all available weeks
              const allWeekValues = weeklyValues.map(week => week[metric]);
              const mean = allWeekValues.reduce((a, b) => a + b, 0) / allWeekValues.length;
              const stdDev = Math.sqrt(
                allWeekValues.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / allWeekValues.length
              );
              
              // Lower threshold for weekly trend anomalies
              const threshold = stdDev * 1.2;
              
              // Check each week against the overall average
              weeklyValues.forEach(week => {
                // Skip weeks we've already analyzed in the week-over-week comparison
                // or weeks with too little data
                if (week.rows.length < 3) return;
                
                const value = week[metric];
                const deviationFromAvg = ((value - mean) / mean) * 100;
                
                // Only detect significant deviations from the overall average
                if (Math.abs(deviationFromAvg) > 15 && Math.abs(value - mean) > threshold) {
                  // Check if we already have this week in the anomalies list
                  const alreadyDetected = allAnomalies.some(
                    a => a.campaign === campaign && 
                         a.periodType === "weekly" && 
                         a.weekNumber === week.weekNumber
                  );
                  
                  // Only add if not already detected
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
                      comparedTo: "overall average" // Indicate this is compared to the overall average
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
      // Return empty anomalies in case of error
      return {
        IMPRESSIONS: { anomalies: [] },
        CLICKS: { anomalies: [] },
        REVENUE: { anomalies: [] }
      };
    }
  }, [data, anomalyPeriod, dayOfWeekBaselines, weeklyDistributionPatterns]);

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

  const getWeeklyData = (selectedCampaign: string) => {
    try {
      if (!data || !data.length) {
        console.log("No data available");
        return [];
      }

      const filteredData = selectedCampaign === "all" 
        ? data 
        : data.filter(row => row["CAMPAIGN ORDER NAME"] === selectedCampaign);

      if (!filteredData.length) {
        console.log("No filtered data available");
        return [];
      }

      // Find the most recent date in the dataset
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
      }, new Date(0)); // Start with earliest possible date
      
      console.log(`Most recent date in dataset: ${mostRecentDate.toISOString().split('T')[0]}`);
      
      // Create three 7-day periods working backwards from the most recent date
      const periods: WeeklyData[] = [];
      
      for (let i = 0; i < 3; i++) {
        // Calculate period end (most recent date minus i * 7 days)
        const periodEnd = new Date(mostRecentDate);
        periodEnd.setDate(periodEnd.getDate() - (i * 7));
        
        // Calculate period start (7 days before period end)
        const periodStart = new Date(periodEnd);
        periodStart.setDate(periodEnd.getDate() - 6);
        
        // Format dates as YYYY-MM-DD strings
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
        
        console.log(`Period ${i+1}: ${periodStartStr} to ${periodEndStr}`);
      }
      
      // Calculate metrics for each period
      filteredData.forEach(row => {
        try {
          if (!row.DATE) return;
          
          const rowDate = new Date(row.DATE);
          if (isNaN(rowDate.getTime())) return;
          
          // Normalize to midnight of the day for comparison
          const rowDateStr = rowDate.toISOString().split('T')[0];
          
          // Check which period this row belongs to
          for (let i = 0; i < periods.length; i++) {
            const periodStart = periods[i].periodStart;
            const periodEnd = periods[i].periodEnd;
            
            // Check if row date is within the period range (inclusive)
            if (rowDateStr >= periodStart && rowDateStr <= periodEnd) {
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

      console.log("Weekly periods with metrics:");
      periods.forEach((p, i) => {
        console.log(`Period ${i+1}: ${p.periodStart} - ${p.periodEnd}`);
        console.log(`  Impressions: ${p.IMPRESSIONS}, Clicks: ${p.CLICKS}, Revenue: ${p.REVENUE}`);
      });

      return periods;
    } catch (error) {
      console.error("Error in getWeeklyData:", error);
      return [];
    }
  };

  const weeklyData = useMemo(() => getWeeklyData(selectedWeeklyCampaign), [data, selectedWeeklyCampaign]);
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
  
  // Add a function to handle historical data upload
  const handleHistoricalDataUpload = (data: any[]) => {
    setHistoricalData(data);
    console.log(`Loaded ${data.length} historical data rows for day-of-week analysis`);
  };

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

      {/* Historical data upload section */}
      {!historicalData.length && (
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Upload Historical Data</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Upload historical data to enable day-of-week based anomaly detection
            </p>
          </div>
          <FileUpload onDataLoaded={handleHistoricalDataUpload} />
        </Card>
      )}

      {historicalData.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <
