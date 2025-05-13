
import SparkChartFilters from "./SparkChartFilters";
import { ViewMode } from "@/types/campaigns";

interface EmptySparkChartStateProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedCampaigns: string[];
  setSelectedCampaigns: (selected: string[]) => void;
  selectedAdvertisers: string[];
  setSelectedAdvertisers: (selected: string[]) => void;
  advertiserOptions: { value: string; label: string }[];
  campaignOptions: { value: string; label: string }[];
}

const EmptySparkChartState = ({
  viewMode,
  setViewMode,
  selectedCampaigns,
  setSelectedCampaigns,
  selectedAdvertisers,
  setSelectedAdvertisers,
  advertiserOptions,
  campaignOptions
}: EmptySparkChartStateProps) => {
  return (
    <div className="space-y-4">
      <SparkChartFilters
        viewMode={viewMode}
        setViewMode={setViewMode}
        selectedCampaigns={selectedCampaigns}
        setSelectedCampaigns={setSelectedCampaigns}
        selectedAdvertisers={selectedAdvertisers}
        setSelectedAdvertisers={setSelectedAdvertisers}
        advertiserOptions={advertiserOptions}
        campaignOptions={campaignOptions}
      />
      
      <div className="text-center py-20 bg-muted/30 rounded-lg">
        <p className="text-muted-foreground">No data available for the selected date range</p>
        <p className="text-sm text-muted-foreground mt-2">Try adjusting the date filter or campaign selection</p>
      </div>
    </div>
  );
};

export default EmptySparkChartState;
