import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import FileUpload from "@/components/FileUpload";
import DateRangePicker from "@/components/DateRangePicker";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CampaignSparkCharts from "@/components/CampaignSparkCharts";
import { LayoutDashboard, ChartLine } from "lucide-react";
import DashboardWrapper from "@/components/DashboardWrapper";
import { 
  setToStartOfDay, 
  setToEndOfDay, 
  logDateDetails, 
  formatDateToDisplay,
  createConsistentDate,
  parseCsvDate,
  dateToComparableNumber
} from "@/lib/utils";

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
            const minDateStr = uniqueDates[0];
            const maxDateStr = uniqueDates[uniqueDates.length - 1];
            
            // Create dates using consistent noon time to avoid timezone issues
            const minDate = createConsistentDate(minDateStr);
            const maxDate = createConsistentDate(maxDateStr);
            
            if (!isNaN(minDate.getTime()) && !isNaN(maxDate.getTime())) {
              setDateRange({ from: minDate, to: maxDate });
              console.log(`Auto-set date range: ${minDate.toISOString()} to ${maxDate.toISOString()}`);
              console.log(`Formatted display dates: ${formatDateToDisplay(minDate)} to ${formatDateToDisplay(maxDate)}`);
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
      
      setData(uploadedData);
      
      // Log date range in the data to confirm it's correct
      const dates = uploadedData.map(row => row.DATE).filter(Boolean).sort();
      if (dates.length > 0) {
        console.log(`Data date range: ${dates[0]} to ${dates[dates.length-1]}`);
        console.log(`Total unique dates: ${new Set(dates).size}`);
        
        // Sample some dates to see format
        console.log("Sample dates from dataset:", dates.slice(0, 5));
        
        // Log rows per date
        const dateCounts: Record<string, number> = {};
        uploadedData.forEach(row => {
          dateCounts[row.DATE] = (dateCounts[row.DATE] || 0) + 1;
        });
        console.log("Rows per date:", dateCounts);
      }
      
      toast.success(`Successfully loaded ${uploadedData.length} rows of data`);
    } catch (error) {
      console.error("Error processing uploaded data:", error);
      toast.error("Failed to process the uploaded data");
    }
  };

  const getFilteredData = () => {
    if (!dateRange || !dateRange.from) {
      return data;
    }

    // Enhanced date filtering with better logging and numerical comparison
    const fromDate = formatDateToDisplay(setToStartOfDay(dateRange.from));
    const toDate = dateRange.to ? formatDateToDisplay(setToEndOfDay(dateRange.to)) : formatDateToDisplay(setToEndOfDay(new Date()));
    
    console.log(`Filtering data from ${fromDate} to ${toDate}`);
    
    // Convert range dates to comparable numbers
    const fromNum = dateToComparableNumber(fromDate);
    const toNum = dateToComparableNumber(toDate);
    
    console.log(`Comparable date numbers - from: ${fromNum}, to: ${toNum}`);
    
    const filteredRows = data.filter(row => {
      try {
        if (!row.DATE) {
          console.warn(`Row missing DATE: ${JSON.stringify(row)}`);
          return false;
        }
        
        // Ensure date is in MM/DD/YYYY format
        const normalizedDate = parseCsvDate(row.DATE);
        if (!normalizedDate) {
          console.warn(`Invalid date in row: ${row.DATE}`);
          return false;
        }
        
        // Convert row date to comparable number
        const rowNum = dateToComparableNumber(normalizedDate);
        
        // Log for specific dates to help debug
        if (normalizedDate === '3/24/2025' || normalizedDate === '4/20/2025') {
          console.log(`Comparing row date ${normalizedDate} (${rowNum}) with range: ${fromNum}-${toNum}`);
          console.log(`isAfterFrom=${rowNum >= fromNum}, isBeforeTo=${rowNum <= toNum}`);
        }
        
        return rowNum >= fromNum && rowNum <= toNum;
      } catch (error) {
        console.error(`Error filtering by date for row ${JSON.stringify(row)}:`, error);
        return false;
      }
    });
    
    // Log filtered data statistics
    console.log(`Filtered ${filteredRows.length} rows from ${data.length} total`);
    if (filteredRows.length > 0) {
      const dates = Array.from(new Set(filteredRows.map(row => row.DATE))).sort();
      console.log(`Filtered date range: ${dates[0]} to ${dates[dates.length-1]}`);
    }
    
    return filteredRows;
  };

  const filteredData = getFilteredData();

  // Helper functions for filtering data by campaigns and advertisers
  const getFilteredDataBySelectedCampaigns = (campaigns: string[]) => {
    if (!campaigns.length) return filteredData;
    return filteredData.filter(row => campaigns.includes(row["CAMPAIGN ORDER NAME"]));
  };

  const getFilteredDataByAdvertisers = (advertisers: string[]) => {
    if (!advertisers.length) return filteredData;
    return filteredData.filter(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      const match = campaignName.match(/SM:\s+([^-]+)/);
      const advertiser = match ? match[1].trim() : "";
      return advertisers.includes(advertiser);
    });
  };

  const getFilteredDataByCampaignsAndAdvertisers = (campaigns: string[], advertisers: string[]) => {
    let filtered = filteredData;
    
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
    
    // Use the formatDateToDisplay utility function for consistent date formatting
    const fromStr = formatDateToDisplay(fromDate);
    const toStr = formatDateToDisplay(toDate);
    
    return `Showing data for: ${fromStr} to ${toStr} (${filteredData.length} records)`;
  };

  return (
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
  );
};

export default Index;
