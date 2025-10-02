import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SparkChartModal from "./SparkChartModal";

// Import our custom hook
import { useCombinedMetrics } from "@/hooks/useCombinedMetrics";

// Import individual chart components
import { DisplayMetricsChart } from "@/components/charts/DisplayMetricsChart";
import { AttributionMetricsChart } from "@/components/charts/AttributionMetricsChart";
import { CustomMetricsChart } from "@/components/charts/CustomMetricsChart";
import { SpendMetricsChart } from "@/components/charts/SpendMetricsChart";
import { MetricsChartLegend } from "@/components/charts/MetricsChartLegend";
import { CampaignDataRow } from "@/types/campaign";

interface CombinedMetricsChartProps {
  data: CampaignDataRow[];
  title?: string;
  chartToggleComponent?: React.ReactNode;
  onTabChange?: (tab: string) => void;
  initialTab?: string;
  // New props for custom metrics
  customBarMetric?: string;
  customLineMetric?: string;
  // Chart mode selector to be rendered inside the chart
  chartModeSelector?: React.ReactNode;
  // Raw data for spend calculations (with campaign names)
  rawData?: CampaignDataRow[];
}

/**
 * Refactored CombinedMetricsChart component - reduced from 605 lines
 * Uses extracted custom hook and modular chart components for better maintainability
 */
const CombinedMetricsChart = ({
  data,
  title = "Campaign Performance",
  chartToggleComponent,
  onTabChange,
  initialTab = "display",
  customBarMetric = "IMPRESSIONS",
  customLineMetric = "CLICKS",
  chartModeSelector,
  rawData = []
}: CombinedMetricsChartProps) => {
  // Use our custom hook for all data processing and state management
  const { state, actions, data: chartData, utils } = useCombinedMetrics({
    data,
    rawData,
    initialTab,
    customBarMetric,
    customLineMetric
  });

  console.log(`CombinedMetricsChart: Rendering with data length: ${data?.length}, activeTab: ${state.activeTab}, initialTab: ${initialTab}`);

  const handleTabChange = (value: string) => {
    actions.handleTabChange(value, onTabChange);
  };

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          No data available
        </CardContent>
      </Card>
    );
  }

  // Don't render if no processed data
  if (!chartData.hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          No chart data available
        </CardContent>
      </Card>
    );
  }

  console.log(`CombinedMetricsChart: Processed data length: ${chartData.chartData.length}, isDayOfWeekData: ${chartData.isDayOfWeekData}`);

  // Render different chart configurations based on active tab
  const renderChart = () => {
    if (state.activeTab === "display") {
      return (
        <DisplayMetricsChart
          data={chartData.chartData}
          barSize={chartData.barSize}
          formatTooltipValue={utils.formatTooltipValue}
        />
      );
    } else if (state.activeTab === "attribution") {
      return (
        <AttributionMetricsChart
          data={chartData.chartData}
          barSize={chartData.barSize}
          formatTooltipValue={utils.formatTooltipValue}
        />
      );
    } else if (state.activeTab === "custom") {
      const barFormatter = utils.getMetricFormatter(customBarMetric);
      const lineFormatter = utils.getMetricFormatter(customLineMetric);
      const barLabel = utils.getMetricLabel(customBarMetric);
      const lineLabel = utils.getMetricLabel(customLineMetric);

      return (
        <CustomMetricsChart
          data={chartData.chartData}
          barSize={chartData.barSize}
          customBarMetric={customBarMetric}
          customLineMetric={customLineMetric}
          barFormatter={barFormatter}
          lineFormatter={lineFormatter}
          barLabel={barLabel}
          lineLabel={lineLabel}
          formatTooltipValue={utils.formatTooltipValue}
        />
      );
    } else if (state.activeTab === "spend") {
      return (
        <SpendMetricsChart
          data={chartData.chartData}
          barSize={chartData.barSize}
        />
      );
    }

    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <CardTitle>{title}</CardTitle>

            {/* Custom Legend */}
            <MetricsChartLegend activeTab={state.activeTab} />
          </div>

          <div className="flex items-center space-x-4">
            {chartModeSelector && (
              <div>{chartModeSelector}</div>
            )}
            {chartToggleComponent && (
              <div>{chartToggleComponent}</div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          {renderChart()}
        </div>

        {/* Modal for expanded view (hidden as per requirement) */}
        <SparkChartModal
          open={state.modalOpen}
          onOpenChange={actions.setModalOpen}
          title={state.activeTab === "display" ? "Display Metrics Over Time" : state.activeTab === "attribution" ? "Attribution Metrics Over Time" : "Custom Metrics Over Time"}
          data={chartData.chartData}
          dataKey={state.activeTab === "display" ? "CLICKS" : state.activeTab === "attribution" ? "TRANSACTIONS" : customLineMetric}
          color={state.activeTab === "display" ? "#f59e0b" : state.activeTab === "attribution" ? "#ef4444" : "#eab308"}
          gradientId={state.activeTab === "display" ? "impressions-clicks" : state.activeTab === "attribution" ? "transactions-revenue" : "custom-metrics"}
          valueFormatter={state.activeTab === "display"
            ? (value) => utils.getMetricFormatter("CLICKS")(value)
            : state.activeTab === "attribution"
            ? (value) => utils.getMetricFormatter("TRANSACTIONS")(value)
            : (value) => utils.getMetricFormatter(customLineMetric)(value)
          }
        />
      </CardContent>
    </Card>
  );
};

export default CombinedMetricsChart;