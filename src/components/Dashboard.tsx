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
import { AlertTriangle, TrendingDown, TrendingUp, Filter, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AnomalyDetails from "./AnomalyDetails";
import { getColorClasses } from "@/utils/anomalyColors";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MultiSelect, Option } from "./MultiSelect";
import MetricCard from "./MetricCard";
import { Toggle } from "./ui/toggle";
import { normalizeDate, setToEndOfDay, setToStartOfDay } from "@/lib/utils";

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
  TRANSACTIONS?: number;
}

interface WeeklyAggregation {
  weekStart: string;
  [metric: string]: any;
  rows: any[];
}

type ChartViewMode = "date" | "dayOfWeek";
type AnomalyPeriod = "daily" | "weekly";
type ComparisonPeriod = "7" | "14" | "30";

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
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>("7");
  const [weeklyDataState, setWeeklyDataState] = useState<WeeklyData[]>([]);
  const [showAnomalySection, setShowAnomalySection] = useState<boolean>(false);
  const [metricsViewMode, setMetricsViewMode] = useState<ChartViewMode>("date");
  const [revenueViewMode, setRevenueViewMode] = useState<ChartViewMode>("date");
  
  const renderCountRef = useRef(0);
  
  useEffect(() => {
    renderCountRef.current += 1;
    console.log(`Dashboard render #${renderCountRef.current}, data rows: ${data?.length || 0}`);
  });

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
    
    if (selected.length > 0) {
      const matchingCampaigns = campaigns.filter(campaign => {
        const match = campaign.match(/SM:\s+([^-]+)/);
        const advertiser = match ? match[1].trim() : "";
        return selected.includes(advertiser);
      });
      
      if (selectedMetricsCampaigns.length === 0 || !selectedMetricsCampaigns.some(campaign => matchingCampaigns.includes(campaign))) {
        if (onMetricsCampaignsChange) {
          onMetricsCampaignsChange(matchingCampaigns);
        }
      }
    } else if (selected.length === 0 && onMetricsCampaignsChange) {
      onMetricsCampaignsChange([]);
    }
  };

  const handleRevenueAdvertisersChange = (selected: string[]) => {
    if (onRevenueAdvertisersChange) {
      onRevenueAdvertisersChange(selected);
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
      
      console.log(`Aggregating ${filteredData.length} rows of data`);
      
      const allDates = filteredData.map(row => row.DATE).filter(Boolean);
      if (allDates.length > 0) {
        const sortedDates = [...allDates].sort();
        console.log(`Input date range for aggregation: ${sortedDates[0]} to ${sortedDates[sortedDates.length-1]}`);
        console.log(`Unique dates in input: ${new Set(allDates).size}`);
      }
      
      const dateGroups: Record<string, any> = {};
      
      filteredData.forEach(row => {
        if (!row || !row.DATE) {
          console.warn(`Skipping row with missing date: ${JSON.stringify(row)}`);
          return;
        }
        
        const normalizedDate = normalizeDate(row.DATE);
        if (!normalizedDate) {
          console.warn(`Invalid date in row: ${row.DATE}`);
          return;
        }
        
        if (normalizedDate.includes('-04-')) {
          console.log(`Processing April data: ${normalizedDate}, impressions: ${row.IMPRESSIONS}, clicks: ${row.CLICKS}, revenue: ${row.REVENUE}`);
        }
        
        if (!dateGroups[normalizedDate]) {
          dateGroups[normalizedDate] = {
            DATE: normalizedDate,
            IMPRESSIONS: 0,
            CLICKS: 0,
            REVENUE: 0
          };
        }
        
        dateGroups[normalizedDate].IMPRESSIONS += Number(row.IMPRESSIONS) || 0;
        dateGroups[normalizedDate].CLICKS += Number(row.CLICKS) || 0;
        dateGroups[normalizedDate].REVENUE += Number(row.REVENUE) || 0;
      });

      const result = Object.values(dateGroups).sort((a: any, b: any) => {
        try {
          return new Date(a.DATE).getTime() - new Date(b.DATE).getTime();
        } catch (err) {
          console.error(`Error sorting dates: ${a.DATE} vs ${b.DATE}`, err);
          return 0;
        }
      });
      
      console.log(`Aggregated data has ${result.length} dates`);
      if (result.length > 0) {
        console.log(`Aggregated date range: ${result[0].DATE} to ${result[result.length-1].DATE}`);
        result.forEach(row => {
          if (row.DATE && row.DATE.includes('-04-')) {
            console.log(`Aggregated April data: ${row.DATE}, impressions: ${row.IMPRESSIONS}, clicks: ${row.CLICKS}, revenue: ${row.REVENUE}`);
          }
        });
      }
      
      return result;
    } catch (error) {
      console.error("Error in getAggregatedData:", error);
      return [];
    }
  };

  const getAggregatedDataByDayOfWeek = (filteredData: any[]) => {
    try {
      if (!filteredData || !filteredData.length) return [];
      
      console.log(`Aggregating ${filteredData.length} rows by day of week`);
      
      const dayOfWeekGroups: Record<number, any> = {
        0: { dayNum: 0, DAY_OF_WEEK: "Sunday", IMPRESSIONS: 0, CLICKS: 0, REVENUE: 0, count: 0 },
        1: { dayNum: 1, DAY_OF_WEEK: "Monday", IMPRESSIONS: 0, CLICKS: 0, REVENUE: 0, count: 0 },
        2: { dayNum: 2, DAY_OF_WEEK: "Tuesday", IMPRESSIONS: 0, CLICKS: 0, REVENUE: 0, count: 0 },
        3: { dayNum: 3, DAY_OF_WEEK: "Wednesday", IMPRESSIONS: 0, CLICKS: 0, REVENUE: 0, count: 0 },
        4: { dayNum: 4, DAY_OF_WEEK: "Thursday", IMPRESSIONS: 0, CLICKS: 0, REVENUE: 0, count: 0 },
        5: { dayNum: 5, DAY_OF_WEEK: "Friday", IMPRESSIONS: 0, CLICKS: 0, REVENUE: 0, count: 0 },
        6: { dayNum: 6, DAY_OF_WEEK: "Saturday", IMPRESSIONS: 0, CLICKS: 0, REVENUE: 0, count: 0 }
      };
      
      const includedDates = new Set<string>();
      
      filteredData.forEach(row => {
        if (!row || !row.DATE) return;
        
        const normalizedDate = normalizeDate(row.DATE);
        if (!normalizedDate) {
          console.warn(`Invalid date in row: ${row.DATE}`);
          return;
        }
        
        includedDates.add(normalizedDate);
        
        const date = new Date(normalizedDate);
        if (isNaN(date.getTime())) return;
        
        const dayOfWeek = date.getDay();
        
        dayOfWeekGroups[dayOfWeek].IMPRESSIONS += Number(row.IMPRESSIONS) || 0;
        dayOfWeekGroups[dayOfWeek].CLICKS += Number(row.CLICKS) || 0;
        dayOfWeekGroups[dayOfWeek].REVENUE += Number(row.REVENUE) || 0;
        dayOfWeekGroups[dayOfWeek].count += 1;
      });
      
      console.log(`Day of week aggregation includes ${includedDates.size} unique dates`);
      
      return Object.values(dayOfWeekGroups).sort((a, b) => a.dayNum - b.dayNum);
    } catch (error) {
      console.error("Error in getAggregatedDataByDayOfWeek:", error);
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

  const calculateCTR = (clicks: number, impressions: number): number => {
    if (impressions === 0) return 0;
    return (clicks / impressions) * 100;
  };

  const formatCTR = (value: number) => {
    try {
      return `${value.toFixed(3)}%`;
    } catch (error) {
      console.error("Error formatting CTR:", error);
      return "0.000%";
    }
  };

  const formatTransactions = (value: number) => {
    try {
      return Math.round(value).toLocaleString();
    } catch (error) {
      console.error("Error formatting transactions:", error);
      return "0";
    }
  };

  const calculateAOV = (revenue: number, transactions: number): number => {
    if (transactions === 0) return 0;
    return revenue / transactions;
  };

  const formatAOV = (value: number) => {
    try {
      return `$${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
    } catch (error) {
      console.error("Error formatting AOV:", error);
      return "$0.00";
    }
  };

  const getWeeklyData = (selectedCampaign: string, selectedAdvertisers: string[], periodLength: ComparisonPeriod): WeeklyData[] => {
    console.log(`getWeeklyData called with campaign=${selectedCampaign}, advertisers=${selectedAdvertisers.join(',')}, period=${periodLength}`);
    
    if (!data || data.length === 0) {
      console.log("No data available for weekly comparison");
      return [];
    }

    try {
      let filteredData = JSON.parse(JSON.stringify(data));
      console.log(`Starting with ${filteredData.length} rows of data`);
      
      const allDates = filteredData.map((row: any) => row.DATE).filter(Boolean);
      if (allDates.length > 0) {
        const sortedDates = [...allDates].sort();
        console.log(`Weekly data input range: ${sortedDates[0]} to ${sortedDates[sortedDates.length-1]}`);
      }
      
      if (selectedAdvertisers.length > 0) {
        filteredData = filteredData.filter((row: any) => {
          if (!row["CAMPAIGN ORDER NAME"]) return false;
          
          const campaignName = row["CAMPAIGN ORDER NAME"];
          const match = campaignName.match(/SM:\s+([^-]+)/);
          const advertiser = match ? match[1].trim() : "";
          return selectedAdvertisers.includes(advertiser);
        });
        console.log(`After advertiser filter: ${filteredData.length} rows`);
      }
      
      if (selectedCampaign !== "all") {
        filteredData = filteredData.filter((row: any) => row["CAMPAIGN ORDER NAME"] === selectedCampaign);
        console.log(`After campaign filter: ${filteredData.length} rows`);
      }
      
      if (filteredData.length === 0) {
        console.log("No data after filtering");
        return [];
      }

      const rowsWithDates = filteredData.map((row: any) => {
        try {
          if (!row.DATE) return null;
          
          const normalizedDate = normalizeDate(row.DATE);
          if (!normalizedDate) return null;
          
          return {
            ...row,
            parsedDate: new Date(normalizedDate)
          };
        } catch (e) {
          console.error(`Error parsing date: ${row.DATE}`, e);
          return null;
        }
      }).filter(Boolean);
      
      console.log(`Rows with valid dates: ${rowsWithDates.length}`);
      
      if (rowsWithDates.length === 0) {
        console.log("No rows with valid dates");
        return [];
      }

      const dates = rowsWithDates.map((row: any) => row.parsedDate);
      const mostRecentDate = new Date(Math.max(...dates.map(d => d.getTime())));
      const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
      
      console.log(`Date range: ${earliestDate.toISOString()} to ${mostRecentDate.toISOString()}`);
      
      const daysPeriod = parseInt(periodLength, 10);
      const totalDays = Math.floor((mostRecentDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const completePeriods = Math.floor(totalDays / daysPeriod);
      
      console.log(`Total days: ${totalDays}, Days per period: ${daysPeriod}, Complete periods: ${completePeriods}`);
      
      if (completePeriods < 1) {
        console.log("Not enough data for even one complete period");
        return [];
      }

      const periods: WeeklyData[] = [];
      
      for (let i = 0; i < completePeriods; i++) {
        const periodEnd = new Date(mostRecentDate);
        periodEnd.setHours(23, 59, 59, 999);
        if (i > 0) {
          periodEnd.setDate(periodEnd.getDate() - (i * daysPeriod));
        }
        
        const periodStart = new Date(periodEnd);
        periodStart.setDate(periodEnd.getDate() - (daysPeriod - 1));
        periodStart.setHours(0, 0, 0, 0);
        
        if (periodStart < earliestDate) {
          console.log(`Skipping period ${i+1} - starts before earliest data`);
          continue;
        }
        
        const periodStartStr = periodStart.toISOString().split('T')[0];
        const periodEndStr = periodEnd.toISOString().split('T')[0];
        
        console.log(`Creating period ${i+1}: ${periodStartStr} to ${periodEndStr}`);
        
        periods.push({
          periodStart: periodStartStr,
          periodEnd: periodEndStr,
          IMPRESSIONS: 0,
          CLICKS: 0,
          REVENUE: 0,
          ROAS: 0,
          count: 0,
          TRANSACTIONS: 0
        });
      }
      
      console.log(`Created ${periods.length} periods of ${daysPeriod} days each`);
      
      rowsWithDates.forEach((row: any) => {
        try {
          const rowDate = row.parsedDate;
          const rowTime = rowDate.getTime();
          
          for (let i = 0; i < periods.length; i++) {
            const periodStart = new Date(periods[i].periodStart);
            const periodEnd = new Date(periods[i].periodEnd);
            periodEnd.setHours(23, 59, 59, 999);
            
            if (rowTime >= periodStart.getTime() && rowTime <= periodEnd.getTime()) {
              periods[i].IMPRESSIONS += Number(row.IMPRESSIONS) || 0;
              periods[i].CLICKS += Number(row.CLICKS) || 0;
              periods[i].REVENUE += Number(row.REVENUE) || 0;
              periods[i].TRANSACTIONS += Number(row.TRANSACTIONS) || 0;
              periods[i].count += 1;
              break;
            }
          }
        } catch (err) {
          console.error("Error processing row for period metrics:", err);
        }
      });

      const nonEmptyPeriods = periods.filter(period => period.count > 0);
      
      nonEmptyPeriods.forEach(period => {
        period.ROAS = calculateROAS(period.REVENUE, period.IMPRESSIONS);
      });
      
      console.log(`Final periods with data: ${nonEmptyPeriods.length}`);
      
      if (nonEmptyPeriods.length > 0) {
        console.log("First period data:", JSON.stringify(nonEmptyPeriods[0]));
        if (nonEmptyPeriods.length > 1) {
          console.log("Second period data:", JSON.stringify(nonEmptyPeriods[1]));
        }
      }

      return nonEmptyPeriods;
    } catch (error) {
      console.error("Error in getWeeklyData:", error);
      return [];
    }
  };

  const availablePeriods = useMemo(() => {
    try {
      if (!data || !data.length) {
        console.log("No data for period calculation");
        return ["7"];
      }

      const dates = data
        .map(row => {
          try {
            if (!row.DATE) return null;
            const normalizedDate = normalizeDate(row.DATE);
            if (!normalizedDate) return null;
            return new Date(normalizedDate);
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean) as Date[];
      
      if (!dates.length) {
        console.log("No valid dates found for period calculation");
        return ["7"];
      }

      const mostRecentDate = new Date(Math.max(...dates.map(d => d.getTime())));
      const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
      
      const totalDays = Math.floor((mostRecentDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      console.log(`Total days available for period calculation: ${totalDays}, from ${earliestDate.toISOString()} to ${mostRecentDate.toISOString()}`);
      
      const periods: ComparisonPeriod[] = ["7"];
      
      if (totalDays >= 28) { // Need at least 2 x 14-day periods
        periods.push("14");
      }
      
      if (totalDays >= 60) { // Need at least 2 x 30-day periods
        periods.push("30");
      }
      
      console.log(`Available periods: ${periods.join(", ")}`);
      return periods;
    } catch (error) {
      console.error("Error calculating available periods:", error);
      return ["7"];
    }
  }, [data]);

  useEffect(() => {
    console.log("Calculating weekly data...");
    const calculatedData = getWeeklyData(selectedWeeklyCampaign, selectedWeeklyAdvertisers, comparisonPeriod);
    console.log(`Weekly data calculation complete. Found ${calculatedData.length} periods.`);
    setWeeklyDataState(calculatedData);
  }, [data, selectedWeeklyCampaign, selectedWeeklyAdvertisers, comparisonPeriod]);

  const processedMetricsData = useMemo(() => {
    console.log(`Processing metrics data with view mode: ${metricsViewMode}`);
    if (metricsViewMode === "date") {
      return getAggregatedData(metricsData || data);
    } else {
      return getAggregatedDataByDayOfWeek(metricsData || data);
    }
  }, [metricsViewMode, metricsData, data]);
  
  const processedRevenueData = useMemo(() => {
    console.log(`Processing revenue data with view mode: ${revenueViewMode}`);
    if (revenueViewMode === "date") {
      return getAggregatedData(revenueData || data);
    } else {
      return getAggregatedDataByDayOfWeek(revenueData || data);
    }
  }, [revenueViewMode, revenueData, data]);

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
      if (isNaN(date.getTime())) return dateString;
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
      
      {showAnomalySection && (
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
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Display Metrics Over Time</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-4 mr-4">
              <span className="text-sm font-medium">View:</span>
              <ToggleGroup type="single" value={metricsViewMode} onValueChange={(value) => value && setMetricsViewMode(value as ChartViewMode)}>
                <ToggleGroupItem value="date" aria-label="By Date" className="text-sm">
                  By Date
                </ToggleGroupItem>
                <ToggleGroupItem value="dayOfWeek" aria-label="By Day of Week" className="text-sm">
                  By Day of Week
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <span className="text-sm font-medium mr-1">Filter by:</span>
            <div className="flex items-center gap-2">
              {advertiserOptions.length > 0 && (
                <MultiSelect
                  options={advertiserOptions}
                  selected={selectedMetricsAdvertisers}
                  onChange={handleMetricsAdvertisersChange}
                  placeholder="Advertiser"
                  className="w-[200px]"
                />
              )}
              
              {onMetricsCampaignsChange && filteredMetricsCampaignOptions.length > 0 && (
                <MultiSelect
                  options={filteredMetricsCampaignOptions}
                  selected={selectedMetricsCampaigns}
                  onChange={onMetricsCampaignsChange}
                  placeholder="Campaign"
                  className="w-[200px]"
                  popoverClassName="w-[400px]"
                />
              )}
            </div>
          </div>
        </div>
        <div className="h-[400px]">
          {processedMetricsData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={processedMetricsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey={metricsViewMode === "date" ? "DATE" : "DAY_OF_WEEK"} 
                  style={axisStyle}
                  tickFormatter={metricsViewMode === "date" ? formatDate : undefined}
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
                  labelFormatter={metricsViewMode === "date" ? formatDate : undefined}
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
            <div className="flex items-center gap-4 mr-4">
              <span className="text-sm font-medium">View:</span>
              <ToggleGroup type="single" value={revenueViewMode} onValueChange={(value) => value && setRevenueViewMode(value as ChartViewMode)}>
                <ToggleGroupItem value="date" aria-label="By Date" className="text-sm">
                  By Date
                </ToggleGroupItem>
                <ToggleGroupItem value="dayOfWeek" aria-label="By Day of Week" className="text-sm">
                  By Day of Week
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <span className="text-sm font-medium mr-1">Filter by:</span>
            <div className="flex items-center gap-2">
              {onRevenueAdvertisersChange && advertiserOptions.length > 0 && (
                <MultiSelect
                  options={advertiserOptions}
                  selected={selectedRevenueAdvertisers}
                  onChange={handleRevenueAdvertisersChange}
                  placeholder="Advertiser"
                  className="w-[200px]"
                />
              )}
              
              {onRevenueCampaignsChange && filteredRevenueCampaignOptions.length > 0 && (
                <MultiSelect
                  options={filteredRevenueCampaignOptions}
                  selected={selectedRevenueCampaigns}
                  onChange={onRevenueCampaignsChange}
                  placeholder="Campaign"
                  className="w-[200px]"
                  popoverClassName="w-[400px]"
                />
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
                  dataKey={revenueViewMode === "date" ? "DATE" : "DAY_OF_WEEK"} 
                  style={axisStyle}
                  tickFormatter={revenueViewMode === "date" ? formatDate : undefined}
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
                  labelFormatter={revenueViewMode === "date" ? formatDate : undefined}
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
              <h3 className="text-lg font-semibold">Weekly Comparison</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {weeklyDataState.length} periods found ({weeklyDataState.length * parseInt(comparisonPeriod)} days of data)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 mr-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Period:</span>
                <Select 
                  value={comparisonPeriod} 
                  onValueChange={(value) => setComparisonPeriod(value as ComparisonPeriod)}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Period length" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePeriods.includes("7") && (
                      <SelectItem value="7">7 days</SelectItem>
                    )}
                    {availablePeriods.includes("14") && (
                      <SelectItem value="14">14 days</SelectItem>
                    )}
                    {availablePeriods.includes("30") && (
                      <SelectItem value="30">30 days</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
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
                  <SelectContent className="w-[400px]">
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

        {weeklyDataState.length >= 1 ? (
          <ScrollArea className="h-[460px]">
            <div className="grid gap-4 pb-4 pr-4">
              {weeklyDataState.map((period, index) => {
                const previousPeriod = weeklyDataState[index + 1];
                const periodLabel = `${formatDate(period.periodStart)} - ${formatDate(period.periodEnd)}`;
                
                // Calculate derived metrics
                const ctr = calculateCTR(period.CLICKS, period.IMPRESSIONS);
                const previousCtr = previousPeriod ? calculateCTR(previousPeriod.CLICKS, previousPeriod.IMPRESSIONS) : 0;
                
                // Use the TRANSACTIONS property or estimate based on revenue
                const transactions = period.TRANSACTIONS || Math.round(period.REVENUE / 50); // Default AOV of $50 if no transactions
                const previousTransactions = previousPeriod ? (previousPeriod.TRANSACTIONS || Math.round(previousPeriod.REVENUE / 50)) : 0;
                
                const aov = calculateAOV(period.REVENUE, transactions);
                const previousAov = previousPeriod ? calculateAOV(previousPeriod.REVENUE, previousTransactions) : 0;
                
                const metrics = [
                  {
                    title: "Impressions",
                    current: period.IMPRESSIONS,
                    previous: previousPeriod?.IMPRESSIONS,
                    format: formatNumber
                  },
                  {
                    title: "Clicks",
                    current: period.CLICKS,
                    previous: previousPeriod?.CLICKS,
                    format: formatNumber
                  },
                  {
                    title: "CTR",
                    current: ctr,
                    previous: previousCtr,
                    format: formatCTR
                  },
                  {
                    title: "Transactions",
                    current: transactions,
                    previous: previousTransactions,
                    format: formatTransactions
                  },
                  {
                    title: "Revenue",
                    current: period.REVENUE,
                    previous: previousPeriod?.REVENUE,
                    format: formatRevenue
                  },
                  {
                    title: "AOV",
                    current: aov,
                    previous: previousAov,
                    format: formatAOV
                  },
                  {
                    title: "ROAS",
                    current: period.ROAS,
                    previous: previousPeriod?.ROAS,
                    format: formatROAS
                  }
                ];
                
                return (
                  <div key={index} className="mb-3">
                    <div className="text-xs font-medium text-muted-foreground mb-1 ml-1">
                      {periodLabel}
                    </div>
                    <div className="grid gap-3 md:grid-cols-7">
                      {metrics.map((metric, metricIndex) => {
                        const percentChange = metric.previous
                          ? ((metric.current - metric.previous) / metric.previous) * 100
                          : metric.current > 0 ? 100 : 0;

                        const colorClasses = getColorClasses(percentChange).split(' ').find(c => c.startsWith('text-')) || '';
                        
                        return (
                          <Card key={`${index}-${metricIndex}`} className="p-3">
                            <div className="mb-1">
                              <span className="text-xs font-medium">{metric.title}</span>
                            </div>
                            <div className="space-y-1">
                              <div className="text-base font-bold">
                                {metric.format(metric.current)}
                              </div>
                              {previousPeriod && (
                                <div className={`flex items-center text-xs ${colorClasses}`}>
                                  {percentChange > 0 ? (
                                    <TrendingUp className="mr-1 h-3 w-3" />
                                  ) : (
                                    <TrendingDown className="mr-1 h-3 w-3" />
                                  )}
                                  <span>
                                    {percentChange > 0 ? "+" : ""}
                                    {percentChange.toFixed(1)}%
                                  </span>
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">No period data available for the selected campaign</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
