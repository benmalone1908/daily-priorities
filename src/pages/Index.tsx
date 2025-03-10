
import { useState, useMemo } from "react";
import { DateRange } from "react-day-picker";
import FileUpload from "@/components/FileUpload";
import Dashboard from "@/components/Dashboard";
import DateRangePicker from "@/components/DateRangePicker";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CampaignSparkCharts from "@/components/CampaignSparkCharts";
import { LayoutDashboard, ChartLine } from "lucide-react";
import { MultiSelect, Option } from "@/components/MultiSelect";

const Index = () => {
  const [data, setData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);

  const handleDataLoaded = (uploadedData: any[]) => {
    try {
      // Validate data format before setting it
      if (!Array.isArray(uploadedData) || uploadedData.length === 0) {
        toast.error("Invalid data format received");
        return;
      }
      
      console.log(`Loaded ${uploadedData.length} rows of data`);
      
      // Further validation - check if we have necessary fields in at least the first row
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
      
      // Process dates to ensure they're in a standard format
      const processedData = uploadedData.map(row => {
        // Create a new object to avoid mutating the original
        const newRow = { ...row };
        
        // Ensure DATE is a string in YYYY-MM-DD format
        if (newRow.DATE) {
          try {
            const date = new Date(newRow.DATE);
            if (!isNaN(date.getTime())) {
              // Format as YYYY-MM-DD
              newRow.DATE = date.toISOString().split('T')[0];
            }
          } catch (e) {
            console.error("Error parsing date:", e);
            // Keep the original date if parsing fails
          }
        }
        
        // Ensure numerical fields are numbers
        ["IMPRESSIONS", "CLICKS", "TRANSACTIONS", "REVENUE", "SPEND"].forEach(field => {
          const normalizedField = Object.keys(newRow).find(key => key.toUpperCase() === field);
          if (normalizedField) {
            newRow[normalizedField] = Number(newRow[normalizedField]) || 0;
          }
        });
        
        return newRow;
      });
      
      setData(processedData);
      
      // Set all campaigns as selected by default
      const uniqueCampaigns = Array.from(new Set(processedData.map(row => row["CAMPAIGN ORDER NAME"]))).filter(Boolean);
      setSelectedCampaigns(uniqueCampaigns);
      
      toast.success(`Successfully loaded ${processedData.length} rows of data`);
    } catch (error) {
      console.error("Error processing uploaded data:", error);
      toast.error("Failed to process the uploaded data");
    }
  };

  const getFilteredData = () => {
    if (!data || data.length === 0) return [];
    
    let filtered = [...data];
    
    // Filter by date if dateRange is provided
    if (dateRange && dateRange.from) {
      filtered = filtered.filter(row => {
        try {
          const rowDate = new Date(row.DATE);
          if (isNaN(rowDate.getTime())) return false;
          
          // If only from date is selected
          if (dateRange.from && !dateRange.to) {
            const fromDate = new Date(dateRange.from);
            return rowDate >= fromDate;
          }
          
          // If both from and to dates are selected
          if (dateRange.from && dateRange.to) {
            const fromDate = new Date(dateRange.from);
            const toDate = new Date(dateRange.to);
            // Set toDate to end of day for inclusive filtering
            toDate.setHours(23, 59, 59, 999);
            return rowDate >= fromDate && rowDate <= toDate;
          }
          
          return true;
        } catch (error) {
          console.error("Error filtering by date:", error);
          return false;
        }
      });
    }
    
    // Filter by selected campaigns
    if (selectedCampaigns.length > 0 && selectedCampaigns.length < campaignOptions.length) {
      filtered = filtered.filter(row => selectedCampaigns.includes(row["CAMPAIGN ORDER NAME"]));
    }
    
    return filtered;
  };

  const campaignOptions: Option[] = useMemo(() => {
    if (!data || !data.length) return [];
    return Array.from(new Set(data.map(row => row["CAMPAIGN ORDER NAME"])))
      .filter(Boolean)
      .sort()
      .map(campaign => ({
        value: campaign,
        label: campaign
      }));
  }, [data]);

  const filteredData = getFilteredData();

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
          <div className="flex flex-col sm:flex-row gap-4 max-w-4xl mx-auto">
            <div className="flex-1">
              <DateRangePicker 
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
            </div>
            <div className="flex-1">
              <MultiSelect
                options={campaignOptions}
                selected={selectedCampaigns}
                onChange={setSelectedCampaigns}
                placeholder="Select campaigns"
              />
            </div>
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
                allCampaigns={campaignOptions.map(opt => opt.value)}
                selectedCampaigns={selectedCampaigns}
                onCampaignsChange={setSelectedCampaigns}
              />
            </TabsContent>
            <TabsContent value="sparks">
              <CampaignSparkCharts 
                data={data} 
                dateRange={dateRange}
                selectedCampaigns={selectedCampaigns}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default Index;
