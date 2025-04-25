import { useState, useEffect, useMemo } from "react";
import { DateRange } from "react-day-picker";
import FileUpload from "@/components/FileUpload";
import DateRangePicker from "@/components/DateRangePicker";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CampaignSparkCharts from "@/components/CampaignSparkCharts";
import { LayoutDashboard, ChartLine } from "lucide-react";
import DashboardWrapper from "@/components/DashboardWrapper";
import { setToStartOfDay, setToEndOfDay, logDateDetails, normalizeDate } from "@/lib/utils";
import { CampaignFilterProvider } from "@/contexts/CampaignFilterContext";
import { CampaignStatusToggle } from "@/components/CampaignStatusToggle";

const Index = () => {
  const [data, setData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedMetricsCampaigns, setSelectedMetricsCampaigns] = useState<string[]>([]);
  const [selectedRevenueCampaigns, setSelectedRevenueCampaigns] = useState<string[]>([]);
  const [selectedRevenueAdvertisers, setSelectedRevenueAdvertisers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    if (data.length > 0) {
      // Log dates in the dataset for debugging
      const uniqueDates = Array.from(new Set(data.map(row => row.DATE))).sort();
      console.log(`Dataset has ${uniqueDates.length} unique dates:`, uniqueDates);
      
      if (uniqueDates.length > 0) {
        console.log(`Date range in dataset: ${uniqueDates[0]} to ${uniqueDates[uniqueDates.length - 1]}`);
        // Log counts per date
        const dateCounts: Record<string, number> = {};
        data.forEach(row => {
          dateCounts[row.DATE] = (dateCounts[row.DATE] || 0) + 1;
        });
        console.log("Rows per date:", dateCounts);
        
        // Auto-set date range to include full dataset if not already set
        if (!dateRange || !dateRange.from) {
          try {
            const minDate = new Date(uniqueDates[0]);
            const maxDate = new Date(uniqueDates[uniqueDates.length - 1]);
            if (!isNaN(minDate.getTime()) && !isNaN(maxDate.getTime())) {
              setDateRange({ from: minDate, to: maxDate });
              console.log(`Auto-set date range: ${minDate.toISOString()} to ${maxDate.toISOString()}`);
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
      
      const processedData = uploadedData.map(row => {
        const newRow = { ...row };
        
        if (newRow.DATE) {
          try {
            // Enhanced date handling
            const date = new Date(newRow.DATE);
            if (!isNaN(date.getTime())) {
              // Store date as YYYY-MM-DD, ensuring consistent format
              newRow.DATE = normalizeDate(date);
              // Log April dates for debugging
              if (newRow.DATE.includes('-04-09') || newRow.DATE.includes('-04-08')) {
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
      
      // Log date range in the processed data
      const dates = processedData.map(row => row.DATE).filter(Boolean).sort();
      if (dates.length > 0) {
        console.log(`Data date range: ${dates[0]} to ${dates[dates.length-1]}`);
        console.log(`Total unique dates: ${new Set(dates).size}`);
        
        // Log rows per date
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

  const getFilteredData = () => {
    let filtered = data;
    
    if (!dateRange || !dateRange.from) {
      return filtered;
    }

    // Enhanced date filtering with better logging
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
        
        // Normalize the date format
        const normalizedDateStr = normalizeDate(row.DATE);
        if (!normalizedDateStr) return false;
        
        const rowDate = new Date(`${normalizedDateStr}T12:00:00`); // Use noon to avoid timezone issues
        if (isNaN(rowDate.getTime())) {
          console.warn(`Invalid date in row: ${row.DATE}`);
          return false;
        }
        
        // Check if date is in range (inclusive)
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

  const getMostRecentDate = () => {
    if (!data || data.length === 0) return null;
    const dates = data.map(row => row.DATE).filter(Boolean).sort();
    return dates[dates.length - 1];
  };

  const filteredData = getFilteredData();
  const filteredDataByLiveStatus = useMemo(() => {
    const { showLiveOnly } = useCampaignFilter();
    if (!showLiveOnly) return filteredData;

    const mostRecentDate = getMostRecentDate();
    if (!mostRecentDate) return filteredData;

    console.log('Filtering for live campaigns with most recent date:', mostRecentDate);
    return filteredData.filter(row => row.DATE === mostRecentDate);
  }, [filteredData]);

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
    
    return `Showing data for: ${fromStr} to ${toStr} (${filteredData.length} records)`;
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
                    onDateRangeChange={setDateRange}
                    displayDateRangeSummary={!!dateRange?.from}
                    dateRangeSummaryText={getDateRangeDisplayText()}
                  />
                </div>
              </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsContent value="dashboard">
                <DashboardWrapper 
                  data={filteredData} 
                  metricsData={getFilteredDataBySelectedCampaigns(selectedMetricsCampaigns)}
                  revenueData={getFilteredDataByCampaignsAndAdvertisers(selectedRevenueCampaigns, selectedRevenueAdvertisers)}
                  selectedMetricsCampaigns={selectedMetricsCampaigns}
                  selectedRevenueCampaigns={selectedRevenueCampaigns}
                  selectedRevenueAdvertisers={selectedRevenueAdvertisers}
                  onMetricsCampaignsChange={handleMetricsCampaignsChange}
                  onRevenueCampaignsChange={handleRevenueCampaignsChange}
                  onRevenueAdvertisersChange={handleRevenueAdvertisersChange}
                />
              </TabsContent>
              <TabsContent value="sparks">
                <CampaignSparkCharts data={filteredData} dateRange={dateRange} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </CampaignFilterProvider>
  );
};

export default Index;
