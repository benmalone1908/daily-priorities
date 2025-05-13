
import { useState } from "react";
import { toast } from "sonner";
import { CampaignFilterProvider } from "@/contexts/CampaignFilterContext";
import { SpendSettingsProvider } from "@/contexts/SpendSettingsContext";
import InitialUpload from "@/components/InitialUpload";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardContent from "@/components/DashboardContent";
import { useDataProcessor } from "@/hooks/useDataProcessor";

const Index = () => {
  const [rawData, setRawData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const { data, dateRange, setDateRange } = useDataProcessor(rawData);

  const handleDataLoaded = (uploadedData: any[]) => {
    try {
      setRawData(uploadedData);
      toast.success(`Successfully loaded ${uploadedData.length} rows of data`);
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
            <InitialUpload onDataLoaded={handleDataLoaded} />
          ) : (
            <>
              <DashboardHeader 
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                showLiveOnly={true} // This will come from context
                filteredDataCount={data.length}
              />
              
              <DashboardContent 
                data={data}
                dateRange={dateRange}
                activeTab={activeTab}
              />
            </>
          )}
        </div>
      </SpendSettingsProvider>
    </CampaignFilterProvider>
  );
};

export default Index;
