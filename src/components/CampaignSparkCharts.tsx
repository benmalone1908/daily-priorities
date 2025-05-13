
import { useState, useEffect } from "react";
import { useSpendSettings } from "@/contexts/SpendSettingsContext";
import { DateRange } from "react-day-picker";
import { ModalData, ViewMode } from "@/types/campaigns";
import { MetricType, getMetricDetails } from "@/utils/chartUtils";
import { formatNumber } from "@/lib/utils";
import SparkChartModal from "./SparkChartModal";
import SparkChartItem from "./SparkChartItem";
import SparkChartFilters from "./SparkChartFilters";
import EmptySparkChartState from "./EmptySparkChartState";
import { useChartData } from "@/hooks/useChartData";
import { useFilterOptions } from "@/hooks/useFilterOptions";

interface CampaignSparkChartsProps {
  data: any[];
  dateRange?: DateRange;
}

const CampaignSparkCharts = ({ data, dateRange }: CampaignSparkChartsProps) => {
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [selectedAdvertisers, setSelectedAdvertisers] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("campaign");
  const { spendMode, customCPM } = useSpendSettings();
  
  const [modalData, setModalData] = useState<ModalData>({
    isOpen: false,
    itemName: "",
    metricType: "impressions",
    data: []
  });
  
  // Get filter options (advertisers, campaigns)
  const { advertiserOptions, campaignOptions } = useFilterOptions(data, selectedAdvertisers);
  
  // Get filtered data and chart data
  const { chartData } = useChartData(
    data,
    dateRange,
    selectedCampaigns,
    selectedAdvertisers,
    viewMode,
    spendMode,
    customCPM
  );

  // Update selected campaigns when advertisers change
  useEffect(() => {
    if (selectedAdvertisers.length > 0) {
      setSelectedCampaigns(prev => {
        return prev.filter(campaign => {
          const campaignRows = data.filter(row => row["CAMPAIGN ORDER NAME"] === campaign);
          if (campaignRows.length === 0) return false;
          
          const campaignName = campaignRows[0]["CAMPAIGN ORDER NAME"] || "";
          const match = campaignName.match(/SM:\s+([^-]+)/);
          const advertiser = match ? match[1].trim() : "";
          return selectedAdvertisers.includes(advertiser);
        });
      });
    }
  }, [selectedAdvertisers, data]);

  // Log when chart data changes
  useEffect(() => {
    console.log(`CampaignSparkCharts generated ${chartData.length} chart items`);
    if (chartData.length === 0) {
      console.log('No chart data available. Check date filtering and campaign selection.');
    }
  }, [chartData]);

  const handleChartClick = (itemName: string, metricType: MetricType, timeSeriesData: any[]) => {
    setModalData({
      isOpen: true,
      itemName,
      metricType,
      data: timeSeriesData
    });
  };

  if (!data || data.length === 0) {
    return <div className="text-center py-8">No data available</div>;
  }

  if (chartData.length === 0) {
    return (
      <EmptySparkChartState
        viewMode={viewMode}
        setViewMode={setViewMode}
        selectedCampaigns={selectedCampaigns}
        setSelectedCampaigns={setSelectedCampaigns}
        selectedAdvertisers={selectedAdvertisers}
        setSelectedAdvertisers={setSelectedAdvertisers}
        advertiserOptions={advertiserOptions}
        campaignOptions={campaignOptions}
      />
    );
  }

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
      
      {chartData.map((item) => (
        <SparkChartItem 
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
          labelFormatter={(label) => `${label}`}
        />
      )}
    </div>
  );
};

export default CampaignSparkCharts;
