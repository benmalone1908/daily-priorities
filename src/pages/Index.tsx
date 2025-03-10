import { useState } from "react";
import { DateRange } from "react-day-picker";
import FileUpload from "@/components/FileUpload";
import Dashboard from "@/components/Dashboard";
import DateRangePicker from "@/components/DateRangePicker";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CampaignSparkCharts from "@/components/CampaignSparkCharts";
import { LayoutDashboard, ChartLine } from "lucide-react";

const Index = () => {
  const [data, setData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);

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

  const handleCampaignsChange = (selected: string[]) => {
    setSelectedCampaigns(selected);
  };

  return (
    <div className="container py-8 space-y-8">
      <div className="space-y-2 text-center animate-fade-in">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
          Marketing Anomaly Detector
        </h1>
        <p className="text-muted-foreground">
          Upload your campaign data to identify potential anomalies and trends
        </p>
      </div>

      {data.length === 0 && (
        <div className="max-w-2xl mx-auto">
          <FileUpload onDataLoaded={handleDataLoaded} />
        </div>
      )}

      {data.length > 0 && (
        <>
          <div className="max-w-sm mx-auto">
            <DateRangePicker 
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
          </div>
          
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
              <TabsTrigger value="dashboard">
                <LayoutDashboard className="mr-2" size={16} />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="sparks">
                <ChartLine className="mr-2" size={16} />
                Campaign Trends
              </TabsTrigger>
            </TabsList>
            <TabsContent value="dashboard">
              <Dashboard 
                data={filteredData} 
                selectedCampaigns={selectedCampaigns}
                onCampaignsChange={handleCampaignsChange}
              />
            </TabsContent>
            <TabsContent value="sparks">
              <CampaignSparkCharts data={data} dateRange={dateRange} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default Index;
