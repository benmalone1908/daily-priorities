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
import CombinedMetricsChart from "./CombinedMetricsChart";

interface DashboardProps {
  data: any[];
  metricsData?: any[];
  revenueData?: any[];
  selectedMetricsCampaigns?: string[];
  selectedRevenueCampaigns?: string[];
  selectedRevenueAdvertisers?: string[];
  selectedRevenueAgencies?: string[];
  // Add these missing props to match what we're passing from DashboardProxy
  selectedMetricsAdvertisers?: string[];
  selectedMetricsAgencies?: string[];
  onMetricsCampaignsChange?: (selected: string[]) => void;
  onRevenueCampaignsChange?: (selected: string[]) => void;
  onRevenueAdvertisersChange?: (selected: string[]) => void;
  onRevenueAgenciesChange?: (selected: string[]) => void;
  // Add these missing handler props
  onMetricsAdvertisersChange?: (selected: string[]) => void;
  onMetricsAgenciesChange?: (selected: string[]) => void;
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
  // Add the useGlobalFilters prop to fix the TypeScript error
  useGlobalFilters?: boolean;
  // Add hideCharts prop to fix the TypeScript error
  hideCharts?: string[];
  // Add chartToggleComponent prop to fix the TypeScript error
  chartToggleComponent?: React.ReactNode;
  // Add activeTab prop to fix the current TypeScript error
  activeTab?: string;
  // Add onChartTabChange prop
  onChartTabChange?: (tab: string) => void;
  // Add viewByDate prop to fix the current TypeScript error
  viewByDate?: boolean;
  // Add hideChartTitle prop to fix the TypeScript error
  hideChartTitle?: boolean;
  // Add contractTermsData prop to fix the TypeScript error
  contractTermsData?: any[];
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

// Add utility functions for calculations
const calculateROAS = (revenue: number, impressions: number): number => {
  if (impressions === 0) return 0;
  return (revenue / impressions) * 1000;
};

const calculateCTR = (clicks: number, impressions: number): number => {
  if (impressions === 0) return 0;
  return (clicks / impressions) * 100;
};

const calculateAOV = (revenue: number, transactions: number): number => {
  if (transactions === 0) return 0;
  return revenue / transactions;
};

// Format utility functions
const formatCTR = (value: number): string => {
  try {
    return `${value.toFixed(2)}%`;
  } catch (error) {
    console.error("Error formatting CTR:", error);
    return "0.00%";
  }
};

const formatTransactions = (value: number): string => {
  try {
    return value.toLocaleString();
  } catch (error) {
    console.error("Error formatting transactions:", error);
    return "0";
  }
};

const formatAOV = (value: number): string => {
  try {
    return `$${value.toFixed(2)}`;
  } catch (error) {
    console.error("Error formatting AOV:", error);
    return "$0.00";
  }
};

// Data aggregation functions
const getAggregatedData = (data: any[]): any[] => {
  if (!data || !data.length) return [];
  
  try {
    const dateMap = new Map();
    
    data.forEach(row => {
      if (!row.DATE) return;
      
      const dateStr = normalizeDate(row.DATE);
      if (!dateStr) return;
      
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, {
          DATE: dateStr,
          IMPRESSIONS: 0,
          CLICKS: 0,
          REVENUE: 0,
          TRANSACTIONS: 0,
          count: 0
        });
      }
      
      const entry = dateMap.get(dateStr);
      entry.IMPRESSIONS += Number(row.IMPRESSIONS) || 0;
      entry.CLICKS += Number(row.CLICKS) || 0;
      entry.REVENUE += Number(row.REVENUE) || 0;
      entry.TRANSACTIONS += Number(row.TRANSACTIONS) || 0;
      entry.count += 1;
    });
    
    // Sort by date ascending
    return Array.from(dateMap.values())
      .sort((a, b) => new Date(a.DATE).getTime() - new Date(b.DATE).getTime());
  } catch (error) {
    console.error("Error in getAggregatedData:", error);
    return [];
  }
};

