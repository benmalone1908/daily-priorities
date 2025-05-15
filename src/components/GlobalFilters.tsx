
import { useState } from "react";
import { MultiSelect } from "./MultiSelect";
import { FilterIcon } from "lucide-react";
import { useCampaignFilter } from "@/contexts/CampaignFilterContext";

interface GlobalFiltersProps {
  agencyOptions: any[];
  advertiserOptions: any[];
  campaignOptions: any[];
  selectedAgencies: string[];
  selectedAdvertisers: string[];
  selectedCampaigns: string[];
  onAgenciesChange: (selected: string[]) => void;
  onAdvertisersChange: (selected: string[]) => void;
  onCampaignsChange: (selected: string[]) => void;
}

const GlobalFilters = ({
  agencyOptions,
  advertiserOptions,
  campaignOptions,
  selectedAgencies,
  selectedAdvertisers,
  selectedCampaigns,
  onAgenciesChange,
  onAdvertisersChange,
  onCampaignsChange
}: GlobalFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="mt-4 mb-6 bg-muted/30 rounded-md">
      <div 
        className="flex items-center justify-between p-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <FilterIcon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Global Filters</h3>
        </div>
        <div className="text-sm text-muted-foreground">
          {selectedAgencies.length > 0 && `${selectedAgencies.length} agencies • `}
          {selectedAdvertisers.length > 0 && `${selectedAdvertisers.length} advertisers • `}
          {selectedCampaigns.length > 0 && `${selectedCampaigns.length} campaigns`}
          {selectedAgencies.length === 0 && selectedAdvertisers.length === 0 && selectedCampaigns.length === 0 && "No filters applied"}
        </div>
      </div>
      
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 pt-1 border-t">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Agency</div>
            <MultiSelect
              options={agencyOptions}
              selected={selectedAgencies}
              onChange={onAgenciesChange}
              placeholder="Select agencies"
              className="w-full"
            />
          </div>
          
          <div>
            <div className="text-xs text-muted-foreground mb-1">Advertiser</div>
            <MultiSelect
              options={advertiserOptions}
              selected={selectedAdvertisers}
              onChange={onAdvertisersChange}
              placeholder="Select advertisers"
              className="w-full"
            />
          </div>
          
          <div>
            <div className="text-xs text-muted-foreground mb-1">Campaign</div>
            <MultiSelect
              options={campaignOptions}
              selected={selectedCampaigns}
              onChange={onCampaignsChange}
              placeholder="Select campaigns"
              className="w-full"
              popoverClassName="w-[400px]"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalFilters;
