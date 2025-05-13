
import { ViewMode } from "@/types/campaigns";
import { MultiSelect } from "./MultiSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SparkChartFiltersProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedCampaigns: string[];
  setSelectedCampaigns: (selected: string[]) => void;
  selectedAdvertisers: string[];
  setSelectedAdvertisers: (selected: string[]) => void;
  advertiserOptions: { value: string; label: string }[];
  campaignOptions: { value: string; label: string }[];
}

const SparkChartFilters = ({
  viewMode,
  setViewMode,
  selectedCampaigns,
  setSelectedCampaigns,
  selectedAdvertisers,
  setSelectedAdvertisers,
  advertiserOptions,
  campaignOptions
}: SparkChartFiltersProps) => {
  return (
    <div className="flex justify-between items-center gap-4 mb-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">View by:</span>
        <Select
          value={viewMode}
          onValueChange={(value: ViewMode) => setViewMode(value)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Select view" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="campaign">Campaign</SelectItem>
            <SelectItem value="advertiser">Advertiser</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-muted-foreground">Filter by:</span>
        
        <div className="flex items-center gap-2">
          <MultiSelect
            options={advertiserOptions}
            selected={selectedAdvertisers}
            onChange={setSelectedAdvertisers}
            placeholder="Advertiser"
            className="w-[200px]"
          />
          
          <MultiSelect
            options={campaignOptions}
            selected={selectedCampaigns}
            onChange={setSelectedCampaigns}
            placeholder="Campaign"
            className="w-[200px]"
            popoverClassName="w-[400px]"
          />
        </div>
      </div>
    </div>
  );
};

export default SparkChartFilters;
