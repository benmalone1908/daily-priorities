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
import { useCampaignFilter, AGENCY_MAPPING } from "@/contexts/CampaignFilterContext";

interface DashboardProps {
  data: any[];
  metricsData?: any[];
  revenueData?: any[];
  selectedMetricsCampaigns?: string[];
  selectedRevenueCampaigns?: string[];
  selectedRevenueAdvertisers?: string[];
  selectedRevenueAgencies?: string[];
  onMetricsCampaignsChange?: (selected: string[]) => void;
  onRevenueCampaignsChange?: (selected: string[]) => void;
  onRevenueAdvertisersChange?: (selected: string[]) => void;
  onRevenueAgenciesChange?: (selected: string[]) => void;
  sortedCampaignOptions?: string[];
  sortedAdvertiserOptions?: string[];
  sortedAgencyOptions?: string[];
  formattedCampaignOptions?: Option[]; // Add this property
  formattedAdvertiserOptions?: Option[]; // Add this property
  formattedAgencyOptions?: Option[]; // Add this property
  aggregatedMetricsData?: any[];
  agencyToAdvertisersMap?: Record<string, Set<string>>;
  agencyToCampaignsMap?: Record<string, Set<string>>;
  advertiserToCampaignsMap?: Record<string, Set<string>>;
  selectedWeeklyCampaigns?: string[]; // Updated to array for multiple selections
  onWeeklyCampaignsChange?: (selected: string[]) => void; // Updated handler for array of selections
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
  selectedRevenueAgencies = [],
  onMetricsCampaignsChange,
  onRevenueCampaignsChange,
  onRevenueAdvertisersChange,
  onRevenueAgenciesChange,
  sortedCampaignOptions = [],
  sortedAdvertiserOptions = [],
  sortedAgencyOptions = [],
  formattedCampaignOptions = [], // Add default value
  formattedAdvertiserOptions = [], // Add default value
  formattedAgencyOptions = [], // Add default value
  aggregatedMetricsData,
  agencyToAdvertisersMap = {},
  agencyToCampaignsMap = {},
  advertiserToCampaignsMap = {},
  selectedWeeklyCampaigns = [], // Changed from selectedWeeklyCampaign to array with default empty array
  onWeeklyCampaignsChange // Changed to match array handler type
}: DashboardProps) => {
  // Removed selectedWeeklyCampaign state as it's now provided via props
  const [selectedWeeklyAdvertisers, setSelectedWeeklyAdvertisers] = useState<string[]>([]);
  const [selectedWeeklyAgencies, setSelectedWeeklyAgencies] = useState<string[]>([]);
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

  const agencies = useMemo(() => {
    if (sortedAgencyOptions && sortedAgencyOptions.length > 0) return sortedAgencyOptions;
    return [];
  }, [sortedAgencyOptions]);

  const { extractAgencyInfo, extractAdvertiserName } = useCampaignFilter();
  
  // Create filtered advertiser options for the Attribution Revenue chart
  const filteredRevenueAdvertiserOptions = useMemo(() => {
    if (!selectedRevenueAgencies.length) {
      return advertisers.map(advertiser => ({
        value: advertiser,
        label: advertiser
      }));
    }
    
    const validAdvertisers = new Set<string>();
    
    selectedRevenueAgencies.forEach(agency => {
      const advertisersForAgency = agencyToAdvertisersMap[agency];
      if (advertisersForAgency) {
        advertisersForAgency.forEach(advertiser => {
          validAdvertisers.add(advertiser);
        });
      }
    });
    
    console.log(`Filtered advertisers for agencies ${selectedRevenueAgencies.join(', ')}:`, Array.from(validAdvertisers));
    
    return Array.from(validAdvertisers)
      .sort((a, b) => a.localeCompare(b))
      .map(advertiser => ({
        value: advertiser,
        label: advertiser
      }));
  }, [selectedRevenueAgencies, advertisers, agencyToAdvertisersMap]);

  // Create filtered campaign options for the Attribution Revenue chart
  const filteredRevenueCampaignOptions = useMemo(() => {
    let validCampaigns = campaigns;
    
    if (selectedRevenueAgencies.length > 0) {
      validCampaigns = validCampaigns.filter(option => {
        const campaignName = option;
        const { agency } = extractAgencyInfo(campaignName);
        return selectedRevenueAgencies.includes(agency) && agency !== "";
      });
    }
    
    if (selectedRevenueAdvertisers.length > 0) {
      validCampaigns = validCampaigns.filter(option => {
        const campaignName = option;
        const advertiser = extractAdvertiserName(campaignName);
        return selectedRevenueAdvertisers.includes(advertiser) && advertiser !== "";
      });
    }
    
    console.log(`Filtered revenue campaign options: ${validCampaigns.length} campaigns`);
    
    // Map strings to Option objects before returning
    return validCampaigns.map(campaign => ({
      value: campaign,
      label: campaign
    }));
  }, [campaigns, selectedRevenueAgencies, selectedRevenueAdvertisers, extractAgencyInfo, extractAdvertiserName]);

  const filteredWeeklyAdvertiserOptions = useMemo(() => {
    if (!selectedWeeklyAgencies.length) {
      return advertisers.map(advertiser => ({
        value: advertiser,
        label: advertiser
      }));
    }
    
    const validAdvertisers = new Set<string>();
    
    selectedWeeklyAgencies.forEach(agency => {
      const advertisersForAgency = agencyToAdvertisersMap[agency];
      if (advertisersForAgency) {
        advertisersForAgency.forEach(advertiser => {
          validAdvertisers.add(advertiser);
        });
      }
    });
    
    console.log(`Filtered advertisers for agencies ${selectedWeeklyAgencies.join(', ')}:`, Array.from(validAdvertisers));
    
    return Array.from(validAdvertisers)
      .sort((a, b) => a.localeCompare(b))
      .map(advertiser => ({
        value: advertiser,
        label: advertiser
      }));
  }, [selectedWeeklyAgencies, advertisers, agencyToAdvertisersMap]);

  const campaignOptions: Option[] = useMemo(() => {
    // If formattedCampaignOptions is provided, use it
    if (formattedCampaignOptions && formattedCampaignOptions.length > 0) {
      return formattedCampaignOptions;
    }
    // Otherwise, create them from the campaigns array
    return campaigns.map(campaign => ({
      value: campaign,
      label: campaign
    }));
  }, [campaigns, formattedCampaignOptions]);

  const advertiserOptions: Option[] = useMemo(() => {
    // If formattedAdvertiserOptions is provided, use it
    if (formattedAdvertiserOptions && formattedAdvertiserOptions.length > 0) {
      return formattedAdvertiserOptions;
    }
    // Otherwise, create them from the advertisers array
    return advertisers.map(advertiser => ({
      value: advertiser,
      label: advertiser
    }));
  }, [advertisers, formattedAdvertiserOptions]);

  const agencyOptions: Option[] = useMemo(() => {
    // If formattedAgencyOptions is provided, use it
    if (formattedAgencyOptions && formattedAgencyOptions.length > 0) {
      return formattedAgencyOptions;
    }
    // Otherwise, create them from the agencies array
    return agencies.map(agency => ({
      value: agency,
      label: agency
    }));
  }, [agencies, formattedAgencyOptions]);

  const handleWeeklyAdvertisersChange = (selected: string[]) => {
    if (selectedWeeklyAgencies.length > 0) {
      const validAdvertisers = new Set<string>();
      
      selectedWeeklyAgencies.forEach(agency => {
        const advertisersForAgency = agencyToAdvertisersMap[agency];
        if (advertisersForAgency) {
          advertisersForAgency.forEach(advertiser => {
            validAdvertisers.add(advertiser);
          });
        }
      });
      
      const filteredSelected = selected.filter(advertiser => validAdvertisers.has(advertiser));
      
      setSelectedWeeklyAdvertisers(filteredSelected);
      
      // Reset campaign selection when advertisers change
      if (onWeeklyCampaignsChange) {
        onWeeklyCampaignsChange([]);
      }
    } else {
      setSelectedWeeklyAdvertisers(selected);
      
      // Reset campaign selection when advertisers change
      if (onWeeklyCampaignsChange) {
        onWeeklyCampaignsChange([]);
      }
    }
  };

  const handleWeeklyAgenciesChange = (selected: string[]) => {
    setSelectedWeeklyAgencies(selected);
    
    if (selected.length > 0 && selectedWeeklyAdvertisers.length > 0) {
      const validAdvertisers = new Set<string>();
      
      selected.forEach(agency => {
        const advertisersForAgency = agencyToAdvertisersMap[agency];
        if (advertisersForAgency) {
          advertisersForAgency.forEach(advertiser => {
            validAdvertisers.add(advertiser);
          });
        }
      });
      
      const filteredAdvertisers = selectedWeeklyAdvertisers.filter(advertiser => 
        validAdvertisers.has(advertiser)
      );
      
      setSelectedWeeklyAdvertisers(filteredAdvertisers);
      
      // Reset campaign selection when agencies change
      if (onWeeklyCampaignsChange) {
        onWeeklyCampaignsChange([]);
      }
    }
  };

  const getWeeklyData = (selectedCampaigns: string[], selectedAdvertisers: string[], selectedAgencies: string[], periodLength: ComparisonPeriod): WeeklyData[] => {
    console.log(`getWeeklyData called with campaigns=${selectedCampaigns.join(',')}, advertisers=${selectedAdvertisers.join(',')}, agencies=${selectedAgencies.join(',')}, period=${periodLength}`);
    
    if (!data || data.length === 0) {
      console.log("No data available for weekly comparison");
      return [];
    }

    try {
      let filteredData = JSON.parse(JSON.stringify(data));
      console.log(`Starting with ${filteredData.length} rows of data`);
      
      // For debugging purposes, look at a few sample campaign names
      const sampleCampaigns = filteredData.slice(0, 5).map((row: any) => row["CAMPAIGN ORDER NAME"]);
      console.log("Sample campaign names:", sampleCampaigns);
      
      if (selectedAgencies.length > 0) {
        console.log(`Filtering by agencies: ${selectedAgencies.join(", ")}`);
        
        filteredData = filteredData.filter((row: any) => {
          if (!row["CAMPAIGN ORDER NAME"]) return false;
          
          const campaignName = row["CAMPAIGN ORDER NAME"];
          const { agency } = extractAgencyInfo(campaignName);
          
          const isIncluded = selectedAgencies.includes(agency) && agency !== "";
          
          // Debug log for a few rows to see what's happening
          if (sampleCampaigns.includes(campaignName)) {
            console.log(`Campaign: "${campaignName}" -> Agency: "${agency}", Included: ${isIncluded}`);
          }
          
          return isIncluded;
        });
        
        console.log(`After agency filter: ${filteredData.length} rows`);
        
        // Additional debugging - check what agencies are actually in the data
        const uniqueAgencies = new Set<string>();
        filteredData.slice(0, 100).forEach((row: any) => {
          if (row["CAMPAIGN ORDER NAME"]) {
            const { agency } = extractAgencyInfo(row["CAMPAIGN ORDER NAME"]);
            if (agency) uniqueAgencies.add(agency);
          }
        });
        console.log("Agencies found in filtered data:", Array.from(uniqueAgencies));
      }
      
      if (selectedAdvertisers.length > 0) {
        console.log(`Filtering by advertisers: ${selectedAdvertisers.join(", ")}`);
        
        filteredData = filteredData.filter((row: any) => {
          if (!row["CAMPAIGN ORDER NAME"]) return false;
          
          const campaignName = row["CAMPAIGN ORDER NAME"];
          const advertiser = extractAdvertiserName(campaignName);
          
          const isIncluded = selectedAdvertisers.includes(advertiser) && advertiser !== "";
          
          // Debug log for a few rows to see what's happening
          if (sampleCampaigns.includes(campaignName)) {
            console.log(`Campaign: "${campaignName}" -> Advertiser: "${advertiser}", Included: ${isIncluded}`);
          }
          
          return isIncluded;
        });
        
        console.log(`After advertiser filter: ${filteredData.length} rows`);
      }
      
      // Updated to filter by an array of campaign names
      if (selectedCampaigns.length > 0) {
        filteredData = filteredData.filter((row: any) => 
          selectedCampaigns.includes(row["CAMPAIGN ORDER NAME"])
        );
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
      
      if (totalDays >= 28) {
        periods.push("14");
      }
      
      if (totalDays >= 60) {
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
    // Updated function call to pass selectedWeeklyCampaigns array
    const calculatedData = getWeeklyData(selectedWeeklyCampaigns, selectedWeeklyAdvertisers, selectedWeeklyAgencies, comparisonPeriod);
    console.log(`Weekly data calculation complete. Found ${calculatedData.length} periods.`);
    setWeeklyDataState(calculatedData);
  }, [data, selectedWeeklyCampaigns, selectedWeeklyAdvertisers, selectedWeeklyAgencies, comparisonPeriod]);

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
              
              {onMetricsCampaignsChange && campaignOptions.length > 0 && (
                <MultiSelect
                  options={campaignOptions}
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
              {onRevenueAgenciesChange && agencyOptions.length > 0 && (
                <MultiSelect
                  options={agencyOptions}
                  selected={selectedRevenueAgencies}
                  onChange={onRevenueAgenciesChange}
                  placeholder="Agency"
                  className="w-[200px]"
                />
              )}
              
              {onRevenueAdvertisersChange && filteredRevenueAdvertiserOptions.length > 0 && (
                <MultiSelect
                  options={filteredRevenueAdvertiserOptions}
                  selected={selectedRevenueAdvertisers}
                  onChange={onRevenueAdvertisersChange}
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
                  options={agencyOptions}
                  selected={selectedWeeklyAgencies}
                  onChange={handleWeeklyAgenciesChange}
                  placeholder="Agency"
                  className="w-[200px]"
                />
                
                <MultiSelect
                  options={filteredWeeklyAdvertiserOptions}
                  selected={selectedWeeklyAdvertisers}
                  onChange={handleWeeklyAdvertisersChange}
                  placeholder="Advertiser"
                  className="w-[200px]"
                />
                
                <MultiSelect
                  options={filteredRevenueCampaignOptions}
                  selected={selectedWeeklyCampaigns}
                  onChange={onWeeklyCampaignsChange}
                  placeholder="Campaign"
                  className="w-[200px]"
                  popoverClassName="w-[400px]"
                />
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
                
                const ctr = calculateCTR(period.CLICKS, period.IMPRESSIONS);
                const previousCtr = previousPeriod ? calculateCTR(previousPeriod.CLICKS, previousPeriod.IMPRESSIONS) : 0;
                
                const transactions = period.TRANSACTIONS || Math.round(period.REVENUE / 50);
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
            <p className="text-muted-foreground">No period data available for the selected filters</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
