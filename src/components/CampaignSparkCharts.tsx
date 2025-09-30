import { useState } from "react";
import { DateRange } from "react-day-picker";
import { MultiSelect } from "./MultiSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SparkChartModal from "./SparkChartModal";
import { useSparkChartsData } from "@/hooks/useSparkChartsData";
import { CampaignSparkCard } from "./sparkcharts/CampaignSparkCard";
import { formatNumber } from "@/lib/utils";

interface CampaignSparkChartsProps {
  data: any[];
  dateRange?: DateRange;
  useGlobalFilters?: boolean;
}

type MetricType =
  | "impressions"
  | "clicks"
  | "ctr"
  | "transactions"
  | "revenue"
  | "roas";

interface ModalData {
  isOpen: boolean;
  itemName: string;
  metricType: MetricType;
  data: any[];
}

/**
 * Refactored CampaignSparkCharts - maintaining exact original layout
 * Reduced from 1,112 lines by extracting logic to useSparkChartsData hook
 * and UI to CampaignSparkCard component
 */
const CampaignSparkChartsRefactored = ({
  data,
  dateRange,
  useGlobalFilters = false
}: CampaignSparkChartsProps) => {
  const [modalData, setModalData] = useState<ModalData>({
    isOpen: false,
    itemName: "",
    metricType: "impressions",
    data: []
  });

  // Use custom hook for all data processing
  const {
    chartData,
    viewMode,
    setViewMode,
    selectedAgencies,
    setSelectedAgencies,
    selectedAdvertisers,
    setSelectedAdvertisers,
    selectedCampaigns,
    setSelectedCampaigns,
    agencyOptions,
    advertiserOptions,
    campaignOptions,
  } = useSparkChartsData({ data, dateRange, useGlobalFilters });

  const handleChartClick = (itemName: string, metricType: string, timeSeriesData: any[]) => {
    setModalData({
      isOpen: true,
      itemName,
      metricType: metricType as MetricType,
      data: timeSeriesData
    });
  };

  const getMetricDetails = (metricType: MetricType) => {
    switch (metricType) {
      case "impressions":
        return {
          title: "Impressions",
          color: "#0EA5E9",
          formatter: (value: number) => formatNumber(value, { abbreviate: false })
        };
      case "clicks":
        return {
          title: "Clicks",
          color: "#8B5CF6",
          formatter: (value: number) => formatNumber(value, { abbreviate: false })
        };
      case "ctr":
        return {
          title: "CTR",
          color: "#6366F1",
          formatter: (value: number) => formatNumber(value, { decimals: 2, suffix: '%' })
        };
      case "transactions":
        return {
          title: "Transactions",
          color: "#F97316",
          formatter: (value: number) => formatNumber(value, { abbreviate: false })
        };
      case "revenue":
        return {
          title: "Attributed Sales",
          color: "#10B981",
          formatter: (value: number) => `$${formatNumber(value, { abbreviate: false })}`
        };
      case "roas":
        return {
          title: "ROAS",
          color: "#F59E0B",
          formatter: (value: number) => formatNumber(value, { decimals: 2, suffix: 'x' })
        };
    }
  };

  // Early return if no data
  if (!data || data.length === 0) {
    return <div className="text-center py-8">No data available</div>;
  }

  // Empty state with filters
  if (chartData.length === 0) {
    return (
      <div className="space-y-4">
        {!useGlobalFilters && (
          <div className="flex justify-between items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">View by:</span>
              <Select
                value={viewMode}
                onValueChange={(value: "campaign" | "advertiser") => setViewMode(value)}
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
                  selected={selectedAgencies}
                  onChange={setSelectedAgencies}
                  placeholder="Agency"
                  className="w-[180px]"
                />

                <MultiSelect
                  options={advertiserOptions}
                  selected={selectedAdvertisers}
                  onChange={setSelectedAdvertisers}
                  placeholder="Advertiser"
                  className="w-[180px]"
                />

                <MultiSelect
                  options={campaignOptions}
                  selected={selectedCampaigns}
                  onChange={setSelectedCampaigns}
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
          <p className="text-sm text-muted-foreground mt-2">Try adjusting the date filter or campaign selection</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls - only show when NOT using global filters */}
      {!useGlobalFilters && (
        <div className="flex justify-between items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">View by:</span>
            <Select
              value={viewMode}
              onValueChange={(value: "campaign" | "advertiser") => setViewMode(value)}
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
                selected={selectedAgencies}
                onChange={setSelectedAgencies}
                placeholder="Agency"
                className="w-[180px]"
              />

              <MultiSelect
                options={advertiserOptions}
                selected={selectedAdvertisers}
                onChange={setSelectedAdvertisers}
                placeholder="Advertiser"
                className="w-[180px]"
              />

              <MultiSelect
                options={campaignOptions}
                selected={selectedCampaigns}
                onChange={setSelectedCampaigns}
                placeholder="Campaign"
                className="w-[180px]"
                popoverClassName="w-[400px]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Campaign Cards */}
      {chartData.map((item) => (
        <CampaignSparkCard
          key={item.name}
          item={item}
          onChartClick={handleChartClick}
        />
      ))}

      {/* Modal for expanded chart view */}
      {modalData.isOpen && (
        <SparkChartModal
          open={modalData.isOpen}
          onOpenChange={(open) => setModalData({ ...modalData, isOpen: open })}
          title={`${modalData.itemName} - ${getMetricDetails(modalData.metricType).title}`}
          data={modalData.data}
          dataKey={modalData.metricType}
          color={getMetricDetails(modalData.metricType).color}
          gradientId={`${modalData.itemName}-${modalData.metricType}`.replace(/[^a-zA-Z0-9]/g, '-')}
          valueFormatter={getMetricDetails(modalData.metricType).formatter}
        />
      )}
    </div>
  );
};

export default CampaignSparkChartsRefactored;
