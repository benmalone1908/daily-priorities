import { useState, useEffect, useMemo } from "react";
import { DateRange } from "react-day-picker";
import FileUpload from "@/components/FileUpload";
import DateRangePicker from "@/components/DateRangePicker";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CampaignSparkCharts from "@/components/CampaignSparkCharts";
import { LayoutDashboard, ChartLine, FileText, Target, Plus, Activity } from "lucide-react";
import DashboardWrapper from "@/components/DashboardWrapper";
import { setToStartOfDay, setToEndOfDay, logDateDetails, normalizeDate, parseDateString } from "@/lib/utils";
import { CampaignFilterProvider, useCampaignFilter, AGENCY_MAPPING } from "@/contexts/CampaignFilterContext";
import { CampaignStatusToggle } from "@/components/CampaignStatusToggle";
import { ChartToggle } from "@/components/ChartToggle";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, LineChart, Line, Tooltip, AreaChart, Area, XAxis, YAxis } from "recharts";
import { getColorClasses } from "@/utils/anomalyColors";
import { TrendingDown, TrendingUp, Maximize, Eye, MousePointer, ShoppingCart, DollarSign, Percent } from "lucide-react";
import SparkChartModal from "@/components/SparkChartModal";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import GlobalFilters from "@/components/GlobalFilters";
import RawDataTable from "@/components/RawDataTable";
import PacingFileUpload from "@/components/PacingFileUpload";
import PacingTable from "@/components/PacingTable";
import PacingMetrics from "@/components/PacingMetrics";
import CampaignHealthTab from "@/components/CampaignHealthTab";

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
  data: any[];
}

