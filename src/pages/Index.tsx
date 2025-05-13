
import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { DateRange } from "react-day-picker";
import FileUpload from "@/components/FileUpload";
import DateRangePicker from "@/components/DateRangePicker";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, ChartLine } from "lucide-react";
import { setToStartOfDay, setToEndOfDay, logDateDetails, normalizeDate, parseDateString } from "@/lib/utils";
import { CampaignFilterProvider, useCampaignFilter } from "@/contexts/CampaignFilterContext";
import { SpendSettingsProvider } from "@/contexts/SpendSettingsContext";
import { CampaignStatusToggle } from "@/components/CampaignStatusToggle";

// Lazy load heavy components
const DashboardWrapper = lazy(() => import("@/components/DashboardWrapper"));
const CampaignSparkCharts = lazy(() => import("@/components/CampaignSparkCharts"));

// Define AggregatedSparkCharts as a separate component to lazy load
const AggregatedSparkCharts = lazy(() => 
  import("./components/AggregatedSparkCharts").then(module => ({ default: module.default }))
);

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

// Loading fallback component
const LoadingFallback = () => (
  <div className="w-full py-12 flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

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
  const [activeTab, setActiveTab] = useState("dashboard");
  
  const { showLiveOnly } = useCampaignFilter();

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

  const filteredData = useMemo(() => getFilteredData(), [data, dateRange]);
  
  const filteredDataByLiveStatus = useMemo(() => {
    if (!showLiveOnly) return filteredData;

    const mostRecentDate = getMostRecentDate();
    if (!mostRecentDate) return filteredData;

    console.log('Filtering for campaigns active on most recent date:', mostRecentDate);
    
    // First get all the campaigns that have impressions on the most recent date
    const activeCampaignsOnMostRecentDate = new Set<string>();
    
    filteredData.forEach(row => {
      if (row.DATE === mostRecentDate && Number(row.IMPRESSIONS) > 0) {
        activeCampaignsOnMostRecentDate.add(row["CAMPAIGN ORDER NAME"]);
      }
    });
    
    console.log(`Found ${activeCampaignsOnMostRecentDate.size} active campaigns on most recent date`);
    
    // Now filter to include all dates, but only for campaigns active on most recent date
    const liveData = filteredData.filter(row => {
      if (row.DATE === 'Totals') return true;
      return activeCampaignsOnMostRecentDate.has(row["CAMPAIGN ORDER NAME"]);
    });
    
    console.log(`Filtered from ${filteredData.length} rows to ${liveData.length} live campaign rows`);
    return liveData;
  }, [filteredData, showLiveOnly]);

  const getFilteredDataBySelectedCampaigns = (campaigns: string[]) => {
    if (!campaigns.length) return filteredDataByLiveStatus;
    return filteredDataByLiveStatus.filter(row => campaigns.includes(row["CAMPAIGN ORDER NAME"]));
  };

  const getFilteredDataByAdvertisers = (advertisers: string[]) => {
    if (!advertisers.length) return filteredDataByLiveStatus;
    return filteredDataByLiveStatus.filter(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      const match = campaignName.match(/SM:\s+([^-]+)/);
      const advertiser = match ? match[1].trim() : "";
      return advertisers.includes(advertiser);
    });
  };

  const getFilteredDataByCampaignsAndAdvertisers = (campaigns: string[], advertisers: string[]) => {
    let filtered = filteredDataByLiveStatus;
    
    if (advertisers.length > 0) {
      filtered = getFilteredDataByAdvertisers(advertisers);
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

  return (
    <>
      <div className="border-b animate-fade-in">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img 
              src="/lovable-uploads/8d86c84a-0c96-4897-8d80-48ae466c4000.png" 
              alt="Display Campaign Monitor" 
              className="h-14 w-auto"
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
              displayDateRangeSummary={!!dateRange?.from}
              dateRangeSummaryText={getDateRangeDisplayText()}
            />
          </div>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsContent value="dashboard">
          <Suspense fallback={<LoadingFallback />}>
            <DashboardWrapper 
              data={showLiveOnly ? filteredDataByLiveStatus : filteredData} 
              metricsData={getFilteredDataBySelectedCampaigns(selectedMetricsCampaigns)}
              revenueData={getFilteredDataByCampaignsAndAdvertisers(selectedRevenueCampaigns, selectedRevenueAdvertisers)}
              selectedMetricsCampaigns={selectedMetricsCampaigns}
              selectedRevenueCampaigns={selectedRevenueCampaigns}
              selectedRevenueAdvertisers={selectedRevenueAdvertisers}
              onMetricsCampaignsChange={handleMetricsCampaignsChange}
              onRevenueCampaignsChange={handleRevenueCampaignsChange}
              onRevenueAdvertisersChange={handleRevenueAdvertisersChange}
            />
          </Suspense>
        </TabsContent>
        <TabsContent value="sparks">
          <Suspense fallback={<LoadingFallback />}>
            <AggregatedSparkCharts 
              data={filteredDataByLiveStatus.filter(row => row.DATE !== 'Totals')}
            />
            <CampaignSparkCharts data={showLiveOnly ? filteredDataByLiveStatus : filteredData} dateRange={dateRange} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </>
  );
};

const Index = () => {
  const [data, setData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [dataSize, setDataSize] = useState<number>(0);

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
      
      // Track data size for performance warnings
      setDataSize(data.length);
    }
  }, [data]);

  const handleDataLoaded = (uploadedData: any[]) => {
    try {
      if (!Array.isArray(uploadedData) || uploadedData.length === 0) {
        toast.error("Invalid data format received");
        return;
      }
      
      console.log(`Loaded ${uploadedData.length} rows of data`);
      
      const requiredFields = ["DATE", "CAMPAIGN ORDER NAME", "IMPRESSIONS", "CLICKS", "REVENUE"];
      
      if (uploadedData[0]) {
        const missingFields = requiredFields.filter(field => 
          !Object.keys(uploadedData[0]).some(key => key.toUpperCase() === field)
        );
        
        if (missingFields.length > 0) {
          toast.error(`Missing required fields: ${missingFields.join(", ")}`);
          return;
        }
      }
      
      // Warn user about large datasets
      if (uploadedData.length > 5000) {
        toast.warning(`Large dataset detected (${uploadedData.length} rows). Some visualizations may be slower to load.`);
      }
      
      const processedData = uploadedData.map(row => {
        const newRow = { ...row };
        
        if (newRow.DATE) {
          try {
            const date = parseDateString(newRow.DATE);
            if (date) {
              newRow.DATE = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
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
      <SpendSettingsProvider>
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
      </SpendSettingsProvider>
    </CampaignFilterProvider>
  );
};

export default Index;
