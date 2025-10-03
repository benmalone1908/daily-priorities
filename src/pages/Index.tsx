import { ContractTermsRow } from '@/types/dashboard';
import { CampaignDataRow, TimeSeriesDataPoint, ModalData, MetricType } from '@/types/campaign';
import { PacingDeliveryData } from '@/types/pacing';
import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { DateRange } from "react-day-picker";
import FileUpload from "@/components/FileUpload";
import DateRangePicker from "@/components/DateRangePicker";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CampaignSparkCharts from "@/components/CampaignSparkCharts";
import { LayoutDashboard, ChartLine, FileText, Target, Plus, Activity, FileDown, Clock, TrendingUp, Bell, Trash2 } from "lucide-react";
import DashboardWrapper from "@/components/DashboardWrapper";
import { setToStartOfDay, setToEndOfDay, logDateDetails, parseDateString, formatDateSortable } from "@/lib/utils";
import { CampaignFilterProvider } from "@/contexts/CampaignFilterContext";
import { useCampaignFilter } from "@/contexts/use-campaign-filter";
import { useSupabase } from "@/contexts/use-supabase";
import { getLastCampaignUpload, getLastContractUpload } from "@/lib/supabase";
import { CampaignStatusToggle } from "@/components/CampaignStatusToggle";
import { ChartToggle } from "@/components/ChartToggle";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { getColorClasses } from "@/utils/anomalyColors";
import { TrendingDown, Maximize } from "lucide-react";
import Papa from "papaparse";
import SparkChartModal from "@/components/SparkChartModal";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import GlobalFilters from "@/components/GlobalFilters";
import RawDataTableImproved from "@/components/RawDataTableImproved";
import PacingFileUpload from "@/components/PacingFileUpload";
import CampaignHealthTab from "@/components/CampaignHealthTab";
import { Pacing } from "@/components/Pacing";
import CustomReportBuilder from "@/components/CustomReportBuilder";
import StatusTab from "@/components/StatusTab";
import { ClearDatabaseDialog } from "@/components/ClearDatabaseDialog";
import { NotificationsTab } from "@/components/NotificationsTab";
import SidebarLayout from "@/components/SidebarLayout";
import UnifiedUploadModal from "@/components/UnifiedUploadModal";
import CampaignManager from "@/components/CampaignManager";

type MetricType = 
  | "impressions" 
  | "clicks" 
  | "ctr" 
  | "transactions" 
  | "revenue" 
  | "roas";

interface ModalData {
  isOpen: boolean;
  title: string;
  metricType: MetricType;
  data: CampaignDataRow[];
}

// Helper function to get complete date range from data
const getCompleteDateRange = (data: CampaignDataRow[]): Date[] => {
  const dates = data
    .map(row => row.DATE)
    .filter(date => date && date !== 'Totals')
    .map(dateStr => parseDateString(dateStr))
    .filter(Boolean) as Date[];
    
  if (dates.length === 0) return [];
  
  dates.sort((a, b) => a.getTime() - b.getTime());
  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];
  
  const result = [];
  const current = new Date(minDate);
  
  while (current <= maxDate) {
    result.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return result;
};

// Helper function to fill missing dates with zero values for aggregated data
const fillMissingDatesForAggregated = (timeSeriesData: TimeSeriesDataPoint[], allDates: Date[]): TimeSeriesDataPoint[] => {
  
  // If no data, return empty array
  if (timeSeriesData.length === 0 || allDates.length === 0) return timeSeriesData;
  
  // Create a map of existing data by date string - use the same format as aggregated data
  const dataByDate = new Map();
  timeSeriesData.forEach(item => {
    if (item.date) {
      dataByDate.set(item.date, item);
    }
  });
  
  
  // Find the actual range of dates that have data
  const datesWithData = timeSeriesData
    .map(item => parseDateString(item.date))
    .filter(Boolean)
    .sort((a, b) => a!.getTime() - b!.getTime());
    
  if (datesWithData.length === 0) return timeSeriesData;
  
  const firstDataDate = datesWithData[0]!;
  const lastDataDate = datesWithData[datesWithData.length - 1]!;
  
  // Generate complete time series only within the data range
  // Use consistent MM/DD/YY date format for proper sorting
  const result: TimeSeriesDataPoint[] = [];
  for (const date of allDates) {
    if (date >= firstDataDate && date <= lastDataDate) {
      // Format date as MM/DD/YY for consistent sorting
      const dateStr = formatDateSortable(date);

      const existingData = dataByDate.get(dateStr);
      
      if (existingData) {
        // Use existing data as-is
        result.push(existingData);
      } else {
        // Fill gap with zero values
        result.push({
          date: dateStr,
          IMPRESSIONS: 0,
          CLICKS: 0,
          REVENUE: 0,
          TRANSACTIONS: 0,
          SPEND: 0,
          CTR: 0,
          ROAS: 0
        });
      }
    }
  }
  
    
  return result;
};