// Helper function to get complete date range from data
const getCompleteDateRange = (data: any[]): Date[] => {
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
const fillMissingDatesForAggregated = (timeSeriesData: any[], allDates: Date[]): any[] => {
  console.log('fillMissingDatesForAggregated: Input data length:', timeSeriesData.length);
  console.log('fillMissingDatesForAggregated: Sample input data:', timeSeriesData.slice(0, 3));
  
  // If no data, return empty array
  if (timeSeriesData.length === 0 || allDates.length === 0) return timeSeriesData;
  
  // Create a map of existing data by date string - use the same format as aggregated data
  const dataByDate = new Map();
  timeSeriesData.forEach(item => {
    if (item.date) {
      console.log('fillMissingDatesForAggregated: Mapping existing data for date:', item.date);
      dataByDate.set(item.date, item);
    }
  });
  
  console.log('fillMissingDatesForAggregated: Created map with', dataByDate.size, 'entries');
  console.log('fillMissingDatesForAggregated: Map keys:', Array.from(dataByDate.keys()));
  
  // Find the actual range of dates that have data
  const datesWithData = timeSeriesData
    .map(item => parseDateString(item.date))
    .filter(Boolean)
    .sort((a, b) => a!.getTime() - b!.getTime());
    
  if (datesWithData.length === 0) return timeSeriesData;
  
  const firstDataDate = datesWithData[0]!;
  const lastDataDate = datesWithData[datesWithData.length - 1]!;
  
  // Generate complete time series only within the data range
  // Use the same date format as the aggregated data (M/D/YYYY)
  const result = [];
  for (const date of allDates) {
    if (date >= firstDataDate && date <= lastDataDate) {
      // Format date as M/D/YYYY to match aggregated data format
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
      console.log('fillMissingDatesForAggregated: Checking date:', dateStr);
      
      const existingData = dataByDate.get(dateStr);
      
      if (existingData) {
        // Use existing data as-is
        console.log('fillMissingDatesForAggregated: Found existing data for', dateStr, ':', existingData);
        result.push(existingData);
      } else {
        // Fill gap with zero values
        console.log('fillMissingDatesForAggregated: Filling gap for', dateStr);
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
  
  console.log('fillMissingDatesForAggregated: Final result length:', result.length);
  console.log('fillMissingDatesForAggregated: Sample final result:', result.slice(0, 3));
    
  return result;
};

// Improved Aggregated Spark Charts component that matches the campaign row style
const AggregatedSparkCharts = ({ data }: { data: any[] }) => {
  const { showAggregatedSparkCharts } = useCampaignFilter();
  const [modalData, setModalData] = useState<ModalData>({
    isOpen: false,
    title: "",
    metricType: "impressions",
    data: []
  });
  
  if (!showAggregatedSparkCharts || !data || data.length === 0) {
    return null;
  }

  console.log('AggregatedSparkCharts: Raw data received:', data.length, 'rows');
  console.log('AggregatedSparkCharts: Sample raw data:', data.slice(0, 3));

  // Get complete date range for filling gaps
  const completeDateRange = useMemo(() => getCompleteDateRange(data), [data]);

  // Group data by date for time series
  const timeSeriesData = useMemo(() => {
    console.log('AggregatedSparkCharts: Starting time series aggregation...');
    const dateGroups: Record<string, any> = {};
    
    data.forEach((row, index) => {
      if (!row || !row.DATE || row.DATE === 'Totals') {
        if (index < 5) console.log('AggregatedSparkCharts: Skipping row:', row);
        return;
      }
      
      const dateStr = String(row.DATE).trim();
      if (!dateGroups[dateStr]) {
        dateGroups[dateStr] = {
          date: dateStr,
          IMPRESSIONS: 0,
          CLICKS: 0,
          REVENUE: 0,
          TRANSACTIONS: 0,
          SPEND: 0
        };
      }
      
      // Log first few aggregations
      if (index < 5) {
        console.log(`AggregatedSparkCharts: Aggregating row ${index}:`, {
          date: dateStr,
          impressions: Number(row.IMPRESSIONS) || 0,
          clicks: Number(row.CLICKS) || 0,
          revenue: Number(row.REVENUE) || 0,
          transactions: Number(row.TRANSACTIONS) || 0,
          spend: Number(row.SPEND) || 0
        });
      }
      
      dateGroups[dateStr].IMPRESSIONS += Number(row.IMPRESSIONS) || 0;
      dateGroups[dateStr].CLICKS += Number(row.CLICKS) || 0;
      dateGroups[dateStr].REVENUE += Number(row.REVENUE) || 0;
      dateGroups[dateStr].TRANSACTIONS += Number(row.TRANSACTIONS) || 0;
      dateGroups[dateStr].SPEND += Number(row.SPEND) || 0;
    });
    
    console.log('AggregatedSparkCharts: Date groups created:', Object.keys(dateGroups).length);
    console.log('AggregatedSparkCharts: Sample date group:', Object.values(dateGroups)[0]);
    
    const rawData = Object.values(dateGroups).sort((a: any, b: any) => {
      try {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } catch (err) {
        return 0;
      }
    });
    
    console.log('AggregatedSparkCharts: Raw aggregated data:', rawData.length, 'entries');
    console.log('AggregatedSparkCharts: Sample aggregated data:', rawData.slice(0, 3));
    
    // Fill missing dates with zero values for continuous trend lines
    const filledData = fillMissingDatesForAggregated(rawData, completeDateRange);
    console.log('AggregatedSparkCharts: Final filled data:', filledData.length, 'entries');
    console.log('AggregatedSparkCharts: Sample filled data:', filledData.slice(0, 3));
    
    return filledData;
  }, [data, completeDateRange]);
  
  // Calculate totals
  const totals = useMemo(() => {
    console.log('AggregatedSparkCharts: Calculating totals from timeSeriesData:', timeSeriesData.length, 'entries');
    
    let impressions = 0;
    let clicks = 0;
    let revenue = 0;
    let transactions = 0;
    let spend = 0;
    
    timeSeriesData.forEach((day, index) => {
      if (index < 5) {
        console.log(`AggregatedSparkCharts: Adding to totals from day ${index}:`, day);
      }
      impressions += Number(day.IMPRESSIONS) || 0;
      clicks += Number(day.CLICKS) || 0;
      revenue += Number(day.REVENUE) || 0;
      transactions += Number(day.TRANSACTIONS) || 0;
      spend += Number(day.SPEND) || 0;
    });
    
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const roas = spend > 0 ? revenue / spend : 0;
    
    const calculatedTotals = { impressions, clicks, ctr, revenue, transactions, spend, roas };
    console.log('AggregatedSparkCharts: Final totals:', calculatedTotals);
    
    return calculatedTotals;
  }, [timeSeriesData]);
  
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

  // Format functions
  const formatNumber = (value: number): string => value.toLocaleString();
  const formatRevenue = (value: number): string => `$${Math.round(value).toLocaleString()}`;
  const formatCTR = (value: number): string => `${value.toFixed(2)}%`;
  const formatROAS = (value: number): string => value.toFixed(2);
  
  const handleChartClick = (metricType: MetricType, title: string) => {
    setModalData({
      isOpen: true,
      title: `All Campaigns - ${title}`,
      metricType,
      data: timeSeriesData
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
          title: "Revenue",
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
  const renderMetricCard = (title: string, value: number, trend: number, formatter: (val: number) => string, data: any[], dataKey: string, color: string, metricType: MetricType) => {
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
    <div className="mb-8 animate-fade-in">
      <div className="flex items-center mb-4">
        &nbsp;
      </div>
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
          "Revenue", 
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

const DashboardContent = ({ 
  data, 
  pacingData,
  contractTermsData,
  dateRange, 
  onDateRangeChange,
  onPacingDataLoaded
}: { 
  data: any[]; 
  pacingData: any[];
  contractTermsData: any[];
  dateRange: DateRange | undefined; 
  onDateRangeChange: (range: DateRange | undefined) => void;
  onPacingDataLoaded: (data: any[]) => void;
}) => {
  // Global filters state - used across all charts
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([]);
  const [selectedAdvertisers, setSelectedAdvertisers] = useState<string[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isAttributionChart, setIsAttributionChart] = useState(false);
  const [showPacingUpload, setShowPacingUpload] = useState(false);
  
  const { showLiveOnly, extractAdvertiserName, isTestCampaign, extractAgencyInfo } = useCampaignFilter();

  // Updated getMostRecentDate function to accept filtered data as parameter
  const getMostRecentDate = (filteredData: any[]) => {
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
    let filtered = data;
    
    if (!dateRange || !dateRange.from) {
      console.log("No date range specified, returning all data");
      return filtered;
    }

    const fromDate = setToStartOfDay(dateRange.from);
    const toDate = dateRange.to ? setToEndOfDay(dateRange.to) : setToEndOfDay(new Date());
    
    console.log("Filtering data - From:", fromDate.toISOString(), "To:", toDate.toISOString());
    
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

    console.log(`Filtered from ${data.length} rows to ${filtered.length} rows`);
    
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

    return filtered;
  };

  const filteredData = getFilteredData();
  
  const filteredDataByLiveStatus = useMemo(() => {
    if (!showLiveOnly) return filteredData;

    // Use the filtered data to get the most recent date, not the full dataset
    const mostRecentDate = getMostRecentDate(filteredData);
    if (!mostRecentDate) return filteredData;

    console.log('Filtering for campaigns active on most recent date:', mostRecentDate);
    
    // First get all the campaigns that have impressions on the most recent date
    const activeCampaignsOnMostRecentDate = new Set<string>();
    
    filteredData.forEach(row => {
      if (row.DATE === mostRecentDate && Number(row.IMPRESSIONS) > 0) {
        const campaignName = row["CAMPAIGN ORDER NAME"] || "";
        if (!isTestCampaign(campaignName)) { // Skip test campaigns
          activeCampaignsOnMostRecentDate.add(campaignName);
        }
      }
    });
    
    console.log(`Found ${activeCampaignsOnMostRecentDate.size} active campaigns on most recent date`);
    
    // Now filter to include all dates, but only for campaigns active on most recent date
    const liveData = filteredData.filter(row => {
      if (row.DATE === 'Totals') return true;
      
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      if (isTestCampaign(campaignName)) return false; // Skip test campaigns
      
      return activeCampaignsOnMostRecentDate.has(campaignName);
    });
    
    console.log(`Filtered from ${filteredData.length} rows to ${liveData.length} live campaign rows`);
    return liveData;
  }, [filteredData, showLiveOnly, isTestCampaign]);

  const getFilteredDataByGlobalFilters = () => {
    let filtered = filteredDataByLiveStatus;
    
    if (selectedAgencies.length > 0) {
      filtered = filtered.filter(row => {
        const campaignName = row["CAMPAIGN ORDER NAME"] || "";
        const { agency } = extractAgencyInfo(campaignName);
        return selectedAgencies.includes(agency);
      });
    }
    
    if (selectedAdvertisers.length > 0) {
      filtered = filtered.filter(row => {
        const campaignName = row["CAMPAIGN ORDER NAME"] || "";
        const advertiser = extractAdvertiserName(campaignName);
        return selectedAdvertisers.includes(advertiser);
      });
    }
    
    if (selectedCampaigns.length > 0) {
      filtered = filtered.filter(row => selectedCampaigns.includes(row["CAMPAIGN ORDER NAME"]));
    }
    
    return filtered;
  };

  const globalFilteredData = useMemo(() => getFilteredDataByGlobalFilters(), 
    [filteredDataByLiveStatus, selectedAgencies, selectedAdvertisers, selectedCampaigns, extractAdvertiserName, extractAgencyInfo]);

  const agencyOptions = useMemo(() => {
    const agencies = new Set<string>();
    
    filteredDataByLiveStatus.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      if (!isTestCampaign(campaignName)) {
        const { agency } = extractAgencyInfo(campaignName);
        if (agency) agencies.add(agency);
      }
    });
    
    return Array.from(agencies)
      .sort((a, b) => a.localeCompare(b))
      .map(agency => ({
        value: agency,
        label: agency
      }));
  }, [filteredDataByLiveStatus, extractAgencyInfo, isTestCampaign]);

  const advertiserOptions = useMemo(() => {
    const advertisers = new Set<string>();
    
    let filteredByAgency = filteredDataByLiveStatus;
    if (selectedAgencies.length > 0) {
      filteredByAgency = filteredDataByLiveStatus.filter(row => {
        const campaignName = row["CAMPAIGN ORDER NAME"] || "";
        const { agency } = extractAgencyInfo(campaignName);
        return selectedAgencies.includes(agency);
      });
    }
    
    filteredByAgency.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      if (!isTestCampaign(campaignName)) {
        const advertiser = extractAdvertiserName(campaignName);
        if (advertiser) advertisers.add(advertiser);
      }
    });
    
    return Array.from(advertisers)
      .sort((a, b) => a.localeCompare(b))
      .map(advertiser => ({
        value: advertiser,
        label: advertiser
      }));
  }, [filteredDataByLiveStatus, selectedAgencies, extractAdvertiserName, extractAgencyInfo, isTestCampaign]);

  const campaignOptions = useMemo(() => {
    // Start with filtered data
    let filteredForCampaigns = filteredDataByLiveStatus;
    
    // Apply agency filter if selected
    if (selectedAgencies.length > 0) {
      filteredForCampaigns = filteredForCampaigns.filter(row => {
        const campaignName = row["CAMPAIGN ORDER NAME"] || "";
        const { agency } = extractAgencyInfo(campaignName);
        return selectedAgencies.includes(agency);
      });
    }
    
    // Apply advertiser filter if selected
    if (selectedAdvertisers.length > 0) {
      filteredForCampaigns = filteredForCampaigns.filter(row => {
        const campaignName = row["CAMPAIGN ORDER NAME"] || "";
        const advertiser = extractAdvertiserName(campaignName);
        return selectedAdvertisers.includes(advertiser);
      });
    }
    
    const campaigns = new Set<string>();
    filteredForCampaigns.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      if (!isTestCampaign(campaignName)) {
        campaigns.add(campaignName);
      }
    });
    
    return Array.from(campaigns)
      .sort((a, b) => a.localeCompare(b))
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

  return (
    <>
      {/* Two-row header layout */}
      <div className="border-b animate-fade-in">
        {/* Top row: Title and Date Picker */}
        <div className="flex items-center justify-between px-1 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Display Campaign Monitor</h1>
          </div>
          
          <div className="flex items-center">
            <DateRangePicker 
              dateRange={dateRange}
              onDateRangeChange={onDateRangeChange}
              displayDateRangeSummary={false}
            />
          </div>
        </div>
        
        {/* Bottom row: Tabs and Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-1 py-3">
          <Tabs defaultValue="dashboard" className="w-full md:w-auto" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={`grid w-full ${
              pacingData.length > 0 && (pacingData.length > 0 || contractTermsData.length > 0) 
                ? 'grid-cols-5' 
                : pacingData.length > 0 || (pacingData.length > 0 || contractTermsData.length > 0)
                  ? 'grid-cols-4'
                  : 'grid-cols-3'
            }`}>
              <TabsTrigger value="dashboard">
                <LayoutDashboard className="mr-2" size={16} />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="sparks">
                <ChartLine className="mr-2" size={16} />
                Trends
              </TabsTrigger>
              {(pacingData.length > 0 || contractTermsData.length > 0) && (
                <TabsTrigger value="health">
                  <Activity className="mr-2" size={16} />
                  Health
                </TabsTrigger>
              )}
              {pacingData.length > 0 && (
                <TabsTrigger value="pacing">
                  <Target className="mr-2" size={16} />
                  Pacing
                </TabsTrigger>
              )}
              <TabsTrigger value="raw-data">
                <FileText className="mr-2" size={16} />
                Raw Data
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex items-center gap-2">
            <CampaignStatusToggle />
            {pacingData.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPacingUpload(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Pacing Data
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Global filters section */}
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
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsContent value="dashboard" className="mt-0">
          {/* Dashboard tab content */}
          <AggregatedSparkCharts 
            data={globalFilteredData.filter(row => row.DATE !== 'Totals')}
          />
          
          {/* Chart section with toggle instead of tabs */}
          <div className="mt-6 mb-4">
                       
            <DashboardWrapper 
              data={showLiveOnly ? filteredDataByLiveStatus : filteredData}
              metricsData={globalFilteredData}
              revenueData={globalFilteredData}
              // Pass empty arrays for individual chart filters since we're using global filters now
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
              // Flag to indicate we're using global filters
              useGlobalFilters={true}
              // Hide the appropriate chart based on toggle state instead of tab selection
              hideCharts={isAttributionChart ? ["metricsChart"] : ["revenueChart"]}
              // Pass the ChartToggle component to be rendered inside the chart area
              chartToggleComponent={
                <ChartToggle 
                  isAttributionChart={isAttributionChart} 
                  setIsAttributionChart={setIsAttributionChart} 
                />
              }
            />
          </div>
        </TabsContent>
        
        <TabsContent value="sparks" className="mt-0">
          {/* Trends tab content */}
          <CampaignSparkCharts 
            data={globalFilteredData} 
            dateRange={dateRange}
            useGlobalFilters={true}
          />
        </TabsContent>
        
        {(pacingData.length > 0 || contractTermsData.length > 0) && (
          <TabsContent value="health" className="mt-0">
            {/* Campaign Health tab content */}
            <CampaignHealthTab 
              data={globalFilteredData}
              pacingData={pacingData}
              contractTermsData={contractTermsData}
            />
          </TabsContent>
        )}
        
        {pacingData.length > 0 && (
          <TabsContent value="pacing" className="mt-0">
            <div className="mb-4 animate-fade-in">
              <PacingMetrics data={pacingData} />
              <PacingTable data={pacingData} />
            </div>
          </TabsContent>
        )}
        
        <TabsContent value="raw-data" className="mt-0">
          {/* Raw Data tab content */}
          <div className="mb-4 animate-fade-in">
            <h3 className="text-lg font-semibold mb-4">Campaign Data</h3>
            <RawDataTable 
              data={globalFilteredData}
              useGlobalFilters={true}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Pacing file upload dialog */}
      <PacingFileUpload
        isOpen={showPacingUpload}
        onClose={() => setShowPacingUpload(false)}
        onDataLoaded={onPacingDataLoaded}
      />
    </>
  );
};

const Index = () => {
  const [data, setData] = useState<any[]>([]);
  const [pacingData, setPacingData] = useState<any[]>([]);
  const [contractTermsData, setContractTermsData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    if (data.length > 0) {
      const uniqueDates = Array.from(new Set(data.map(row => row.DATE))).filter(date => date !== 'Totals').sort();
      console.log(`Dataset has ${uniqueDates.length} unique dates:`, uniqueDates);
      
      if (uniqueDates.length > 0) {
        console.log(`Date range in dataset: ${uniqueDates[0]} to ${uniqueDates[uniqueDates.length - 1]}`);
        const dateCounts: Record<string, number> = {};
        data.forEach(row => {
          dateCounts[row.DATE] = (dateCounts[row.DATE] || 0) + 1;
        });
        console.log("Rows per date:", dateCounts);
        
        if (!dateRange || !dateRange.from) {
          try {
            // Parse dates and create proper Date objects
            const parsedDates = uniqueDates
              .map(dateStr => parseDateString(dateStr))
              .filter(Boolean) as Date[];
              
            if (parsedDates.length > 0) {
              // Sort dates chronologically
              parsedDates.sort((a, b) => a.getTime() - b.getTime());
              
              const minDate = parsedDates[0];
              const maxDate = parsedDates[parsedDates.length - 1];
              
              if (!isNaN(minDate.getTime()) && !isNaN(maxDate.getTime())) {
                setDateRange({ from: minDate, to: maxDate });
                console.log(`Auto-set date range: ${minDate.toISOString()} to ${maxDate.toISOString()}`);
              }
            }
          } catch (e) {
            console.error("Error auto-setting date range:", e);
          }
        }
      }
    }
  }, [data]);

  const handleDataLoaded = (uploadedData: any[]) => {
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
        
        if (newRow.DATE) {
          try {
            const date = parseDateString(newRow.DATE);
            if (date) {
              newRow.DATE = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
              if (newRow.DATE.includes('4/9/') || newRow.DATE.includes('4/8/')) {
                logDateDetails(`Processed date for row:`, date, `-> ${newRow.DATE} (original: ${row.DATE})`);
              }
            } else {
              console.error(`Invalid date format: ${newRow.DATE}`);
            }
          } catch (e) {
            console.error("Error parsing date:", e);
          }
        }
        
        ["IMPRESSIONS", "CLICKS", "TRANSACTIONS", "REVENUE", "SPEND"].forEach(field => {
          const normalizedField = Object.keys(newRow).find(key => key.toUpperCase() === field);
          if (normalizedField) {
            newRow[normalizedField] = Number(newRow[normalizedField]) || 0;
          }
        });
        
        return newRow;
      });
      
      setData(processedData);
      
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
      
      toast.success(`Successfully loaded ${processedData.length} rows of data`);
    } catch (error) {
      console.error("Error processing uploaded data:", error);
      toast.error("Failed to process the uploaded data");
    }
  };

  const handlePacingDataLoaded = (uploadedPacingData: any[]) => {
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

  const handleContractTermsLoaded = (uploadedContractTermsData: any[]) => {
    try {
      if (!Array.isArray(uploadedContractTermsData) || uploadedContractTermsData.length === 0) {
        toast.error("Invalid contract terms data format received");
        return;
      }

      console.log(`Loaded ${uploadedContractTermsData.length} rows of contract terms data`);
      setContractTermsData(uploadedContractTermsData);
      toast.success(`Successfully loaded ${uploadedContractTermsData.length} contract terms`);
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
        {!showDashboard ? (
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
          />
        )}
      </div>
    </CampaignFilterProvider>
  );
};

export default Index;
