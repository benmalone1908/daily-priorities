import SparkChartGrid from "@/components/charts/SparkChartGrid";
import SparkChartModal from "@/components/charts/SparkChartModal";
import { useSparkChartData } from "@/hooks/useSparkChartData";
import { CampaignSparkChartsProps } from "@/types/sparkCharts";

/**
 * Refactored CampaignSparkCharts - reduced from 1,112 lines
 * to a clean, maintainable component using extracted hooks and components
 */
const CampaignSparkChartsRefactored = ({
  data,
  dateRange,
  useGlobalFilters = false
}: CampaignSparkChartsProps) => {

  // Use our custom hook for all data processing and state management
  const {
    chartData,
    filters,
    updateFilters,
    modalData,
    openModal,
    closeModal,
    hasData,
    agencyOptions,
    advertiserOptions,
    campaignOptions
  } = useSparkChartData({
    data,
    dateRange,
    useGlobalFilters
  });

  // Early return if no data
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No campaign data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Spark Chart Grid */}
      <SparkChartGrid
        items={chartData}
        filters={filters}
        onFiltersChange={updateFilters}
        onChartClick={openModal}
        agencyOptions={agencyOptions}
        advertiserOptions={advertiserOptions}
        campaignOptions={campaignOptions}
      />

      {/* Modal for expanded chart view */}
      <SparkChartModal
        isOpen={modalData.isOpen}
        onClose={closeModal}
        title={modalData.itemName}
        data={modalData.data}
        metricType={modalData.metricType}
      />
    </div>
  );
};

export default CampaignSparkChartsRefactored;