// Improved Aggregated Spark Charts component that matches the campaign row style
const AggregatedSparkCharts = ({ data }: { data: CampaignDataRow[] }) => {
  const { showAggregatedSparkCharts, showDebugInfo } = useCampaignFilter();
  const [modalData, setModalData] = useState<ModalData>({
    isOpen: false,
    title: "",
    metricType: "impressions",
    data: []
  });

  console.log('AggregatedSparkCharts: Raw data received:', data.length, 'rows');
  console.log('AggregatedSparkCharts: Sample raw data:', data.slice(0, 3));

  // Get complete date range for filling gaps
  const completeDateRange = useMemo(() => getCompleteDateRange(data), [data]);

  // Group data by date for time series with optimization
  const timeSeriesData = useMemo(() => {
    if (showDebugInfo) {
      console.log('AggregatedSparkCharts: Starting time series aggregation...');
    }
    
    const dateGroups = new Map<string, unknown>();
    
    // Single pass aggregation
    for (let index = 0; index < data.length; index++) {
      const row = data[index];
      if (!row?.DATE || row.DATE === 'Totals') {
        if (showDebugInfo && index < 5) {
          console.log('AggregatedSparkCharts: Skipping row:', row);
        }
        continue;
      }
      
      const dateStr = String(row.DATE).trim();
      let dateGroup = dateGroups.get(dateStr);
      
      if (!dateGroup) {
        dateGroup = {
          date: dateStr,
          IMPRESSIONS: 0,
          CLICKS: 0,
          REVENUE: 0,
          TRANSACTIONS: 0,
          SPEND: 0
        };
        dateGroups.set(dateStr, dateGroup);
      }
      
      // Fast numeric conversion and accumulation
      dateGroup.IMPRESSIONS += +(row.IMPRESSIONS) || 0;
      dateGroup.CLICKS += +(row.CLICKS) || 0;
      dateGroup.REVENUE += +(row.REVENUE) || 0;
      dateGroup.TRANSACTIONS += +(row.TRANSACTIONS) || 0;
      dateGroup.SPEND += +(row.SPEND) || 0;
    }
    
    if (showDebugInfo) {
      console.log('AggregatedSparkCharts: Date groups created:', dateGroups.size);
    }
    
    // Convert Map to array and sort
    const rawData = Array.from(dateGroups.values()).sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });
    
    if (showDebugInfo) {
      console.log('AggregatedSparkCharts: Raw aggregated data:', rawData.length, 'entries');
    }
    
    // Fill missing dates with zero values for continuous trend lines
    const filledData = fillMissingDatesForAggregated(rawData, completeDateRange);
    
    if (showDebugInfo) {
      console.log('AggregatedSparkCharts: Final filled data:', filledData.length, 'entries');
    }
    
    return filledData;
  }, [data, completeDateRange, showDebugInfo]);
  
  // Calculate totals with optimization
  const totals = useMemo(() => {
    if (showDebugInfo) {
      console.log('AggregatedSparkCharts: Calculating totals from timeSeriesData:', timeSeriesData.length, 'entries');
    }
    
    let impressions = 0;
    let clicks = 0;
    let revenue = 0;
    let transactions = 0;
    let spend = 0;
    
    // Fast accumulation without forEach
    for (let i = 0; i < timeSeriesData.length; i++) {
      const day = timeSeriesData[i];
      impressions += day.IMPRESSIONS;
      clicks += day.CLICKS;
      revenue += day.REVENUE;
      transactions += day.TRANSACTIONS;
      spend += day.SPEND;
    }
    
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const roas = spend > 0 ? revenue / spend : 0;
    
    const calculatedTotals = { impressions, clicks, ctr, revenue, transactions, spend, roas };
    
    if (showDebugInfo) {
      console.log('AggregatedSparkCharts: Final totals:', calculatedTotals);
    }
    
    return calculatedTotals;
  }, [timeSeriesData, showDebugInfo]);
  
  // Calculate trends (comparing last two data points)
  const trends = useMemo(() => {
    if (timeSeriesData.length < 2) return {
      impressions: 0,
      clicks: 0,
      ctr: 0,
      revenue: 0,
      transactions: 0,
      roas: 0
    };
    
    const last = timeSeriesData[timeSeriesData.length - 1];
    const secondLast = timeSeriesData[timeSeriesData.length - 2];
    
    const lastCTR = last.IMPRESSIONS > 0 ? (last.CLICKS / last.IMPRESSIONS) * 100 : 0;
    const secondLastCTR = secondLast.IMPRESSIONS > 0 ? (secondLast.CLICKS / secondLast.IMPRESSIONS) * 100 : 0;
    
    const lastROAS = last.SPEND > 0 ? last.REVENUE / last.SPEND : 0;
    const secondLastROAS = secondLast.SPEND > 0 ? secondLast.REVENUE / secondLast.SPEND : 0;
    
    return {
      impressions: calculatePercentChange(last.IMPRESSIONS, secondLast.IMPRESSIONS),
      clicks: calculatePercentChange(last.CLICKS, secondLast.CLICKS),
      ctr: calculatePercentChange(lastCTR, secondLastCTR),
      revenue: calculatePercentChange(last.REVENUE, secondLast.REVENUE),
      transactions: calculatePercentChange(last.TRANSACTIONS, secondLast.TRANSACTIONS),
      roas: calculatePercentChange(lastROAS, secondLastROAS)
    };
  }, [timeSeriesData]);
  
  function calculatePercentChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  // Early return after all hooks are called
  if (!showAggregatedSparkCharts || !data || data.length === 0) {
    return null;
  }

  // Format functions
  const formatNumber = (value: number): string => value.toLocaleString();
  const formatRevenue = (value: number): string => `$${Math.round(value).toLocaleString()}`;
  const formatCTR = (value: number): string => `${value.toFixed(2)}%`;
  const formatROAS = (value: number): string => value.toFixed(2);
  
  const handleChartClick = (metricType: MetricType, title: string) => {
    // Transform the data to include calculated CTR and ROAS fields
    let transformedData = timeSeriesData;
    
    if (metricType === "ctr") {
      transformedData = timeSeriesData.map(d => ({
        ...d, 
        CTR: d.IMPRESSIONS > 0 ? (d.CLICKS / d.IMPRESSIONS) * 100 : 0
      }));
    } else if (metricType === "roas") {
      transformedData = timeSeriesData.map(d => ({
        ...d, 
        ROAS: d.SPEND > 0 ? d.REVENUE / d.SPEND : 0
      }));
    }
    
    console.log(`handleChartClick for ${metricType}:`, {
      metricType,
      originalDataLength: timeSeriesData.length,
      transformedDataLength: transformedData.length,
      sampleOriginal: timeSeriesData.slice(0, 2),
      sampleTransformed: transformedData.slice(0, 2)
    });
    
    setModalData({
      isOpen: true,
      title: `All Campaigns - ${title}`,
      metricType,
      data: transformedData
    });
  };

  const getMetricDetails = (metricType: MetricType) => {
    switch(metricType) {
      case "impressions":
        return {
          title: "Impressions",
          color: "#4ade80",
          formatter: (value: number) => formatNumber(value)
        };
      case "clicks":
        return {
          title: "Clicks",
          color: "#f59e0b",
          formatter: (value: number) => formatNumber(value)
        };
      case "ctr":
        return {
          title: "CTR",
          color: "#0ea5e9",
          formatter: (value: number) => formatCTR(value)
        };
      case "transactions":
        return {
          title: "Transactions",
          color: "#8b5cf6",
          formatter: (value: number) => formatNumber(value)
        };
      case "revenue":
        return {
          title: "Attributed Sales",
          color: "#ef4444",
          formatter: (value: number) => formatRevenue(value)
        };
      case "roas":
        return {
          title: "ROAS",
          color: "#d946ef",
          formatter: (value: number) => formatROAS(value)
        };
    }
  };
  
  // Render a metric card with chart
  const renderMetricCard = (title: string, value: number, trend: number, formatter: (val: number) => string, data: CampaignDataRow[], dataKey: string, color: string, metricType: MetricType) => {
    const colorClass = getColorClasses(trend).split(' ').find(c => c.startsWith('text-')) || '';
    const gradientId = `gradient-${title.toLowerCase().replace(/\s+/g, '-')}`;
    
    return (
      <Card className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className="text-sm font-medium">{title}</h4>
            <div className="text-base font-bold mt-1">
              {formatter(value)}
            </div>
          </div>
          
          <div className={`flex items-center text-xs ${colorClass} mt-1`}>
            {trend > 0 ? (
              <TrendingUp className="mr-1 h-3 w-3" />
            ) : (
              <TrendingDown className="mr-1 h-3 w-3" />
            )}
            <span>
              {trend > 0 ? "+" : ""}
              {trend.toFixed(1)}%
            </span>
          </div>
        </div>
        
        <div className="h-16 mt-1 cursor-pointer relative group" onClick={() => handleChartClick(metricType, title)}>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize className="h-5 w-5 text-muted-foreground" />
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey={dataKey} 
                stroke={color} 
                fillOpacity={1}
                fill={`url(#${gradientId})`} 
                dot={false}
                isAnimationActive={false}
                connectNulls={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
  };
  
  return (
    <div className="mb-2 animate-fade-in">
      {/* Updated to use two rows of three charts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {renderMetricCard(
          "Impressions", 
          totals.impressions, 
          trends.impressions, 
          formatNumber, 
          timeSeriesData, 
          "IMPRESSIONS", 
          "#4ade80",
          "impressions"
        )}
        
        {renderMetricCard(
          "Clicks", 
          totals.clicks, 
          trends.clicks, 
          formatNumber, 
          timeSeriesData, 
          "CLICKS", 
          "#f59e0b",
          "clicks"
        )}
        
        {renderMetricCard(
          "CTR", 
          totals.ctr, 
          trends.ctr, 
          formatCTR, 
          timeSeriesData.map(d => ({...d, CTR: d.IMPRESSIONS > 0 ? (d.CLICKS / d.IMPRESSIONS) * 100 : 0})), 
          "CTR", 
          "#0ea5e9",
          "ctr"
        )}
        
        {renderMetricCard(
          "Transactions", 
          totals.transactions, 
          trends.transactions, 
          formatNumber, 
          timeSeriesData, 
          "TRANSACTIONS", 
          "#8b5cf6",
          "transactions"
        )}
        
        {renderMetricCard(
          "Attributed Sales", 
          totals.revenue, 
          trends.revenue, 
          formatRevenue, 
          timeSeriesData, 
          "REVENUE", 
          "#ef4444",
          "revenue"
        )}
        
        {renderMetricCard(
          "ROAS", 
          totals.roas, 
          trends.roas, 
          formatROAS, 
          timeSeriesData.map(d => {
            return {...d, ROAS: d.SPEND > 0 ? d.REVENUE / d.SPEND : 0};
          }), 
          "ROAS", 
          "#d946ef",
          "roas"
        )}
      </div>
      
      {/* Modal for expanded chart view */}
      {modalData.isOpen && (
        <SparkChartModal
          open={modalData.isOpen}
          onOpenChange={(open) => setModalData({ ...modalData, isOpen: open })}
          title={modalData.title}
          data={modalData.data}
          dataKey={modalData.metricType === "ctr" ? "CTR" : 
                  modalData.metricType === "roas" ? "ROAS" : 
                  modalData.metricType.toUpperCase()}
          color={getMetricDetails(modalData.metricType).color}
          gradientId={`aggregated-${modalData.metricType}`}
          valueFormatter={(value) => getMetricDetails(modalData.metricType).formatter(value)}
        />
      )}
    </div>
  );
};

const DashboardContent = ({ data,
  pacingData,
  contractTermsData,
  dateRange,
  onDateRangeChange,
  onPacingDataLoaded,
  onDataLoaded,
  hasAllData,
  isLoadingAllData,
  loadAllDataInBackgroundWrapper,
  showClearDialog,
  setShowClearDialog,
  showUnifiedUpload,
  setShowUnifiedUpload,
  lastCampaignUpload,
  lastContractUpload
}: {
  data: CampaignDataRow[];
  pacingData: PacingDeliveryData[];
  contractTermsData: ContractTermsRow[];
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onPacingDataLoaded: (data: CampaignDataRow[]) => void;
  onDataLoaded: (data: CampaignDataRow[]) => void;
  hasAllData: boolean;
  isLoadingAllData: boolean;
  loadAllDataInBackgroundWrapper: () => void;
  showClearDialog: boolean;
  setShowClearDialog: (show: boolean) => void;
  showUnifiedUpload: boolean;
  setShowUnifiedUpload: (show: boolean) => void;
  lastCampaignUpload: Date | null;
  lastContractUpload: Date | null;
}) => {
  // Calculate available date range from data to constrain date picker
  const availableDateRange = useMemo(() => {
    if (!data || data.length === 0) {
      return { min: undefined, max: undefined };
    }
    
    const rawDates = data
      .map(row => row.DATE)
      .filter(date => date && date !== 'Totals');
    
    console.log('Raw dates from data:', rawDates.slice(0, 10));
    
    const dates = rawDates
      .map(dateStr => {
        const parsed = parseDateString(dateStr);
        if (!parsed) {
          console.log('Failed to parse date:', dateStr);
        }
        return parsed;
      })
      .filter(Boolean) as Date[];
      
    if (dates.length === 0) {
      console.log('No valid dates found after parsing');
      return { min: undefined, max: undefined };
    }
    
    dates.sort((a, b) => a.getTime() - b.getTime());
    const result = {
      min: dates[0],
      max: dates[dates.length - 1]
    };
    
    console.log('Date range calculated:', {
      min: result.min?.toDateString(),
      max: result.max?.toDateString(),
      totalDates: dates.length
    });
    
    return result;
  }, [data]);
  // Global filters state - used across all charts
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([]);
  const [selectedAdvertisers, setSelectedAdvertisers] = useState<string[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [isInCampaignDetailView, setIsInCampaignDetailView] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    // Initialize active tab from URL parameter or default to dashboard
    return searchParams.get('tab') || 'dashboard';
  });

  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const newSearchParams = new URLSearchParams(searchParams);
    if (tab === 'dashboard') {
      // Remove tab param for default dashboard tab to keep URL clean
      newSearchParams.delete('tab');
    } else {
      newSearchParams.set('tab', tab);
    }
    setSearchParams(newSearchParams, { replace: true });
  };
  const [isAttributionChart, setIsAttributionChart] = useState(false);
  
  const { showLiveOnly, extractAdvertiserName, isTestCampaign, extractAgencyInfo, showDebugInfo } = useCampaignFilter();

  // Updated getMostRecentDate function to accept filtered data as parameter
  const getMostRecentDate = (filteredData: CampaignDataRow[]) => {
    if (!filteredData || filteredData.length === 0) return null;
    const dates = filteredData
      .map(row => row.DATE)
      .filter(date => date && date !== 'Totals')
      .sort((a, b) => {
        try {
          // Convert to Date objects for comparison
          const dateA = parseDateString(a);
          const dateB = parseDateString(b);
          if (!dateA || !dateB) return 0;
          return dateB.getTime() - dateA.getTime();
        } catch (e) {
          console.error("Error sorting dates:", e);
          return 0;
        }
      });
    
    return dates.length > 0 ? dates[0] : null;
  };

  const getFilteredData = () => {
    console.time('⏱️ getFilteredData');
    let filtered = data;
    
    if (!dateRange || !dateRange.from) {
      console.log("No date range specified, returning all data");
      console.timeEnd('⏱️ getFilteredData');
      return filtered;
    }

    const fromDate = setToStartOfDay(dateRange.from);
    const toDate = dateRange.to ? setToEndOfDay(dateRange.to) : setToEndOfDay(new Date());
    
    console.log("🔍 Filtering data - From:", fromDate.toLocaleDateString(), "To:", toDate.toLocaleDateString());
    console.log("🔍 Total data rows to filter:", data.length);
    
    filtered = data.filter(row => {
      try {
        if (!row.DATE) {
          console.warn(`Row missing DATE: ${JSON.stringify(row)}`);
          return false;
        }
        
        if (row.DATE === 'Totals') return true;
        
        const dateStr = String(row.DATE).trim();
        const rowDate = parseDateString(dateStr);
        if (!rowDate) {
          console.warn(`Could not parse date in row: ${dateStr}`);
          return false;
        }
        
        // Normalize row date to start of day for comparison
        const normalizedRowDate = setToStartOfDay(rowDate);
        const isAfterFrom = normalizedRowDate >= fromDate;
        const isBeforeTo = normalizedRowDate <= toDate;
        
        return isAfterFrom && isBeforeTo;
      } catch (error) {
        console.error(`Error filtering by date for row ${JSON.stringify(row)}:`, error);
        return false;
      }
    });

    console.log(`🔍 Filtered from ${data.length} rows to ${filtered.length} rows`);
    
    // Log sample of filtered data to verify it has the right content
    if (filtered.length > 0) {
      console.log("🔍 Sample filtered data:", filtered.slice(0, 3).map(row => ({
        DATE: row.DATE,
        CAMPAIGN: row["CAMPAIGN ORDER NAME"]?.substring(0, 50) + "...",
        IMPRESSIONS: row.IMPRESSIONS
      })));
      
      // Log full campaign names to debug parsing
      console.log("🔍 Full campaign names for debugging:", filtered.slice(0, 5).map(row => row["CAMPAIGN ORDER NAME"]));
    }
    
    // Additional check - if we get no data, log the date range issue
    if (filtered.length === 0 && data.length > 0) {
      console.warn("Date filtering resulted in empty dataset. Checking data dates...");
      const sampleDates = data.slice(0, 5).map(row => ({
        original: row.DATE,
        parsed: parseDateString(row.DATE)
      }));
      console.log("Sample dates from data:", sampleDates);
      console.log("Filter range:", { from: fromDate, to: toDate });
    }

    console.timeEnd('⏱️ getFilteredData');
    return filtered;
  };

  const filteredData = getFilteredData();
  
  const filteredDataByLiveStatus = useMemo(() => {
    console.time('⏱️ filteredDataByLiveStatus');
    console.log('🔍 filteredDataByLiveStatus - showLiveOnly:', showLiveOnly, 'filteredData length:', filteredData.length);
    
    if (!showLiveOnly) {
      console.log('🔍 Returning ALL filtered data (not just live campaigns)');
      console.timeEnd('⏱️ filteredDataByLiveStatus');
      return filteredData;
    }

    // Use the filtered data to get the most recent date, not the full dataset
    const mostRecentDate = getMostRecentDate(filteredData);
    if (!mostRecentDate) return filteredData;

    if (showDebugInfo) {
      console.log('Filtering for campaigns active on most recent date:', mostRecentDate);
    }
    
    // First get all the campaigns that have impressions on the most recent date
    const activeCampaignsOnMostRecentDate = new Set<string>();
    
    // Single pass to collect active campaigns
    console.time('⏱️ collecting active campaigns');
    for (const row of filteredData) {
      if (row.DATE === mostRecentDate && Number(row.IMPRESSIONS) > 0) {
        const campaignName = row["CAMPAIGN ORDER NAME"] || "";
        if (!isTestCampaign(campaignName)) {
          activeCampaignsOnMostRecentDate.add(campaignName);
        }
      }
    }
    console.timeEnd('⏱️ collecting active campaigns');
    
    if (showDebugInfo) {
      console.log(`Found ${activeCampaignsOnMostRecentDate.size} active campaigns on most recent date`);
    }
    
    // Single pass filter for live data
    const liveData = filteredData.filter(row => {
      if (row.DATE === 'Totals') return true;
      
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      if (isTestCampaign(campaignName)) return false;
      
      return activeCampaignsOnMostRecentDate.has(campaignName);
    });
    
    if (showDebugInfo) {
      console.log(`Filtered from ${filteredData.length} rows to ${liveData.length} live campaign rows`);
    }
    
    console.log('🔍 Live campaigns filtering completed:', liveData.length, 'rows');
    console.timeEnd('⏱️ filteredDataByLiveStatus');
    return liveData;
  }, [filteredData, showLiveOnly, isTestCampaign, showDebugInfo]);

  const getFilteredDataByGlobalFilters = useCallback(() => {
    // Early return if no filters are applied
    if (selectedAgencies.length === 0 && selectedAdvertisers.length === 0 && selectedCampaigns.length === 0) {
      return filteredDataByLiveStatus;
    }

    // Convert arrays to Sets for O(1) lookups
    const selectedAgencySet = new Set(selectedAgencies);
    const selectedAdvertiserSet = new Set(selectedAdvertisers);
    const selectedCampaignSet = new Set(selectedCampaigns);
    
    // Single pass filtering
    return filteredDataByLiveStatus.filter(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      
      // Campaign filter (most specific, check first)
      if (selectedCampaigns.length > 0 && !selectedCampaignSet.has(campaignName)) {
        return false;
      }
      
      // Agency filter
      if (selectedAgencies.length > 0) {
        const { agency } = extractAgencyInfo(campaignName);
        if (!selectedAgencySet.has(agency)) {
          return false;
        }
      }
      
      // Advertiser filter
      if (selectedAdvertisers.length > 0) {
        const advertiser = extractAdvertiserName(campaignName);
        if (!selectedAdvertiserSet.has(advertiser)) {
          return false;
        }
      }
      
      return true;
    });
  }, [filteredDataByLiveStatus, selectedAgencies, selectedAdvertisers, selectedCampaigns, extractAgencyInfo, extractAdvertiserName]);

  const globalFilteredData = useMemo(() => getFilteredDataByGlobalFilters(),
    [getFilteredDataByGlobalFilters]);

  // Filter contract terms data by global filters
  const filteredContractTermsData = useMemo(() => {
    console.log('🔍 Contract terms filtering - Original count:', contractTermsData.length);
    console.log('🔍 Current filters - Agencies:', selectedAgencies.length, 'Advertisers:', selectedAdvertisers.length, 'Campaigns:', selectedCampaigns.length);
    
    if (selectedAgencies.length === 0 && selectedAdvertisers.length === 0 && selectedCampaigns.length === 0) {
      console.log('🔍 No filters applied, returning all contract terms');
      return contractTermsData;
    }

    const selectedAgencySet = new Set(selectedAgencies);
    const selectedAdvertiserSet = new Set(selectedAdvertisers);
    const selectedCampaignSet = new Set(selectedCampaigns);

    const filtered = contractTermsData.filter(contract => {
      const campaignName = contract.Name;
      console.log('🔍 Checking contract:', campaignName);
      
      // Filter by specific campaigns first
      if (selectedCampaigns.length > 0 && !selectedCampaignSet.has(campaignName)) {
        console.log('🔍 Filtered out by campaign filter:', campaignName);
        return false;
      }
      
      // Filter by agencies
      if (selectedAgencies.length > 0) {
        const agencyInfo = extractAgencyInfo(campaignName);
        console.log('🔍 Agency info for', campaignName, ':', agencyInfo);
        if (!agencyInfo || !selectedAgencySet.has(agencyInfo.agency)) {
          console.log('🔍 Filtered out by agency filter:', campaignName, 'Agency:', agencyInfo?.agency);
          return false;
        }
      }
      
      // Filter by advertisers
      if (selectedAdvertisers.length > 0) {
        const advertiserName = extractAdvertiserName(campaignName);
        console.log('🔍 Advertiser for', campaignName, ':', advertiserName);
        if (!advertiserName || !selectedAdvertiserSet.has(advertiserName)) {
          console.log('🔍 Filtered out by advertiser filter:', campaignName, 'Advertiser:', advertiserName);
          return false;
        }
      }
      
      console.log('🔍 Contract passed all filters:', campaignName);
      return true;
    });
    
    console.log('🔍 Filtered contract terms count:', filtered.length);
    return filtered;
  }, [contractTermsData, selectedAgencies, selectedAdvertisers, selectedCampaigns, extractAgencyInfo, extractAdvertiserName]);

  const agencyOptions = useMemo(() => {
    console.time('⏱️ agencyOptions calculation');
    const agencies = new Set<string>();
    
    for (const row of filteredDataByLiveStatus) {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      if (!isTestCampaign(campaignName)) {
        const { agency } = extractAgencyInfo(campaignName);
        if (agency) agencies.add(agency);
      }
    }
    
    const result = Array.from(agencies)
      .sort()
      .map(agency => ({
        value: agency,
        label: agency
      }));
    
    console.timeEnd('⏱️ agencyOptions calculation');
    return result;
  }, [filteredDataByLiveStatus, extractAgencyInfo, isTestCampaign]);

  const advertiserOptions = useMemo(() => {
    const advertisers = new Set<string>();
    const selectedAgencySet = new Set(selectedAgencies);
    
    for (const row of filteredDataByLiveStatus) {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      if (!isTestCampaign(campaignName)) {
        // Apply agency filter if selected
        if (selectedAgencies.length > 0) {
          const { agency } = extractAgencyInfo(campaignName);
          if (!selectedAgencySet.has(agency)) continue;
        }
        
        const advertiser = extractAdvertiserName(campaignName);
        if (advertiser) advertisers.add(advertiser);
      }
    }
    
    return Array.from(advertisers)
      .sort()
      .map(advertiser => ({
        value: advertiser,
        label: advertiser
      }));
  }, [filteredDataByLiveStatus, selectedAgencies, extractAdvertiserName, extractAgencyInfo, isTestCampaign]);

  const campaignOptions = useMemo(() => {
    const campaigns = new Set<string>();
    const selectedAgencySet = new Set(selectedAgencies);
    const selectedAdvertiserSet = new Set(selectedAdvertisers);
    
    for (const row of filteredDataByLiveStatus) {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      if (!isTestCampaign(campaignName)) {
        // Apply agency filter if selected
        if (selectedAgencies.length > 0) {
          const { agency } = extractAgencyInfo(campaignName);
          if (!selectedAgencySet.has(agency)) continue;
        }
        
        // Apply advertiser filter if selected
        if (selectedAdvertisers.length > 0) {
          const advertiser = extractAdvertiserName(campaignName);
          if (!selectedAdvertiserSet.has(advertiser)) continue;
        }
        
        campaigns.add(campaignName);
      }
    }
    
    return Array.from(campaigns)
      .sort()
      .map(campaign => ({
        value: campaign,
        label: campaign
      }));
  }, [filteredDataByLiveStatus, selectedAgencies, selectedAdvertisers, extractAdvertiserName, extractAgencyInfo, isTestCampaign]);

  const handleAgenciesChange = (selected: string[]) => {
    setSelectedAgencies(selected);
    // Clear dependent filters when parent filter changes
    setSelectedAdvertisers([]);
    setSelectedCampaigns([]);
  };

  const handleAdvertisersChange = (selected: string[]) => {
    setSelectedAdvertisers(selected);
    // Clear campaigns when advertiser changes
    setSelectedCampaigns([]);
  };

  const handleCampaignsChange = (selected: string[]) => {
    setSelectedCampaigns(selected);
  };

  const headerContent = (
    <>
      {/* Title and Date Picker */}
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Display Campaign Monitor</h1>
        </div>

        <div className="flex items-center gap-2">
          {!(activeTab === 'campaigns' && isInCampaignDetailView) && <CampaignStatusToggle />}
          <DateRangePicker
            key={`date-picker-${data.length}`}
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
            displayDateRangeSummary={false}
            minDate={availableDateRange.min}
            maxDate={availableDateRange.max}
          />

          {!hasAllData && (
            <Button
              variant={isLoadingAllData ? "secondary" : "outline"}
              size="sm"
              onClick={loadAllDataInBackgroundWrapper}
              disabled={isLoadingAllData}
              className="whitespace-nowrap"
            >
              <TrendingUp className="mr-2" size={14} />
              {isLoadingAllData ? "Loading All..." : "Load All Data"}
            </Button>
          )}
        </div>
      </div>

      {/* Global filters section - hidden when viewing single campaign details */}
      {!(activeTab === 'campaigns' && isInCampaignDetailView) && (
        <div className="border-t border-gray-100">
          <GlobalFilters
            agencyOptions={agencyOptions}
            advertiserOptions={advertiserOptions}
            campaignOptions={campaignOptions}
            selectedAgencies={selectedAgencies}
            selectedAdvertisers={selectedAdvertisers}
            selectedCampaigns={selectedCampaigns}
            onAgenciesChange={handleAgenciesChange}
            onAdvertisersChange={handleAdvertisersChange}
            onCampaignsChange={handleCampaignsChange}
          />
        </div>
      )}
    </>
  );

  return (
    <>
      <SidebarLayout
        activeTab={activeTab}
        onTabChange={handleTabChange}
        pacingDataLength={pacingData.length}
        contractTermsDataLength={contractTermsData.length}
        dataLength={data.length}
        hasAllData={hasAllData}
        onClearDatabase={() => setShowClearDialog(true)}
        onUploadCSV={() => setShowUnifiedUpload(true)}
        header={headerContent}
        className="animate-fade-in"
        lastCampaignUpload={lastCampaignUpload}
        lastContractUpload={lastContractUpload}
      >
        <div className="px-4 lg:px-6 pb-4 lg:pb-6 pt-8">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsContent value="dashboard" className="mt-0">
          {/* Dashboard tab content */}
          <div id="dashboard-metrics-section">
            <AggregatedSparkCharts 
              data={globalFilteredData.filter(row => row.DATE !== 'Totals')}
            />
            
            {/* Chart section with toggle instead of tabs */}
            <div className="mt-6 mb-4" id="weekly-comparison-section">
              <DashboardWrapper 
                data={showLiveOnly ? filteredDataByLiveStatus : filteredData}
                metricsData={globalFilteredData}
                revenueData={globalFilteredData}
                selectedMetricsCampaigns={[]}
                selectedRevenueCampaigns={[]}
                selectedRevenueAdvertisers={[]}
                selectedRevenueAgencies={[]}
                onMetricsCampaignsChange={() => {}}
                onRevenueCampaignsChange={() => {}}
                onRevenueAdvertisersChange={() => {}}
                onRevenueAgenciesChange={() => {}}
                selectedWeeklyCampaigns={[]}
                onWeeklyCampaignsChange={() => {}}
                selectedMetricsAdvertisers={[]}
                selectedMetricsAgencies={[]}
                onMetricsAdvertisersChange={() => {}}
                onMetricsAgenciesChange={() => {}}
                useGlobalFilters={true}
                hideCharts={isAttributionChart ? ["metricsChart"] : ["revenueChart"]}
                chartToggleComponent={
                  <ChartToggle
                    isAttributionChart={isAttributionChart}
                    setIsAttributionChart={setIsAttributionChart}
                  />
                }
                showDailyTotalsTable={false}
                hideDashboardSparkCharts={true}
              />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="sparks" className="mt-0">
          {/* Trends tab content */}
          <div id="spark-charts-section">
            <CampaignSparkCharts 
              data={globalFilteredData} 
              dateRange={dateRange}
              useGlobalFilters={true}
            />
          </div>
        </TabsContent>

        {data.length > 0 && (
          <TabsContent value="campaigns" className="mt-0">
            {/* Campaign Manager tab content */}
            <div className="mb-4 animate-fade-in" id="campaigns-section">
              <CampaignManager
                data={globalFilteredData}
                pacingData={pacingData}
                contractTermsData={contractTermsData}
                useGlobalFilters={true}
                globalDateRange={dateRange}
                onCampaignDetailViewChange={setIsInCampaignDetailView}
              />
            </div>
          </TabsContent>
        )}

        {(pacingData.length > 0 || contractTermsData.length > 0) && (
          <TabsContent value="health" className="mt-0">
            {/* Campaign Health tab content */}
            <div id="health-scatter-section">
              <CampaignHealthTab
                data={globalFilteredData}
                pacingData={pacingData}
                contractTermsData={contractTermsData}
                unfilteredData={data}
                dbContractTerms={[]}
              />
            </div>
          </TabsContent>
        )}
        
        <TabsContent value="pacing" className="mt-0">
          <div className="mb-4 animate-fade-in" id="pacing-section">
            <Pacing
              data={globalFilteredData}
              unfilteredData={data}
            />
          </div>
        </TabsContent>

        {data.length > 0 && (
          <TabsContent value="notifications" className="mt-0">
            {/* Notifications tab content */}
            <div className="mb-4 animate-fade-in" id="notifications-section">
              <NotificationsTab campaignData={globalFilteredData} />
            </div>
          </TabsContent>
        )}

        <TabsContent value="custom-report" className="mt-0">
          {/* Custom Report tab content */}
          <div className="mb-4 animate-fade-in" id="custom-report-section">
            <CustomReportBuilder 
              data={globalFilteredData}
              dateRange={dateRange}
              pacingData={pacingData}
              contractTermsData={contractTermsData}
            />
          </div>
        </TabsContent>
        
        {(contractTermsData.length > 0 || data.length > 0) && (
          <TabsContent value="status" className="mt-0">
            {/* Status tab content */}
            <div className="mb-4 animate-fade-in" id="status-section">
              <StatusTab 
                contractTermsData={filteredContractTermsData}
                deliveryData={globalFilteredData}
                globalMostRecentDate={
                  globalFilteredData.length > 0 
                    ? new Date(Math.max(...globalFilteredData.map(row => parseDateString(row.DATE)?.getTime() || 0).filter(Boolean)))
                    : new Date()
                }
              />
            </div>
          </TabsContent>
        )}
        
        
        <TabsContent value="raw-data" className="mt-0">
          {/* Raw Data tab content */}
          <div className="mb-4 animate-fade-in" id="raw-data-table-section">
            <h3 className="text-lg font-semibold mb-4">Campaign Data</h3>
            <RawDataTableImproved 
              data={globalFilteredData}
              useGlobalFilters={true}
            />
          </div>
        </TabsContent>
          </Tabs>
        </div>
      </SidebarLayout>


      {/* Clear database dialog */}
      <ClearDatabaseDialog
        isOpen={showClearDialog}
        onClose={() => setShowClearDialog(false)}
        onSuccess={() => {
          toast.success("Database cleared successfully. Reloading...");
          setShowClearDialog(false);
          // Reload the page to refresh all data
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }}
      />
    </>
  );
};


