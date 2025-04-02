
import { useState } from "react";
import { DateRange } from "react-day-picker";
import FileUpload from "@/components/FileUpload";
import DateRangePicker from "@/components/DateRangePicker";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CampaignSparkCharts from "@/components/CampaignSparkCharts";
import { LayoutDashboard, ChartLine } from "lucide-react";
import DashboardWrapper from "@/components/DashboardWrapper";

const Index = () => {
  const [data, setData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedMetricsCampaigns, setSelectedMetricsCampaigns] = useState<string[]>([]);
  const [selectedRevenueCampaigns, setSelectedRevenueCampaigns] = useState<string[]>([]);
  const [selectedRevenueAdvertisers, setSelectedRevenueAdvertisers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("dashboard");

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
            const date = new Date(newRow.DATE);
            if (!isNaN(date.getTime())) {
              newRow.DATE = date.toISOString().split('T')[0];
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
      toast.success(`Successfully loaded ${processedData.length} rows of data`);
    } catch (error) {
      console.error("Error processing uploaded data:", error);
      toast.error("Failed to process the uploaded data");
    }
  };

  const getFilteredData = () => {
    if (!dateRange || !dateRange.from) {
      return data;
    }

    return data.filter(row => {
      try {
        const rowDate = new Date(row.DATE);
        if (isNaN(rowDate.getTime())) return false;
        
        if (dateRange.from && !dateRange.to) {
          const fromDate = new Date(dateRange.from);
          return rowDate >= fromDate;
        }
        
        if (dateRange.from && dateRange.to) {
          const fromDate = new Date(dateRange.from);
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          return rowDate >= fromDate && rowDate <= toDate;
        }
        
        return true;
      } catch (error) {
        console.error("Error filtering by date:", error);
        return false;
      }
    });
  };

  const filteredData = getFilteredData();

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
    
    const fromStr = `${fromDate.getMonth() + 1}/${fromDate.getDate()}/${fromDate.getFullYear()}`;
    const toStr = `${toDate.getMonth() + 1}/${toDate.getDate()}/${toDate.getFullYear()}`;
    
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
