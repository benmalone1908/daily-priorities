
import { useState } from "react";
import { MultiSelect, Option } from "./MultiSelect";
import { useCampaignFilter } from "@/contexts/use-campaign-filter";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface GlobalFiltersProps {
  agencyOptions: Option[];
  advertiserOptions: Option[];
  campaignOptions: Option[];
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

  const clearAllFilters = () => {
    onAgenciesChange([]);
    onAdvertisersChange([]);
    onCampaignsChange([]);
  };

  const hasActiveFilters = selectedAgencies.length > 0 || selectedAdvertisers.length > 0 || selectedCampaigns.length > 0;

  return (
    <div className="py-[5px] bg-muted/30 rounded-md">
      {isExpanded && (
        <div className="flex items-end gap-4 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
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

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="flex items-center gap-1 mb-0"
            >
              <X className="h-3 w-3" />
              Clear
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalFilters;
