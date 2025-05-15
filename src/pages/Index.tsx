import { useState, useEffect, useMemo } from "react";
import { DateRange } from "react-day-picker";
import FileUpload from "@/components/FileUpload";
import DateRangePicker from "@/components/DateRangePicker";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CampaignSparkCharts from "@/components/CampaignSparkCharts";
import { LayoutDashboard, ChartLine } from "lucide-react";
import DashboardWrapper from "@/components/DashboardWrapper";
import { setToStartOfDay, setToEndOfDay, logDateDetails, normalizeDate, parseDateString } from "@/lib/utils";
import { CampaignFilterProvider, useCampaignFilter, AGENCY_MAPPING } from "@/contexts/CampaignFilterContext";
import { CampaignStatusToggle } from "@/components/CampaignStatusToggle";
import { Card } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, Tooltip, AreaChart, Area, XAxis, YAxis } from "recharts";
import { getColorClasses } from "@/utils/anomalyColors";
import { TrendingDown, TrendingUp, Maximize, Eye, MousePointer, ShoppingCart, DollarSign, Percent } from "lucide-react";
import SparkChartModal from "@/components/SparkChartModal";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

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

  // Group data by date for time series
  const timeSeriesData = useMemo(() => {
    const dateGroups: Record<string, any> = {};
    
    data.forEach(row => {
      if (!row || !row.DATE || row.DATE === 'Totals') return;
      
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
      
      dateGroups[dateStr].IMPRESSIONS += Number(row.IMPRESSIONS) || 0;
      dateGroups[dateStr].CLICKS += Number(row.CLICKS) || 0;
      dateGroups[dateStr].REVENUE += Number(row.REVENUE) || 0;
      dateGroups[dateStr].TRANSACTIONS += Number(row.TRANSACTIONS) || 0;
      dateGroups[dateStr].SPEND += Number(row.SPEND) || 0;
    });
    
    return Object.values(dateGroups).sort((a: any, b: any) => {
      try {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } catch (err) {
        return 0;
      }
    });
  }, [data]);
  
  // Calculate totals
  const totals = useMemo(() => {
    let impressions = 0;
    let clicks = 0;
    let revenue = 0;
    let transactions = 0;
    let spend = 0;
    
    timeSeriesData.forEach(day => {
      impressions += Number(day.IMPRESSIONS) || 0;
      clicks += Number(day.CLICKS) || 0;
      revenue += Number(day.REVENUE) || 0;
      transactions += Number(day.TRANSACTIONS) || 0;
      spend += Number(day.SPEND) || 0;
    });
    
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const roas = spend > 0 ? revenue / spend : 0;
    
    return { impressions, clicks, ctr, revenue, transactions, spend, roas };
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
        <h3 className="text-lg font-semibold">All Campaigns</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
  dateRange, 
  onDateRangeChange 
}: { 
  data: any[]; 
  dateRange: DateRange | undefined; 
  onDateRangeChange: (range: DateRange | undefined) => void; 
}) => {
  const [selectedMetricsCampaigns, setSelectedMetricsCampaigns] = useState<string[]>([]);
  const [selectedRevenueCampaigns, setSelectedRevenueCampaigns] = useState<string[]>([]);
  const [selectedRevenueAdvertisers, setSelectedRevenueAdvertisers] = useState<string[]>([]);
  const [selectedRevenueAgencies, setSelectedRevenueAgencies] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedWeeklyCampaigns, setSelectedWeeklyCampaigns] = useState<string[]>([]);
  // Add new state variables for metrics filters
  const [selectedMetricsAdvertisers, setSelectedMetricsAdvertisers] = useState<string[]>([]);
  const [selectedMetricsAgencies, setSelectedMetricsAgencies] = useState<string[]>([]);
  
  const { showLiveOnly, extractAdvertiserName, isTestCampaign, extractAgencyInfo } = useCampaignFilter();

  const getMostRecentDate = () => {
    if (!data || data.length === 0) return null;
    const dates = data
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
      return filtered;
    }

    const fromDate = setToStartOfDay(dateRange.from);
    const toDate = dateRange.to ? setToEndOfDay(dateRange.to) : setToEndOfDay(new Date());
    
    logDateDetails("Filtering data with from date", fromDate);
    logDateDetails("Filtering data with to date", toDate);
    
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
        
        const isAfterFrom = rowDate >= fromDate;
        const isBeforeTo = rowDate <= toDate;
        
        return isAfterFrom && isBeforeTo;
      } catch (error) {
        console.error(`Error filtering by date for row ${JSON.stringify(row)}:`, error);
        return false;
      }
    });

    return filtered;
  };

  const filteredData = getFilteredData();
  
  const filteredDataByLiveStatus = useMemo(() => {
    if (!showLiveOnly) return filteredData;

    const mostRecentDate = getMostRecentDate();
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

  const getFilteredDataBySelectedCampaigns = (campaigns: string[]) => {
    if (!campaigns.length) return filteredDataByLiveStatus;
    return filteredDataByLiveStatus.filter(row => campaigns.includes(row["CAMPAIGN ORDER NAME"]));
  };

  const getFilteredDataByAdvertisers = (advertisers: string[]) => {
    if (!advertisers.length) return filteredDataByLiveStatus;
    return filteredDataByLiveStatus.filter(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      const advertiser = extractAdvertiserName(campaignName);
      return advertisers.includes(advertiser);
    });
  };

  const getFilteredDataByAgencies = (agencies: string[]) => {
    if (!agencies.length) return filteredDataByLiveStatus;
    return filteredDataByLiveStatus.filter(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      const { agency } = extractAgencyInfo(campaignName);
      return agencies.includes(agency);
    });
  };

  const getFilteredDataByCampaignsAndAdvertisersAndAgencies = (
    campaigns: string[], 
    advertisers: string[], 
    agencies: string[]
  ) => {
    let filtered = filteredDataByLiveStatus;
    
    if (agencies.length > 0) {
      filtered = getFilteredDataByAgencies(agencies);
    }
    
    if (advertisers.length > 0) {
      filtered = filtered.filter(row => {
        const campaignName = row["CAMPAIGN ORDER NAME"] || "";
        const advertiser = extractAdvertiserName(campaignName);
        return advertisers.includes(advertiser);
      });
    }
    
    if (campaigns.length > 0) {
      return filtered.filter(row => campaigns.includes(row["CAMPAIGN ORDER NAME"]));
    }
    
    return filtered;
  };

  const handleMetricsCampaignsChange = (selected: string[]) => {
    setSelectedMetricsCampaigns(selected);
  };

  const handleRevenueCampaignsChange = (selected: string[]) => {
    setSelectedRevenueCampaigns(selected);
  };

  const handleRevenueAdvertisersChange = (selected: string[]) => {
    setSelectedRevenueAdvertisers(selected);
    
    // Reset campaigns when advertisers change
    setSelectedRevenueCampaigns([]);
  };

  const handleRevenueAgenciesChange = (selected: string[]) => {
    setSelectedRevenueAgencies(selected);
    
    // Reset advertisers and campaigns when agencies change
    setSelectedRevenueAdvertisers([]);
    setSelectedRevenueCampaigns([]);
  };

  // Add handlers for metrics advertisers and agencies
  const handleMetricsAdvertisersChange = (selected: string[]) => {
    setSelectedMetricsAdvertisers(selected);
    // Reset campaigns when advertisers change
    setSelectedMetricsCampaigns([]);
  };

  const handleMetricsAgenciesChange = (selected: string[]) => {
    setSelectedMetricsAgencies(selected);
    // Reset advertisers and campaigns when agencies change
    setSelectedMetricsAdvertisers([]);
    setSelectedMetricsCampaigns([]);
  };

  const handleWeeklyCampaignsChange = (selected: string[]) => {
    setSelectedWeeklyCampaigns(selected);
  };

  const getDateRangeDisplayText = () => {
    if (!dateRange || !dateRange.from) return null;
    
    const fromDate = dateRange.from;
    const toDate = dateRange.to || fromDate;
    
    const fromStr = `${fromDate.getMonth() + 1}/${fromDate.getDate()}/${fromDate.getFullYear()}`;
    const toStr = `${toDate.getMonth() + 1}/${toDate.getDate()}/${toDate.getFullYear()}`;
    
    const recordCount = showLiveOnly ? filteredDataByLiveStatus.length : filteredData.length;
    
    return `Showing data for: ${fromStr} to ${toStr} (${recordCount} records)`;
  };

  const dateRangeSummary = getDateRangeDisplayText();

  return (
    <>
      <div className="border-b animate-fade-in">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img 
              src="/lovable-uploads/7653cd45-6cfe-4e1c-89a4-cb182393e54b.png" 
              alt="Display Campaign Monitor" 
              className="h-[75px] w-auto"
            />
            <h1 className="text-2xl font-bold">Display Campaign Monitor</h1>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-6">
            <CampaignStatusToggle />
            <Tabs defaultValue="dashboard" className="w-full md:w-auto" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dashboard">
                  <LayoutDashboard className="mr-2" size={16} />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="sparks">
                  <ChartLine className="mr-2" size={16} />
                  Trends
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <DateRangePicker 
              dateRange={dateRange}
              onDateRangeChange={onDateRangeChange}
              displayDateRangeSummary={false}
            />
          </div>
        </div>
      </div>
      
      {dateRangeSummary && (
        <div className="flex justify-end my-2 text-xs text-muted-foreground">
          {dateRangeSummary}
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsContent value="dashboard">
          <DashboardWrapper 
            data={showLiveOnly ? filteredDataByLiveStatus : filteredData} 
            metricsData={getFilteredDataByCampaignsAndAdvertisersAndAgencies(
              selectedMetricsCampaigns,
              selectedMetricsAdvertisers,
              selectedMetricsAgencies
            )}
            revenueData={getFilteredDataByCampaignsAndAdvertisersAndAgencies(
              selectedRevenueCampaigns, 
              selectedRevenueAdvertisers,
              selectedRevenueAgencies
            )}
            selectedMetricsCampaigns={selectedMetricsCampaigns}
            selectedRevenueCampaigns={selectedRevenueCampaigns}
            selectedRevenueAdvertisers={selectedRevenueAdvertisers}
            selectedRevenueAgencies={selectedRevenueAgencies}
            onMetricsCampaignsChange={handleMetricsCampaignsChange}
            onRevenueCampaignsChange={handleRevenueCampaignsChange}
            onRevenueAdvertisersChange={handleRevenueAdvertisersChange}
            onRevenueAgenciesChange={handleRevenueAgenciesChange}
            selectedWeeklyCampaigns={selectedWeeklyCampaigns}
            onWeeklyCampaignsChange={handleWeeklyCampaignsChange}
            // Add new props for metrics filters
            selectedMetricsAdvertisers={selectedMetricsAdvertisers}
            selectedMetricsAgencies={selectedMetricsAgencies}
            onMetricsAdvertisersChange={handleMetricsAdvertisersChange}
            onMetricsAgenciesChange={handleMetricsAgenciesChange}
          />
        </TabsContent>
        <TabsContent value="sparks">
          <AggregatedSparkCharts 
            data={filteredDataByLiveStatus.filter(row => row.DATE !== 'Totals')}
          />
          <CampaignSparkCharts data={showLiveOnly ? filteredDataByLiveStatus : filteredData} dateRange={dateRange} />
        </TabsContent>
      </Tabs>
    </>
  );
};

const Index = () => {
  const [data, setData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

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

  return (
    <CampaignFilterProvider>
      <div className="container py-8 space-y-8">
        {data.length === 0 ? (
          <>
            <div className="space-y-2 text-center animate-fade-in">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                Display Campaign Monitor
              </h1>
              <p className="text-muted-foreground">
                Upload your campaign data to identify potential anomalies and trends
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <FileUpload onDataLoaded={handleDataLoaded} />
            </div>
          </>
        ) : (
          <DashboardContent 
            data={data} 
            dateRange={dateRange} 
            onDateRangeChange={setDateRange} 
          />
        )}
      </div>
    </CampaignFilterProvider>
  );
};

export default Index;
