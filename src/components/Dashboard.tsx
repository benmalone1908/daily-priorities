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
import { useCampaignFilter } from "@/contexts/CampaignFilterContext";

interface DashboardProps {
  data: any[];
  metricsData?: any[];
  revenueData?: any[];
  selectedMetricsCampaigns?: string[];
  selectedRevenueCampaigns?: string[];
  selectedRevenueAdvertisers?: string[];
  selectedMetricsAgencies?: string[];
  selectedRevenueAgencies?: string[];
  selectedWeeklyAgencies?: string[];
  onMetricsCampaignsChange?: (selected: string[]) => void;
  onRevenueCampaignsChange?: (selected: string[]) => void;
  onRevenueAdvertisersChange?: (selected: string[]) => void;
  onMetricsAgenciesChange?: (selected: string[]) => void;
  onRevenueAgenciesChange?: (selected: string[]) => void;
  sortedCampaignOptions?: string[];
  sortedAdvertiserOptions?: string[];
  sortedAgencyOptions?: string[];
  aggregatedMetricsData?: any[]; // Added this property
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
  weekNumber: number;
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
  selectedMetricsAgencies = [],
  selectedRevenueAgencies = [],
  onMetricsCampaignsChange,
  onRevenueCampaignsChange,
  onRevenueAdvertisersChange,
  onMetricsAgenciesChange,
  onRevenueAgenciesChange,
  sortedCampaignOptions = [],
  sortedAdvertiserOptions = [],
  sortedAgencyOptions = [],
  aggregatedMetricsData
}: DashboardProps) => {
  const [selectedWeeklyCampaign, setSelectedWeeklyCampaign] = useState<string>("all");
  const [selectedWeeklyAdvertisers, setSelectedWeeklyAdvertisers] = useState<string[]>([]);
  const [selectedWeeklyAgencies, setSelectedWeeklyAgencies] = useState<string[]>([]);
  const [selectedMetricsAdvertisers, setSelectedMetricsAdvertisers] = useState<string[]>([]);
  const [anomalyPeriod, setAnomalyPeriod] = useState<AnomalyPeriod>("daily");
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>("7");
  const [weeklyDataState, setWeeklyDataState] = useState<WeeklyData[]>([]);
  const [showAnomalySection, setShowAnomalySection] = useState<boolean>(false);
  const [metricsViewMode, setMetricsViewMode] = useState<ChartViewMode>("date");
  const [revenueViewMode, setRevenueViewMode] = useState<ChartViewMode>("date");
  
  const { extractAgencyPrefix, getAgencyFromPrefix, extractAdvertiserName } = useCampaignFilter();
  
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

  const agencyOptions: Option[] = useMemo(() => {
    return (sortedAgencyOptions || []).map(agency => ({
      value: agency,
      label: agency
    }));
  }, [sortedAgencyOptions]);

  // Filter advertiser options based on selected agencies
  const filteredAdvertiserOptions: Option[] = useMemo(() => {
    const allAdvertisers = advertisers.map(advertiser => ({
      value: advertiser,
      label: advertiser
    }));

    if (!selectedMetricsAgencies.length && !selectedRevenueAgencies.length) {
      return allAdvertisers;
    }

    // Combine all selected agencies for both metrics and revenue
    const allSelectedAgencies = new Set([...selectedMetricsAgencies, ...selectedRevenueAgencies]);
    
    // Filter advertisers that belong to selected agencies
    const filteredAdvertisers = new Set<string>();
    
    console.log(`Filtering advertisers for agencies: ${Array.from(allSelectedAgencies).join(', ')}`);
    
    data.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      if (!campaignName) return;
      
      const prefix = extractAgencyPrefix(campaignName);
      const agency = getAgencyFromPrefix(prefix);
      
      if (agency && allSelectedAgencies.has(agency)) {
        const advertiser = extractAdvertiserName(campaignName);
        if (advertiser) {
          filteredAdvertisers.add(advertiser);
        }
      }
    });
    
    console.log(`Found ${filteredAdvertisers.size} advertisers for selected agencies`);
    
    return Array.from(filteredAdvertisers).sort()
      .map(advertiser => ({ value: advertiser, label: advertiser }));
  }, [advertisers, data, selectedMetricsAgencies, selectedRevenueAgencies, extractAgencyPrefix, getAgencyFromPrefix, extractAdvertiserName]);

  const campaignOptions: Option[] = useMemo(() => {
    return campaigns.map(campaign => ({
      value: campaign,
      label: campaign
    }));
  }, [campaigns]);

  const advertiserOptions: Option[] = useMemo(() => {
    return filteredAdvertiserOptions;
  }, [filteredAdvertiserOptions]);

  const filteredMetricsCampaignOptions = useMemo(() => {
    if (!selectedMetricsAdvertisers.length && !selectedMetricsAgencies.length) return campaignOptions;
    
    return campaignOptions.filter(option => {
      const campaignName = option.value;
      
      // Filter by advertiser if selected
      if (selectedMetricsAdvertisers.length > 0) {
        const advertiser = extractAdvertiserName(campaignName);
        if (!advertiser || !selectedMetricsAdvertisers.includes(advertiser)) {
          return false;
        }
      }
      
      // Filter by agency if selected
      if (selectedMetricsAgencies.length > 0) {
        const prefix = extractAgencyPrefix(campaignName);
        const agency = getAgencyFromPrefix(prefix);
        if (!agency || !selectedMetricsAgencies.includes(agency)) {
          return false;
        }
      }
      
      return true;
    });
  }, [campaignOptions, selectedMetricsAdvertisers, selectedMetricsAgencies, extractAgencyPrefix, getAgencyFromPrefix, extractAdvertiserName]);

  const filteredRevenueCampaignOptions = useMemo(() => {
    if (!selectedRevenueAdvertisers.length && !selectedRevenueAgencies.length) return campaignOptions;
    
    return campaignOptions.filter(option => {
      const campaignName = option.value;
      
      // Filter by advertiser if selected
      if (selectedRevenueAdvertisers.length > 0) {
        const advertiser = extractAdvertiserName(campaignName);
        if (!advertiser || !selectedRevenueAdvertisers.includes(advertiser)) {
          return false;
        }
      }
      
      // Filter by agency if selected
      if (selectedRevenueAgencies.length > 0) {
        const prefix = extractAgencyPrefix(campaignName);
        const agency = getAgencyFromPrefix(prefix);
        if (!agency || !selectedRevenueAgencies.includes(agency)) {
          return false;
        }
      }
      
      return true;
    });
  }, [campaignOptions, selectedRevenueAdvertisers, selectedRevenueAgencies, extractAgencyPrefix, getAgencyFromPrefix, extractAdvertiserName]);

  const filteredWeeklyCampaignOptions = useMemo(() => {
    let filteredOptions = campaignOptions;
    
    // Filter by agency if selected
    if (selectedWeeklyAgencies.length > 0) {
      filteredOptions = filteredOptions.filter(option => {
        const campaignName = option.value;
        const prefix = extractAgencyPrefix(campaignName);
        const agency = getAgencyFromPrefix(prefix);
        return agency && selectedWeeklyAgencies.includes(agency);
      });
    }
    
    // Further filter by advertiser if selected
    if (selectedWeeklyAdvertisers.length > 0) {
      filteredOptions = filteredOptions.filter(option => {
        const campaignName = option.value;
        const advertiser = extractAdvertiserName(campaignName);
        return advertiser && selectedWeeklyAdvertisers.includes(advertiser);
      });
    }
    
    return [
      { value: "all", label: "All Campaigns" },
      ...filteredOptions
    ];
  }, [campaignOptions, selectedWeeklyAdvertisers, selectedWeeklyAgencies, extractAgencyPrefix, getAgencyFromPrefix, extractAdvertiserName]);

  // Filter weekly advertiser options based on selected agencies
  const filteredWeeklyAdvertiserOptions = useMemo(() => {
    if (!selectedWeeklyAgencies.length) {
      return advertiserOptions;
    }
    
    const filteredAdvertisers = new Set<string>();
    
    data.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      if (!campaignName) return;
      
      const prefix = extractAgencyPrefix(campaignName);
      const agency = getAgencyFromPrefix(prefix);
      
      if (agency && selectedWeeklyAgencies.includes(agency)) {
        const advertiser = extractAdvertiserName(campaignName);
        if (advertiser) {
          filteredAdvertisers.add(advertiser);
        }
      }
    });
    
    return Array.from(filteredAdvertisers).sort()
      .map(advertiser => ({ value: advertiser, label: advertiser }));
  }, [data, advertiserOptions, selectedWeeklyAgencies, extractAgencyPrefix, getAgencyFromPrefix, extractAdvertiserName]);

  const handleMetricsAgenciesChange = (selected: string[]) => {
    if (onMetricsAgenciesChange) {
      onMetricsAgenciesChange(selected);
    }
    
    // If the selected advertisers don't belong to the newly selected agencies, reset them
    if (selected.length > 0 && selectedMetricsAdvertisers.length > 0) {
      const validAdvertisers = new Set<string>();
      
      data.forEach(row => {
        const campaignName = row["CAMPAIGN ORDER NAME"] || "";
        if (!campaignName) return;
        
        const prefix = extractAgencyPrefix(campaignName);
        const agency = getAgencyFromPrefix(prefix);
        
        if (agency && selected.includes(agency)) {
          const advertiser = extractAdvertiserName(campaignName);
          if (advertiser) {
            validAdvertisers.add(advertiser);
          }
        }
      });
      
      const newAdvertisers = selectedMetricsAdvertisers.filter(adv => 
        validAdvertisers.has(adv)
      );
      
      if (newAdvertisers.length !== selectedMetricsAdvertisers.length) {
        setSelectedMetricsAdvertisers(newAdvertisers);
      }
    }
  };

  const handleMetricsAdvertisersChange = (selected: string[]) => {
    setSelectedMetricsAdvertisers(selected);
    
    if (selected.length > 0 && onMetricsCampaignsChange) {
      const validCampaigns = selectedMetricsCampaigns.filter(campaign => {
        const advertiser = extractAdvertiserName(campaign);
        return advertiser && selected.includes(advertiser);
      });
      
      onMetricsCampaignsChange(validCampaigns);
    }
    
    if (selected.length > 0) {
      const matchingCampaigns = campaigns.filter(campaign => {
        const advertiser = extractAdvertiserName(campaign);
        return advertiser && selected.includes(advertiser);
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

  const handleRevenueAgenciesChange = (selected: string[]) => {
    if (onRevenueAgenciesChange) {
      onRevenueAgenciesChange(selected);
    }
    
    // If the selected advertisers don't belong to the newly selected agencies, reset them
    if (selected.length > 0 && selectedRevenueAdvertisers.length > 0) {
      const validAdvertisers = new Set<string>();
      
      data.forEach(row => {
        const campaignName = row["CAMPAIGN ORDER NAME"] || "";
        if (!campaignName) return;
        
        const prefix = extractAgencyPrefix(campaignName);
        const agency = getAgencyFromPrefix(prefix);
        
        if (agency && selected.includes(agency)) {
          const advertiser = extractAdvertiserName(campaignName);
          if (advertiser) {
            validAdvertisers.add(advertiser);
          }
        }
      });
      
      const newAdvertisers = selectedRevenueAdvertisers.filter(adv => 
        validAdvertisers.has(adv)
      );
      
      if (newAdvertisers.length !== selectedRevenueAdvertisers.length && onRevenueAdvertisersChange) {
        onRevenueAdvertisersChange(newAdvertisers);
      }
    }
  };

  const handleRevenueAdvertisersChange = (selected: string[]) => {
    if (onRevenueAdvertisersChange) {
      onRevenueAdvertisersChange(selected);
    }
    
    // Update campaigns if advertisers change
    if (selected.length > 0 && onRevenueCampaignsChange) {
      const validCampaigns = selectedRevenueCampaigns.filter(campaign => {
        const advertiser = extractAdvertiserName(campaign);
        return advertiser && selected.includes(advertiser);
      });
      
      if (validCampaigns.length !== selectedRevenueCampaigns.length) {
        onRevenueCampaignsChange(validCampaigns);
      }
    }
  };

  const handleWeeklyAgenciesChange = (selected: string[]) => {
    setSelectedWeeklyAgencies(selected);
    
    // Reset advertisers if they don't belong to selected agencies
    if (selected.length > 0 && selectedWeeklyAdvertisers.length > 0) {
      const validAdvertisers = new Set<string>();
      
      data.forEach(row => {
        const campaignName = row["CAMPAIGN ORDER NAME"] || "";
        if (!campaignName) return;
        
        const prefix = extractAgencyPrefix(campaignName);
        const agency = getAgencyFromPrefix(prefix);
        
        if (agency && selected.includes(agency)) {
          const advertiser = extractAdvertiserName(campaignName);
          if (advertiser) {
            validAdvertisers.add(advertiser);
          }
        }
      });
      
      const newAdvertisers = selectedWeeklyAdvertisers.filter(adv => 
        validAdvertisers.has(adv)
      );
      
      if (newAdvertisers.length !== selectedWeeklyAdvertisers.length) {
        setSelectedWeeklyAdvertisers(newAdvertisers);
      }
    }
    
    // Reset campaign selection if it doesn't belong to selected agencies
    if (selected.length > 0 && selectedWeeklyCampaign !== "all") {
      const prefix = extractAgencyPrefix(selectedWeeklyCampaign);
      const agency = getAgencyFromPrefix(prefix);
      
      if (!agency || !selected.includes(agency)) {
        setSelectedWeeklyCampaign("all");
      }
    }
  };

  const handleWeeklyAdvertisersChange = (selected: string[]) => {
    setSelectedWeeklyAdvertisers(selected);
    
    // Reset campaign selection if it doesn't belong to selected advertisers
    if (selected.length > 0 && selectedWeeklyCampaign !== "all") {
      const advertiser = extractAdvertiserName(selectedWeeklyCampaign);
      
      if (!advertiser || !selected.includes(advertiser)) {
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
            
            const weeklyValues: WeeklyAggregation[] = Object.values(weeklyData);
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

      const result: any[] = Object.values(dateGroups).sort((a: any, b: any) => {
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
      
      return Object.values(dayOfWeekGroups) as any[];
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

  const getWeeklyData = (selectedCampaign: string, selectedAdvertisers: string[], selectedAgencies: string[], periodLength: ComparisonPeriod): WeeklyData[] => {
    console.log(`getWeeklyData called with campaign=${selectedCampaign}, advertisers=${selectedAdvertisers.join(',')}, agencies=${selectedAgencies.join(',')}, period=${periodLength}`);
    
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
      
      if (selectedAgencies.length > 0) {
        filteredData = filteredData.filter((row: any) => {
          if (!row["CAMPAIGN ORDER NAME"]) return false;
          
          const campaignName = row["CAMPAIGN ORDER NAME"];
          const prefix = extractAgencyPrefix(campaignName);
          const agency = getAgencyFromPrefix(prefix);
          
          return agency && selectedAgencies.includes(agency);
        });
      }
      
      const weeklyData: WeeklyData[] = [];
      
      filteredData.forEach((row: any) => {
        if (!row || !row.DATE) return;
        
        const normalizedDate = normalizeDate(row.DATE);
        if (!normalizedDate) {
          console.warn(`Invalid date in row: ${row.DATE}`);
          return;
        }
        
        const date = new Date(normalizedDate);
        if (isNaN(date.getTime())) return;
        
        const dayOfWeek = date.getDay();
        
        const weekNumber = Math.floor((date.getTime() - setToStartOfDay(date).getTime()) / (1000 * 60 * 60 * 24 * 7));
        
        const weekStart = setToStartOfDay(date);
        const weekEnd = setToEndOfDay(weekStart);
        
        const weekData: WeeklyData = {
          periodStart: weekStart.toISOString(),
          periodEnd: weekEnd.toISOString(),
          IMPRESSIONS: 0,
          CLICKS: 0,
          REVENUE: 0,
          ROAS: 0,
          count: 1
        };
        
        weekData.IMPRESSIONS += Number(row.IMPRESSIONS) || 0;
        weekData.CLICKS += Number(row.CLICKS) || 0;
        weekData.REVENUE += Number(row.REVENUE) || 0;
        
        weekData.ROAS = calculateROAS(weekData.REVENUE, weekData.IMPRESSIONS);
        
        weeklyData.push(weekData);
      });
      
      return weeklyData;
    } catch (error) {
      console.error("Error in getWeeklyData:", error);
      return [];
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 animate-fade-in">
      {/* Metrics Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Performance Metrics</h2>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-muted-foreground">Filter by:</span>
            
            <div className="flex items-center space-x-2">
              <MultiSelect
                options={agencyOptions}
                selected={selectedMetricsAgencies}
                onChange={handleMetricsAgenciesChange}
                placeholder="Filter by Agency"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <MultiSelect
                options={filteredAdvertiserOptions}
                selected={selectedMetricsAdvertisers}
                onChange={handleMetricsAdvertisersChange}
                placeholder="Filter by Advertiser"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <MultiSelect
                options={filteredMetricsCampaignOptions}
                selected={selectedMetricsCampaigns}
                onChange={onMetricsCampaignsChange || (() => {})}
                placeholder="Filter by Campaign"
              />
            </div>
            
            <ToggleGroup type="single" value={metricsViewMode} onValueChange={(value: string) => setMetricsViewMode(value as ChartViewMode)}>
              <ToggleGroupItem value="date" aria-label="By Date">
                <Calendar className="h-4 w-4 mr-1" />
                Date
              </ToggleGroupItem>
              <ToggleGroupItem value="dayOfWeek" aria-label="By Day of Week">
                <Filter className="h-4 w-4 mr-1" />
                Day
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        
        {metricsData && metricsData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-4">Impressions</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={metricsViewMode === "date" ? 
                      getAggregatedData(metricsData) : 
                      getAggregatedDataByDayOfWeek(metricsData)
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey={metricsViewMode === "date" ? "DATE" : "DAY_OF_WEEK"} 
                      tick={{fontSize: 12}}
                      tickFormatter={(value) => metricsViewMode === "date" ? 
                        new Date(value).toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) : 
                        value
                      }
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [value.toLocaleString(), "Impressions"]}
                      labelFormatter={(label) => metricsViewMode === "date" ? 
                        new Date(label).toLocaleDateString('en-US', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'}) : 
                        label
                      }
                    />
                    <Line 
                      type="monotone" 
                      dataKey="IMPRESSIONS" 
                      stroke="#4ade80" 
                      activeDot={{ r: 6 }}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-4">Clicks</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={metricsViewMode === "date" ? 
                      getAggregatedData(metricsData) : 
                      getAggregatedDataByDayOfWeek(metricsData)
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey={metricsViewMode === "date" ? "DATE" : "DAY_OF_WEEK"} 
                      tick={{fontSize: 12}}
                      tickFormatter={(value) => metricsViewMode === "date" ? 
                        new Date(value).toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) : 
                        value
                      }
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [value.toLocaleString(), "Clicks"]}
                      labelFormatter={(label) => metricsViewMode === "date" ? 
                        new Date(label).toLocaleDateString('en-US', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'}) : 
                        label
                      }
                    />
                    <Line 
                      type="monotone" 
                      dataKey="CLICKS" 
                      stroke="#f59e0b" 
                      activeDot={{ r: 6 }}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-4">CTR</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={
                      (metricsViewMode === "date" ? 
                        getAggregatedData(metricsData) : 
                        getAggregatedDataByDayOfWeek(metricsData)
                      ).map(item => ({
                        ...item,
                        CTR: calculateCTR(item.CLICKS, item.IMPRESSIONS)
                      }))
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey={metricsViewMode === "date" ? "DATE" : "DAY_OF_WEEK"} 
                      tick={{fontSize: 12}}
                      tickFormatter={(value) => metricsViewMode === "date" ? 
                        new Date(value).toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) : 
                        value
                      }
                    />
                    <YAxis tickFormatter={(value) => `${value.toFixed(2)}%`} />
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(3)}%`, "CTR"]}
                      labelFormatter={(label) => metricsViewMode === "date" ? 
                        new Date(label).toLocaleDateString('en-US', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'}) : 
                        label
                      }
                    />
                    <Line 
                      type="monotone" 
                      dataKey="CTR" 
                      stroke="#0ea5e9" 
                      activeDot={{ r: 6 }}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        ) : (
          <Card className="p-4">
            <p className="text-center text-muted-foreground">No metrics data available for the selected filters.</p>
          </Card>
        )}
      </div>

      {/* Revenue Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Revenue Performance</h2>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-muted-foreground">Filter by:</span>
            
            <div className="flex items-center space-x-2">
              <MultiSelect
                options={agencyOptions}
                selected={selectedRevenueAgencies}
                onChange={handleRevenueAgenciesChange}
                placeholder="Filter by Agency"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <MultiSelect
                options={filteredAdvertiserOptions}
                selected={selectedRevenueAdvertisers}
                onChange={handleRevenueAdvertisersChange}
                placeholder="Filter by Advertiser"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <MultiSelect
                options={filteredRevenueCampaignOptions}
                selected={selectedRevenueCampaigns}
                onChange={onRevenueCampaignsChange || (() => {})}
                placeholder="Filter by Campaign"
              />
            </div>
            
            <ToggleGroup type="single" value={revenueViewMode} onValueChange={(value: string) => setRevenueViewMode(value as ChartViewMode)}>
              <ToggleGroupItem value="date" aria-label="By Date">
                <Calendar className="h-4 w-4 mr-1" />
                Date
              </ToggleGroupItem>
              <ToggleGroupItem value="dayOfWeek" aria-label="By Day of Week">
                <Filter className="h-4 w-4 mr-1" />
                Day
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        
        {revenueData && revenueData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-4">Revenue</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={revenueViewMode === "date" ? 
                      getAggregatedData(revenueData) : 
                      getAggregatedDataByDayOfWeek(revenueData)
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey={revenueViewMode === "date" ? "DATE" : "DAY_OF_WEEK"} 
                      tick={{fontSize: 12}}
                      tickFormatter={(value) => revenueViewMode === "date" ? 
                        new Date(value).toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) : 
                        value
                      }
                    />
                    <YAxis tickFormatter={(value) => `$${Math.round(value).toLocaleString()}`} />
                    <Tooltip 
                      formatter={(value: number) => [`$${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`, "Revenue"]}
                      labelFormatter={(label) => revenueViewMode === "date" ? 
                        new Date(label).toLocaleDateString('en-US', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'}) : 
                        label
                      }
                    />
                    <Line 
                      type="monotone" 
                      dataKey="REVENUE" 
                      stroke="#ef4444" 
                      activeDot={{ r: 6 }}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-4">ROAS (Return on Ad Spend)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={
                      (revenueViewMode === "date" ? 
                        getAggregatedData(revenueData) : 
                        getAggregatedDataByDayOfWeek(revenueData)
                      ).map(item => ({
                        ...item,
                        ROAS: calculateROAS(item.REVENUE, item.IMPRESSIONS)
                      }))
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey={revenueViewMode === "date" ? "DATE" : "DAY_OF_WEEK"} 
                      tick={{fontSize: 12}}
                      tickFormatter={(value) => revenueViewMode === "date" ? 
                        new Date(value).toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) : 
                        value
                      }
                    />
                    <YAxis tickFormatter={(value) => value.toFixed(2)} />
                    <Tooltip 
                      formatter={(value: number) => [value.toFixed(2), "ROAS"]}
                      labelFormatter={(label) => revenueViewMode === "date" ? 
                        new Date(label).toLocaleDateString('en-US', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'}) : 
                        label
                      }
                    />
                    <Line 
                      type="monotone" 
                      dataKey="ROAS" 
                      stroke="#d946ef" 
                      activeDot={{ r: 6 }}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        ) : (
          <Card className="p-4">
            <p className="text-center text-muted-foreground">No revenue data available for the selected filters.</p>
          </Card>
        )}
      </div>

      {/* Anomalies Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            <div className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
              Anomaly Detection 
            </div>
          </h2>
          
          <div className="flex items-center space-x-4">
            <Select value={anomalyPeriod} onValueChange={(value) => setAnomalyPeriod(value as AnomalyPeriod)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Anomaly Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily Anomalies</SelectItem>
                <SelectItem value="weekly">Weekly Anomalies</SelectItem>
              </SelectContent>
            </Select>
            
            <Toggle 
              pressed={showAnomalySection} 
              onPressedChange={setShowAnomalySection}
              aria-label="Toggle anomalies"
            >
              {showAnomalySection ? "Hide Details" : "Show Details"}
            </Toggle>
          </div>
        </div>
        
        {showAnomalySection && (
          <ScrollArea className="h-[400px]">
            <AnomalyDetails anomalies={anomalies} />
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
