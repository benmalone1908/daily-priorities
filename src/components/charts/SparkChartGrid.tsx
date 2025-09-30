import { Eye, MousePointer, ShoppingCart, DollarSign, Percent, TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/MultiSelect";
import SparkChart from "./SparkChart";
import { SparkChartGridProps, SparkChartMetricType, SparkChartMetricConfig } from "@/types/sparkCharts";
import { formatNumber } from "@/lib/utils";

/**
 * Spark Chart Grid Component
 * Manages layout and filtering for multiple spark charts
 * Extracted from CampaignSparkCharts.tsx for better organization
 */
const SparkChartGrid = ({
  items,
  filters,
  onFiltersChange,
  onChartClick,
  agencyOptions = [],
  advertiserOptions = [],
  campaignOptions = []
}: SparkChartGridProps) => {

  // Define metric configurations
  const getMetricConfig = (metricType: SparkChartMetricType): SparkChartMetricConfig => {
    switch (metricType) {
      case "impressions":
        return {
          title: "Impressions",
          color: "#3B82F6",
          icon: Eye,
          formatter: (value: number) => formatNumber(value, { abbreviate: true })
        };
      case "clicks":
        return {
          title: "Clicks",
          color: "#10B981",
          icon: MousePointer,
          formatter: (value: number) => formatNumber(value, { abbreviate: true })
        };
      case "ctr":
        return {
          title: "CTR",
          color: "#F59E0B",
          icon: Percent,
          formatter: (value: number) => `${value.toFixed(2)}%`
        };
      case "transactions":
        return {
          title: "Transactions",
          color: "#8B5CF6",
          icon: ShoppingCart,
          formatter: (value: number) => formatNumber(value, { abbreviate: true })
        };
      case "revenue":
        return {
          title: "Attributed Sales",
          color: "#EF4444",
          icon: DollarSign,
          formatter: (value: number) => `$${formatNumber(value, { abbreviate: false })}`
        };
      case "roas":
        return {
          title: "ROAS",
          color: "#EC4899",
          icon: TrendingUp,
          formatter: (value: number) => formatNumber(value, { decimals: 2, suffix: 'x' })
        };
    }
  };

  // Metrics to display
  const metrics: SparkChartMetricType[] = ["impressions", "clicks", "ctr", "transactions", "revenue", "roas"];

  // Handle filter changes
  const handleViewModeChange = (value: string) => {
    onFiltersChange({ viewMode: value as "campaign" | "advertiser" });
  };

  const handleAgencyChange = (selected: string[]) => {
    onFiltersChange({ selectedAgencies: selected });
  };

  const handleAdvertiserChange = (selected: string[]) => {
    onFiltersChange({ selectedAdvertisers: selected });
  };

  const handleCampaignChange = (selected: string[]) => {
    onFiltersChange({ selectedCampaigns: selected });
  };

  // Early return if no data
  if (items.length === 0) {
    return (
      <div className="space-y-4">
        {!filters.useGlobalFilters && (
          <div className="flex justify-between items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">View by:</span>
              <Select
                value={filters.viewMode}
                onValueChange={handleViewModeChange}
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
                  options={agencyOptions}
                  selected={filters.selectedAgencies}
                  onChange={handleAgencyChange}
                  placeholder="Agency"
                  className="w-[180px]"
                />

                <MultiSelect
                  options={advertiserOptions}
                  selected={filters.selectedAdvertisers}
                  onChange={handleAdvertiserChange}
                  placeholder="Advertiser"
                  className="w-[180px]"
                />

                <MultiSelect
                  options={campaignOptions}
                  selected={filters.selectedCampaigns}
                  onChange={handleCampaignChange}
                  placeholder="Campaign"
                  className="w-[180px]"
                  popoverClassName="w-[400px]"
                />
              </div>
            </div>
          </div>
        )}

        <div className="text-center py-20 bg-muted/30 rounded-lg">
          <p className="text-muted-foreground">No data available for the selected date range</p>
          <p className="text-sm text-muted-foreground mt-2">
            Try adjusting the date filter or campaign selection
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Controls - only show when NOT using global filters */}
      {!filters.useGlobalFilters && (
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">View by:</span>
            <Select
              value={filters.viewMode}
              onValueChange={handleViewModeChange}
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
                options={agencyOptions}
                selected={filters.selectedAgencies}
                onChange={handleAgencyChange}
                placeholder="Agency"
                className="w-[180px]"
              />

              <MultiSelect
                options={advertiserOptions}
                selected={filters.selectedAdvertisers}
                onChange={handleAdvertiserChange}
                placeholder="Advertiser"
                className="w-[180px]"
              />

              <MultiSelect
                options={campaignOptions}
                selected={filters.selectedCampaigns}
                onChange={handleCampaignChange}
                placeholder="Campaign"
                className="w-[180px]"
                popoverClassName="w-[400px]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Campaign/Advertiser Grid - one row per item with all metrics */}
      <div className="space-y-6">
        {items.map(item => (
          <div key={item.name} className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground px-1">
              {item.name}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {metrics.map(metric => {
                const config = getMetricConfig(metric);
                return (
                  <SparkChart
                    key={`${item.name}-${metric}`}
                    item={item}
                    metric={metric}
                    config={config}
                    onChartClick={onChartClick}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SparkChartGrid;