const Index = () => {
  const { upsertCampaignData, getCampaignData, loadAllDataInBackground, getContractTerms, upsertContractTerms } = useSupabase();
  const [data, setData] = useState<CampaignDataRow[]>([]);
  const [pacingData, setPacingData] = useState<CampaignDataRow[]>([]);
  const [contractTermsData, setContractTermsData] = useState<CampaignDataRow[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [showDashboard, setShowDashboard] = useState(false);
  const [isLoadingFromSupabase, setIsLoadingFromSupabase] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState<string>('');
  const [isLoadingAllData, setIsLoadingAllData] = useState(false);
  const [hasAllData, setHasAllData] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showUnifiedUpload, setShowUnifiedUpload] = useState(false);
  const [lastCampaignUpload, setLastCampaignUpload] = useState<Date | null>(null);
  const [lastContractUpload, setLastContractUpload] = useState<Date | null>(null);

  // Load all data at startup
  useEffect(() => {
    const loadAllDataFromSupabase = async () => {
      try {
        setLoadingProgress('Loading recent campaign data...');

        // Load recent data only at startup (last 90 days) for fast initial load
        const campaignData = await getCampaignData(undefined, undefined, setLoadingProgress, true);

        if (campaignData.length > 0) {
          setLoadingProgress('Processing data...');
          const transformedData = transformDataFormat(campaignData);

          setData(transformedData);
          setDateRange(undefined);
          setShowDashboard(true);
          setHasAllData(false); // Mark that we don't have all data yet (just recent)
          console.log(`✅ Recent data loaded: ${transformedData.length} rows (last 90 days)`);
        }

        // Load contract terms from Supabase
        setLoadingProgress('Loading contract terms...');
        try {
          const contractTerms = await getContractTerms();
          if (contractTerms.length > 0) {
            // Transform database format to StatusTab expected format
            const transformedContractTerms = contractTerms.map(term => {
              // Convert YYYY-MM-DD database dates to MM/DD/YYYY format expected by StatusTab
              const formatDbDate = (dateString: string) => {
                const date = new Date(dateString);
                const month = date.getMonth() + 1;
                const day = date.getDate();
                const year = date.getFullYear();
                return `${month}/${day}/${year}`;
              };

              return {
                'Name': term.campaign_name,
                'Start Date': formatDbDate(term.start_date),
                'End Date': formatDbDate(term.end_date),
                'Budget': term.budget.toString(),
                'CPM': term.cpm.toString(),
                'Impressions Goal': term.impressions_goal.toString()
              };
            });
            setContractTermsData(transformedContractTerms);
            console.log(`✅ Contract terms loaded: ${contractTerms.length} contracts`);
          }
        } catch (contractError) {
          console.error("Failed to load contract terms:", contractError);
          // Don't fail the entire load if contract terms fail
        }

        // Load last upload timestamps
        setLoadingProgress('Loading upload timestamps...');
        try {
          const [campaignTimestamp, contractTimestamp] = await Promise.all([
            getLastCampaignUpload(),
            getLastContractUpload()
          ]);
          setLastCampaignUpload(campaignTimestamp);
          setLastContractUpload(contractTimestamp);
        } catch (timestampError) {
          console.error("Failed to load upload timestamps:", timestampError);
          // Don't fail the entire load if timestamps fail
        }

      } catch (error) {
        console.error("Failed to load all data from Supabase:", error);
        setLoadingProgress('Error loading data');
      } finally {
        setIsLoadingFromSupabase(false);
        setLoadingProgress('');
      }
    };

    loadAllDataFromSupabase();
  }, [getCampaignData, getContractTerms]);

  // Background loading of all historical data
  const loadAllDataInBackgroundWrapper = useCallback(async () => {
    if (hasAllData || isLoadingAllData) return;

    try {
      setIsLoadingAllData(true);
      console.log('🔄 Loading all historical data in background...');

      const allData = await loadAllDataInBackground((progress) => {
        console.log(`Background loading: ${progress}`);
      });

      if (allData.length > data.length) {
        const transformedData = transformDataFormat(allData);
        setData(transformedData);
        setHasAllData(true);
        console.log(`✅ Background load complete: ${transformedData.length} total rows`);
        toast.success(`Loaded complete dataset: ${transformedData.length.toLocaleString()} records`);
      }
    } catch (error) {
      console.error("Background data loading failed:", error);
    } finally {
      setIsLoadingAllData(false);
    }
  }, [data.length, hasAllData, isLoadingAllData, loadAllDataInBackground]);

  // Helper function to transform data format
  const transformDataFormat = (campaignData: CampaignDataRow[]) => {
    return campaignData.map(row => {
      let formattedDate = row.date;
      try {
        if (row.date && typeof row.date === 'string') {
          const date = new Date(row.date + 'T00:00:00');
          if (!isNaN(date.getTime())) {
            formattedDate = formatDateSortable(date);
          }
        }
      } catch (e) {
        console.error("Error formatting date:", e, row.date);
      }

      return {
        DATE: formattedDate,
        "CAMPAIGN ORDER NAME": row.campaign_order_name,
        IMPRESSIONS: row.impressions,
        CLICKS: row.clicks,
        REVENUE: row.revenue,
        SPEND: row.spend,
        TRANSACTIONS: row.transactions
      };
    });
  };

  // Debug effect to track data changes
  useEffect(() => {
    console.log(`🔍 Data changed: ${data.length} rows, current dateRange:`, dateRange);
    if (data.length > 0) {
      console.log(`🔍 First 3 dates in data:`, data.slice(0, 3).map(row => row.DATE));
    }
  }, [data, dateRange]);

  useEffect(() => {
    if (data.length > 0) {
      // First parse all dates and sort them chronologically, not alphabetically
      const allDates = Array.from(new Set(data.map(row => row.DATE)))
        .filter(date => date !== 'Totals')
        .map(dateStr => ({
          original: dateStr,
          parsed: parseDateString(dateStr)
        }))
        .filter(item => item.parsed !== null)
        .sort((a, b) => a.parsed!.getTime() - b.parsed!.getTime());

      const uniqueDates = allDates.map(item => item.original);
      console.log(`Dataset has ${uniqueDates.length} unique dates (chronologically sorted):`, uniqueDates);

      if (uniqueDates.length > 0) {
        const firstDate = allDates[0].original;
        const lastDate = allDates[allDates.length - 1].original;
        console.log(`Date range in dataset: ${firstDate} to ${lastDate}`);

        const dateCounts: Record<string, number> = {};
        data.forEach(row => {
          dateCounts[row.DATE] = (dateCounts[row.DATE] || 0) + 1;
        });
        console.log("Rows per date:", dateCounts);

        console.log(`🔍 Current dateRange state:`, dateRange);

        // Force recalculation every time data loads to ensure we use the most recent 30 days
        // Always recalculate to use the most recent 30 days from actual data
        console.log(`🔍 Force recalculating date range based on loaded data...`);
        try {
            // Use the already parsed and sorted dates
            const parsedDates = allDates.map(item => item.parsed!);

            if (parsedDates.length > 0) {
              const minDate = parsedDates[0];
              const maxDate = parsedDates[parsedDates.length - 1];
              
              if (!isNaN(minDate.getTime()) && !isNaN(maxDate.getTime())) {
                // Check if the dataset spans more than 90 days
                const daysDifference = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);

                let fromDate = minDate;
                const toDate = maxDate;
                
                console.log(`🔍 Dataset analysis:`);
                console.log(`🔍 - Min date: ${minDate.toLocaleDateString()} (${minDate.toISOString()})`);
                console.log(`🔍 - Max date: ${maxDate.toLocaleDateString()} (${maxDate.toISOString()})`);
                console.log(`🔍 - Spans: ${Math.round(daysDifference)} days`);

                // If dataset spans more than 90 days, default to last 30 days of data
                if (daysDifference > 90) {
                  // Set to last 30 days of available data using proper date arithmetic
                  fromDate = new Date(maxDate.getTime() - (30 * 24 * 60 * 60 * 1000));

                  // Make sure fromDate doesn't go before the actual data start
                  if (fromDate < minDate) {
                    fromDate = minDate;
                  }

                  console.log(`🔍 Using last 30 days: ${fromDate.toLocaleDateString()} to ${maxDate.toLocaleDateString()}`);
                  console.log(`🔍 Latest 5 dates in data:`, uniqueDates.slice(-5));
                } else {
                  console.log(`🔍 Using full range: ${minDate.toLocaleDateString()} to ${maxDate.toLocaleDateString()}`);
                }
                
                console.log(`🔍 Setting dateRange to:`, { from: fromDate, to: toDate });
                setDateRange({ from: fromDate, to: toDate });
              }
            }
        } catch (e) {
          console.error("Error auto-setting date range:", e);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- dateRange is intentionally excluded to avoid infinite loop when setting initial range
  }, [data]);

  const handleDataLoaded = (uploadedData: CampaignDataRow[]) => {
    try {
      if (!Array.isArray(uploadedData) || uploadedData.length === 0) {
        toast.error("Invalid data format received");
        return;
      }
      
      console.log(`Loaded ${uploadedData.length} rows of data`);
      
      const requiredFields = ["DATE", "CAMPAIGN ORDER NAME", "IMPRESSIONS", "CLICKS", "REVENUE", "SPEND"];
      
      if (uploadedData[0]) {
        const missingFields = requiredFields.filter(field => 
          !Object.keys(uploadedData[0]).some(key => key.toUpperCase() === field)
        );
        
        if (missingFields.length > 0) {
          toast.error(`Missing required fields: ${missingFields.join(", ")}`);
          return;
        }
      }
      
      const processedData = uploadedData.map(row => {
        const newRow = { ...row };

        // Sanitize date field
        if (newRow.DATE) {
          try {
            const date = parseDateString(newRow.DATE);
            if (date) {
              newRow.DATE = formatDateSortable(date);
              if (newRow.DATE.includes('04/09/') || newRow.DATE.includes('04/08/')) {
                logDateDetails(`Processed date for row:`, date, `-> ${newRow.DATE} (original: ${row.DATE})`);
              }
            } else {
              console.error(`Invalid date format: ${newRow.DATE}`);
              newRow.DATE = null; // Mark for filtering out
            }
          } catch (e) {
            console.error("Error parsing date:", e);
            newRow.DATE = null; // Mark for filtering out
          }
        }

        // Sanitize campaign name field - remove any potential invalid characters
        const campaignFields = ["CAMPAIGN ORDER NAME", "Campaign Order Name", "CAMPAIGN_ORDER_NAME"];
        for (const field of campaignFields) {
          if (newRow[field]) {
            // Remove null bytes, control characters, and trim whitespace
            /* eslint-disable no-control-regex */
            newRow[field] = String(newRow[field])
              .replace(/\u0000/g, '') // Remove null bytes
              .replace(/[\u0000-\u001F\u007F]/g, '') // Remove control characters
              .trim();
            /* eslint-enable no-control-regex */
            break;
          }
        }

        // Sanitize numeric fields
        ["IMPRESSIONS", "CLICKS", "TRANSACTIONS", "REVENUE", "SPEND"].forEach(field => {
          const normalizedField = Object.keys(newRow).find(key => key.toUpperCase() === field);
          if (normalizedField) {
            const value = Number(newRow[normalizedField]);
            newRow[normalizedField] = isNaN(value) ? 0 : value;
          }
        });

        return newRow;
      }).filter(row => row.DATE && row.DATE !== null); // Filter out rows with invalid dates
      
      // Don't replace existing data immediately - let Supabase upsert handle the merge
      // setData(processedData);  // This was causing the bug!

      const dates = processedData.map(row => row.DATE).filter(date => date && date !== 'Totals').sort();
      if (dates.length > 0) {
        console.log(`Data date range: ${dates[0]} to ${dates[dates.length-1]}`);
        console.log(`Total unique dates: ${new Set(dates).size}`);

        const dateCounts: Record<string, number> = {};
        processedData.forEach(row => {
          dateCounts[row.DATE] = (dateCounts[row.DATE] || 0) + 1;
        });
        console.log("Rows per date:", dateCounts);
      }

      toast.success(`Successfully uploaded ${processedData.length} rows of data. Refreshing with complete dataset...`);

      // Upsert data to Supabase in the background
      try {
        const supabaseData = processedData.map(row => {
          // Sanitize date field
          const cleanDate = row.DATE;
          if (typeof cleanDate !== 'string' || !cleanDate || cleanDate === 'Totals') {
            return null; // Skip invalid rows
          }

          // Sanitize campaign name field
          let campaignName = row["CAMPAIGN ORDER NAME"] || row["Campaign Order Name"] || row.CAMPAIGN_ORDER_NAME;
          if (typeof campaignName !== 'string' || !campaignName.trim()) {
            return null; // Skip rows without valid campaign names
          }
          campaignName = campaignName.trim();

          // Sanitize numeric fields
          const impressions = Number(row.IMPRESSIONS) || 0;
          const clicks = Number(row.CLICKS) || 0;
          const revenue = Number(row.REVENUE) || 0;
          const spend = Number(row.SPEND) || 0;
          const transactions = row.TRANSACTIONS ? Number(row.TRANSACTIONS) || 0 : 0;

          return {
            date: cleanDate,
            campaign_order_name: campaignName,
            impressions: impressions,
            clicks: clicks,
            revenue: revenue,
            spend: spend,
            transactions: transactions
          };
        }).filter(row => row !== null); // Filter out null/invalid rows

        if (supabaseData.length > 0) {
          upsertCampaignData(supabaseData, (progress) => {
            console.log(`Upload progress: ${progress}`);
            setLoadingProgress(progress);
          }).then(async () => {
            console.log(`Successfully synced ${supabaseData.length} records to Supabase`);
            // Reload all data from Supabase to get the complete dataset
            try {
              const allCampaignData = await getCampaignData();
              if (allCampaignData.length > 0) {
                const refreshedData = allCampaignData.map(row => {
                  // Convert YYYY-MM-DD date format to MM/DD/YY format
                  let formattedDate = row.date;
                  try {
                    if (row.date && typeof row.date === 'string') {
                      const date = new Date(row.date + 'T00:00:00'); // Add time to avoid timezone issues
                      if (!isNaN(date.getTime())) {
                        formattedDate = formatDateSortable(date);
                      }
                    }
                  } catch (e) {
                    console.error("Error formatting date:", e, row.date);
                  }

                  return {
                    DATE: formattedDate,
                    "CAMPAIGN ORDER NAME": row.campaign_order_name,
                    IMPRESSIONS: row.impressions,
                    CLICKS: row.clicks,
                    REVENUE: row.revenue,
                    SPEND: row.spend,
                    TRANSACTIONS: row.transactions
                  };
                });
                setData(refreshedData);
                setShowDashboard(true); // Show dashboard after data is loaded
                console.log(`Refreshed with ${refreshedData.length} total records from Supabase`);
              }
            } catch (error) {
              console.error("Failed to refresh data from Supabase:", error);
            }
          }).catch((error) => {
            console.error("Failed to sync data to Supabase:", error);
            // Don't show error toast to user since this is background operation
          });
        }
      } catch (error) {
        console.error("Error preparing data for Supabase:", error);
      }
    } catch (error) {
      console.error("Error processing uploaded data:", error);
      toast.error("Failed to process the uploaded data");
    }
  };

  const handlePacingDataLoaded = (uploadedPacingData: PacingDeliveryData[]) => {
    try {
      if (!Array.isArray(uploadedPacingData) || uploadedPacingData.length === 0) {
        toast.error("Invalid pacing data format received");
        return;
      }

      console.log(`Loaded ${uploadedPacingData.length} rows of pacing data`);
      setPacingData(uploadedPacingData);
      toast.success(`Successfully loaded ${uploadedPacingData.length} campaigns of pacing data`);
    } catch (error) {
      console.error("Error processing pacing data:", error);
      toast.error("Failed to process the pacing data");
    }
  };

  const handleContractTermsLoaded = async (uploadedContractTermsData: ContractTermsRow[]) => {
    try {
      if (!Array.isArray(uploadedContractTermsData) || uploadedContractTermsData.length === 0) {
        toast.error("Invalid contract terms data format received");
        return;
      }

      console.log(`Loaded ${uploadedContractTermsData.length} rows of contract terms data`);
      setContractTermsData(uploadedContractTermsData);
      toast.success(`Successfully loaded ${uploadedContractTermsData.length} contract terms`);

      // Save to Supabase
      try {
        console.log('🔄 Starting contract terms sync to Supabase...');
        const supabaseContractTerms = uploadedContractTermsData.map(term => {
          // Parse dates from MM/DD/YYYY format to YYYY-MM-DD format for database
          const parseDate = (dateStr: string): string => {
            const [month, day, year] = dateStr.split('/');
            const fullYear = year.length === 2 ? `20${year}` : year;
            return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          };

          return {
            campaign_name: term.Name,
            start_date: parseDate(term['Start Date']),
            end_date: parseDate(term['End Date']),
            budget: Math.round(Number(term.Budget)),
            cpm: Number(term.CPM),
            impressions_goal: Math.round(Number(term['Impressions Goal']))
          };
        });

        console.log('📊 Prepared contract terms for upload:', supabaseContractTerms.length, 'records');
        console.log('Sample contract term:', supabaseContractTerms[0]);

        // Clear existing records first, then insert new ones
        await upsertContractTerms(supabaseContractTerms, true);
        console.log(`✅ Successfully synced ${supabaseContractTerms.length} contract terms to Supabase`);

        // Refresh the contract timestamp after upload
        console.log('🔄 Refreshing contract timestamp...');
        const contractTimestamp = await getLastContractUpload();
        console.log('📅 New contract timestamp:', contractTimestamp);
        setLastContractUpload(contractTimestamp);
      } catch (error) {
        console.error("❌ Failed to sync contract terms to Supabase:", error);
        toast.error("Failed to save contract terms to database");
      }
    } catch (error) {
      console.error("Error processing contract terms data:", error);
      toast.error("Failed to process the contract terms data");
    }
  };

  const handleProcessFiles = () => {
    if (data.length === 0) {
      toast.error("Please upload campaign data first");
      return;
    }
    setShowDashboard(true);
  };

  return (
    <CampaignFilterProvider>
      <div className="container py-8">
        {isLoadingFromSupabase ? (
          <div className="space-y-2 text-center animate-fade-in">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              Display Campaign Monitor
            </h1>
            <p className="text-muted-foreground">
              Loading your campaign data...
            </p>
            {loadingProgress && (
              <p className="text-sm text-muted-foreground">
                {loadingProgress}
              </p>
            )}
          </div>
        ) : !showDashboard ? (
          <>
            <div className="space-y-2 text-center animate-fade-in">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                Display Campaign Monitor
              </h1>
              <p className="text-muted-foreground">
                Upload your campaign data to identify potential anomalies and trends
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <FileUpload
                onDataLoaded={handleDataLoaded}
                onPacingDataLoaded={handlePacingDataLoaded}
                onContractTermsLoaded={handleContractTermsLoaded}
                onProcessFiles={handleProcessFiles}
              />
            </div>
          </>
        ) : (
          <DashboardContent
            data={data}
            pacingData={pacingData}
            contractTermsData={contractTermsData}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onPacingDataLoaded={handlePacingDataLoaded}
            onDataLoaded={handleDataLoaded}
            hasAllData={hasAllData}
            isLoadingAllData={isLoadingAllData}
            loadAllDataInBackgroundWrapper={loadAllDataInBackgroundWrapper}
            showClearDialog={showClearDialog}
            setShowClearDialog={setShowClearDialog}
            showUnifiedUpload={showUnifiedUpload}
            setShowUnifiedUpload={setShowUnifiedUpload}
            lastCampaignUpload={lastCampaignUpload}
            lastContractUpload={lastContractUpload}
          />
        )}

        {/* Unified Upload Modal - moved here to be available in all states */}
        <UnifiedUploadModal
          isOpen={showUnifiedUpload}
          onClose={() => setShowUnifiedUpload(false)}
          onDeliveryDataLoaded={handleDataLoaded}
          onContractTermsLoaded={handleContractTermsLoaded}
        />
      </div>
    </CampaignFilterProvider>
  );
};

export default Index;