const getAggregatedDataByDayOfWeek = (data: any[]): any[] => {
  if (!data || !data.length) return [];
  
  try {
    const dayMap = new Map();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    
    // Initialize all days of week
    dayNames.forEach((day, index) => {
      dayMap.set(index, {
        DAY_OF_WEEK: day,
        IMPRESSIONS: 0,
        CLICKS: 0,
        REVENUE: 0,
        TRANSACTIONS: 0,
        count: 0
      });
    });
    
    data.forEach(row => {
      if (!row.DATE) return;
      
      const dateStr = normalizeDate(row.DATE);
      if (!dateStr) return;
      
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      
      const entry = dayMap.get(dayOfWeek);
      entry.IMPRESSIONS += Number(row.IMPRESSIONS) || 0;
      entry.CLICKS += Number(row.CLICKS) || 0;
      entry.REVENUE += Number(row.REVENUE) || 0;
      entry.TRANSACTIONS += Number(row.TRANSACTIONS) || 0;
      entry.count += 1;
    });
    
    // Convert to array and sort by day of week
    return Array.from(dayMap.values());
  } catch (error) {
    console.error("Error in getAggregatedDataByDayOfWeek:", error);
    return [];
  }
};

const Dashboard = ({ 
  data,
  metricsData,
  revenueData,
  selectedMetricsCampaigns = [],
  selectedRevenueCampaigns = [],
  selectedRevenueAdvertisers = [],
  selectedRevenueAgencies = [],
  // Update the props destructuring to include the new props
  selectedMetricsAdvertisers = [],
  selectedMetricsAgencies = [],
  onMetricsCampaignsChange,
  onRevenueCampaignsChange,
  onRevenueAdvertisersChange,
  onRevenueAgenciesChange,
  // Add the new handler props
  onMetricsAdvertisersChange,
  onMetricsAgenciesChange,
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
  onWeeklyCampaignsChange, // Changed to match array handler type
  // Add useGlobalFilters to the destructured props with a default value of false
  useGlobalFilters = false,
  hideCharts = [],
  // Add chartToggleComponent to the destructured props
  chartToggleComponent,
  // Add activeTab to the destructured props with a default value
  activeTab = "display",
  // Add onChartTabChange to the destructured props
  onChartTabChange,
  // Add viewByDate to the destructured props with a default value
  viewByDate = true,
  // Add hideChartTitle prop to fix the TypeScript error
  hideChartTitle = false,
  // Add contractTermsData prop to fix the TypeScript error
  contractTermsData
}: DashboardProps) => {
  // Removed selectedWeeklyCampaign state as it's now provided via props
  const [selectedWeeklyAdvertisers, setSelectedWeeklyAdvertisers] = useState<string[]>([]);
  const [selectedWeeklyAgencies, setSelectedWeeklyAgencies] = useState<string[]>([]);
  // Initialize local state with props values to keep local and parent state in sync
  const [localSelectedMetricsAdvertisers, setLocalSelectedMetricsAdvertisers] = useState<string[]>(selectedMetricsAdvertisers);
  const [localSelectedMetricsAgencies, setLocalSelectedMetricsAgencies] = useState<string[]>(selectedMetricsAgencies);
  const [anomalyPeriod, setAnomalyPeriod] = useState<AnomalyPeriod>("daily");
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>("7");
  const [weeklyDataState, setWeeklyDataState] = useState<WeeklyData[]>([]);
  const [showAnomalySection, setShowAnomalySection] = useState<boolean>(false);
  
  // Set up metrics and revenue view modes based on parent viewByDate
  const [metricsViewMode, setMetricsViewMode] = useState<ChartViewMode>(viewByDate ? "date" : "dayOfWeek");
  const [revenueViewMode, setRevenueViewMode] = useState<ChartViewMode>(viewByDate ? "date" : "dayOfWeek");
  
  // Add anomalies mock data or empty state
  const [anomalies, setAnomalies] = useState<any>({
    IMPRESSIONS: { anomalies: [] },
    CLICKS: { anomalies: [] },
    REVENUE: { anomalies: [] }
  });
  
  const renderCountRef = useRef(0);
  
  // Add effect to sync local view modes with parent viewByDate prop
  useEffect(() => {
    const newViewMode = viewByDate ? "date" : "dayOfWeek";
    setMetricsViewMode(newViewMode);
    setRevenueViewMode(newViewMode);
    console.log(`Dashboard: viewByDate prop changed to ${viewByDate}, setting view modes to ${newViewMode}`);
  }, [viewByDate]);
  
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

  const filteredWeeklyCampaignOptions = useMemo(() => {
    let validCampaigns = campaigns;
    
    if (selectedWeeklyAgencies.length > 0) {
      validCampaigns = validCampaigns.filter(option => {
        const campaignName = option;
        const { agency } = extractAgencyInfo(campaignName);
        return selectedWeeklyAgencies.includes(agency) && agency !== "";
      });
    }
    
    if (selectedWeeklyAdvertisers.length > 0) {
      validCampaigns = validCampaigns.filter(option => {
        const campaignName = option;
        const advertiser = extractAdvertiserName(campaignName);
        return selectedWeeklyAdvertisers.includes(advertiser) && advertiser !== "";
      });
    }
    
    console.log(`Filtered weekly campaign options: ${validCampaigns.length} campaigns`);
    
    // Map strings to Option objects before returning
    return validCampaigns.map(campaign => ({
      value: campaign,
      label: campaign
    }));
  }, [campaigns, selectedWeeklyAgencies, selectedWeeklyAdvertisers, extractAgencyInfo, extractAdvertiserName]);

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

  // Create filtered advertiser options for the metrics chart
  const filteredMetricsAdvertiserOptions = useMemo(() => {
    if (!selectedMetricsAgencies.length) {
      return advertisers.map(advertiser => ({
        value: advertiser,
        label: advertiser
      }));
    }
    
    const validAdvertisers = new Set<string>();
    
    selectedMetricsAgencies.forEach(agency => {
      const advertisersForAgency = agencyToAdvertisersMap[agency];
      if (advertisersForAgency) {
        advertisersForAgency.forEach(advertiser => {
          validAdvertisers.add(advertiser);
        });
      }
    });
    
    return Array.from(validAdvertisers)
      .sort((a, b) => a.localeCompare(b))
      .map(advertiser => ({
        value: advertiser,
        label: advertiser
      }));
  }, [selectedMetricsAgencies, advertisers, agencyToAdvertisersMap]);

  // Create filtered campaign options for the Metrics chart
  const filteredMetricsCampaignOptions = useMemo(() => {
    let validCampaigns = campaigns;
    
    if (selectedMetricsAgencies.length > 0) {
      validCampaigns = validCampaigns.filter(option => {
        const campaignName = option;
        const { agency } = extractAgencyInfo(campaignName);
        return selectedMetricsAgencies.includes(agency) && agency !== "";
      });
    }
    
    if (selectedMetricsAdvertisers.length > 0) {
      validCampaigns = validCampaigns.filter(option => {
        const campaignName = option;
        const advertiser = extractAdvertiserName(campaignName);
        return selectedMetricsAdvertisers.includes(advertiser) && advertiser !== "";
      });
    }
    
    console.log(`Filtered metrics campaign options: ${validCampaigns.length} campaigns`);
    
    // Map strings to Option objects before returning
    return validCampaigns.map(campaign => ({
      value: campaign,
      label: campaign
    }));
  }, [campaigns, selectedMetricsAgencies, selectedMetricsAdvertisers, extractAgencyInfo, extractAdvertiserName]);

  // Add handler for agency changes in metrics
  const handleMetricsAgenciesChange = (selected: string[]) => {
    setLocalSelectedMetricsAgencies(selected);
    // Call parent handler if provided
    if (onMetricsAgenciesChange) {
      onMetricsAgenciesChange(selected);
    }
    
    // Reset advertiser and campaign selections when agencies change
    setLocalSelectedMetricsAdvertisers([]);
    if (onMetricsCampaignsChange) {
      onMetricsCampaignsChange([]);
    }
  };

  // Update metrics advertisers change handler to respect agency selection
  const handleMetricsAdvertisersChange = (selected: string[]) => {
    if (localSelectedMetricsAgencies.length > 0) {
      const validAdvertisers = new Set<string>();
      
      localSelectedMetricsAgencies.forEach(agency => {
        const advertisersForAgency = agencyToAdvertisersMap[agency];
        if (advertisersForAgency) {
          advertisersForAgency.forEach(advertiser => {
            validAdvertisers.add(advertiser);
          });
        }
      });
      
      const filteredSelected = selected.filter(advertiser => validAdvertisers.has(advertiser));
      setLocalSelectedMetricsAdvertisers(filteredSelected);
      
      // Call parent handler if provided
      if (onMetricsAdvertisersChange) {
        onMetricsAdvertisersChange(filteredSelected);
      }
    } else {
      setLocalSelectedMetricsAdvertisers(selected);
      
      // Call parent handler if provided
      if (onMetricsAdvertisersChange) {
        onMetricsAdvertisersChange(selected);
      }
    }
    
    // Reset campaign selection when advertisers change
    if (onMetricsCampaignsChange) {
      onMetricsCampaignsChange([]);
    }
  };

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

  // Add effect to sync internal state with activeTab prop
  useEffect(() => {
    if (activeTab === "attribution") {
      setMetricsViewMode(viewByDate ? "date" : "dayOfWeek");
      setRevenueViewMode(viewByDate ? "date" : "dayOfWeek");
    } else {
      setMetricsViewMode(viewByDate ? "date" : "dayOfWeek");
      setRevenueViewMode(viewByDate ? "date" : "dayOfWeek");
    }
  }, [activeTab, viewByDate]);

  // Update the metrics view mode handler to respect the parent viewByDate
  const handleMetricsViewModeChange = (value: ChartViewMode) => {
    if (!value) return;
    setMetricsViewMode(value);
    if (onChartTabChange && activeTab !== "display") {
      onChartTabChange("display");
    }
  };

  // Update the revenue view mode handler to respect the parent viewByDate
  const handleRevenueViewModeChange = (value: ChartViewMode) => {
    if (!value) return;
    setRevenueViewMode(value);
    if (onChartTabChange && activeTab !== "attribution") {
      onChartTabChange("attribution");
    }
  };

  // Prepare combined data for CombinedMetricsChart component
  const combinedChartData = useMemo(() => {
    // Use either metrics or revenue data based on active tab, respecting the current view modes
    return activeTab === "display" ? processedMetricsData : processedRevenueData;
  }, [activeTab, processedMetricsData, processedRevenueData]);

  // Handler for CombinedMetricsChart tab changes
  const handleCombinedChartTabChange = (tab: string) => {
    console.log(`Dashboard: Combined chart tab changed to ${tab}`);
    if (onChartTabChange) {
      onChartTabChange(tab);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Only show date range info when NOT using global filters */}
      {!useGlobalFilters && dateRange && (
        <div className="text-sm text-muted-foreground text-center">
          <span className="font-medium">{dateRangeText}</span> 
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

      {/* FIXED: Changed from AND (&&) to OR (||) logic for chart visibility */}
      {!(hideCharts.includes("metricsChart") && hideCharts.includes("revenueChart")) && (
        <CombinedMetricsChart 
          data={combinedChartData}
          title="Campaign Performance"
          chartToggleComponent={chartToggleComponent}
          onTabChange={handleCombinedChartTabChange}
          initialTab={activeTab}
        />
      )}

      {/* Filter controls that were previously in the chart cards */}
      {!useGlobalFilters && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-shrink-0">
              <span className="text-sm font-medium">Filter by:</span>
            </div>
            
            {activeTab === "display" ? (
              <div className="flex flex-wrap items-center gap-2">
                {agencyOptions.length > 0 && (
                  <MultiSelect
                    options={agencyOptions}
                    selected={selectedMetricsAgencies}
                    onChange={onMetricsAgenciesChange}
                    placeholder="Agency"
                    className="w-[200px]"
                  />
                )}
                
                {advertiserOptions.length > 0 && (
                  <MultiSelect
                    options={filteredMetricsAdvertiserOptions}
                    selected={selectedMetricsAdvertisers}
                    onChange={onMetricsAdvertisersChange}
                    placeholder="Advertiser"
                    className="w-[200px]"
                  />
                )}
                
                {onMetricsCampaignsChange && campaignOptions.length > 0 && (
                  <MultiSelect
                    options={filteredMetricsCampaignOptions}
                    selected={selectedMetricsCampaigns}
                    onChange={onMetricsCampaignsChange}
                    placeholder="Campaign"
                    className="w-[200px]"
                    popoverClassName="w-[400px]"
                  />
                )}
                
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-sm font-medium">View:</span>
                  <ToggleGroup 
                    type="single" 
                    value={metricsViewMode} 
                    onValueChange={handleMetricsViewModeChange}
                  >
                    <ToggleGroupItem value="date" aria-label="By Date" className="text-sm">
                      By Date
                    </ToggleGroupItem>
                    <ToggleGroupItem value="dayOfWeek" aria-label="By Day of Week" className="text-sm">
                      By Day of Week
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
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
                
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-sm font-medium">View:</span>
                  <ToggleGroup 
                    type="single" 
                    value={revenueViewMode} 
                    onValueChange={handleRevenueViewModeChange}
                  >
                    <ToggleGroupItem value="date" aria-label="By Date" className="text-sm">
                      By Date
                    </ToggleGroupItem>
                    <ToggleGroupItem value="dayOfWeek" aria-label="By Day of Week" className="text-sm">
                      By Day of Week
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Weekly comparison section */}
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
              {/* Only show filter UI when NOT using global filters */}
              {!useGlobalFilters && (
                <div className="flex items-center gap-2">
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
                      options={filteredWeeklyCampaignOptions}
                      selected={selectedWeeklyCampaigns}
                      onChange={onWeeklyCampaignsChange}
                      placeholder="Campaign"
                      className="w-[200px]"
                      popoverClassName="w-[400px]"
                    />
                  </div>
                </div>
              )}
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
