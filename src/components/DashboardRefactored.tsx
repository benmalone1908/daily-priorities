import { useMemo, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// Import our new utilities and hooks
import { useDashboardData, ChartViewMode, AnomalyPeriod } from "@/hooks/useDashboardData";
import {
  getAggregatedData,
  getAggregatedDataByDayOfWeek,
  detectAnomalies,
  getDateRangeText
} from "@/utils/dashboardCalculations";
import { DashboardProps } from "@/types/dashboard";

// Import existing components that we'll refactor later
import CombinedMetricsChart from "./CombinedMetricsChart";
import { DailyTotalsTable } from "./DailyTotalsTable";
import MetricCard from "./MetricCard";
import DashboardSparkCharts from "./DashboardSparkCharts";

/**
 * Refactored Dashboard component - reduced from 1,469 lines and 70+ props
 * to a manageable size with proper separation of concerns
 */
const DashboardRefactored = ({
  data,
  hideCharts = [],
  useGlobalFilters = false,
  showDailyTotalsTable = true,
  hideDashboardSparkCharts = false,
  customBarMetric = "IMPRESSIONS",
  customLineMetric = "CLICKS",
  initialTab = "display",
  onTabChange,
  contractTermsData = []
}: DashboardProps) => {

  // Use our custom hook for data processing
  const {
    processedData,
    aggregatedData,
    aggregatedByDayOfWeek,
    anomalyPeriod,
    setAnomalyPeriod,
    viewMode,
    setViewMode,
    hasData,
    totalRecords,
    dateRange: dataDateRange
  } = useDashboardData({ data });

  // Local state for chart configuration
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync with parent component
  useEffect(() => {
    if (onTabChange && activeTab !== initialTab) {
      onTabChange(activeTab);
    }
  }, [activeTab, onTabChange, initialTab]);

  // Generate date range text for display
  const dateRangeText = useMemo(() => {
    return getDateRangeText(data);
  }, [data]);

  // Detect anomalies in the data
  const anomalies = useMemo(() => {
    if (!hasData) return { IMPRESSIONS: [], CLICKS: [], REVENUE: [] };

    const dataToAnalyze = anomalyPeriod === "daily" ? aggregatedData : aggregatedData; // Could add weekly aggregation

    return {
      IMPRESSIONS: detectAnomalies(dataToAnalyze, 'IMPRESSIONS'),
      CLICKS: detectAnomalies(dataToAnalyze, 'CLICKS'),
      REVENUE: detectAnomalies(dataToAnalyze, 'REVENUE')
    };
  }, [aggregatedData, anomalyPeriod, hasData]);

  // Determine if anomaly section should be shown
  const showAnomalySection = useMemo(() => {
    return !hideCharts.includes("anomalies") &&
           (anomalies.IMPRESSIONS.length > 0 ||
            anomalies.CLICKS.length > 0 ||
            anomalies.REVENUE.length > 0);
  }, [hideCharts, anomalies]);

  // Get chart data based on current settings
  const chartData = useMemo(() => {
    if (activeTab === "custom") {
      return viewMode === "date" ? aggregatedData : aggregatedByDayOfWeek;
    }
    return processedData;
  }, [activeTab, viewMode, aggregatedData, aggregatedByDayOfWeek, processedData]);

  // Handle tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // Early return if no data
  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No campaign data available</p>
          <p className="text-sm text-muted-foreground mt-2">
            Upload a CSV file or check your data source
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Data Summary - only show when NOT using global filters */}
      {!useGlobalFilters && (
        <div className="text-sm text-muted-foreground text-center">
          <span className="font-medium">{dateRangeText}</span>
          {` (${totalRecords.toLocaleString()} records)`}
        </div>
      )}

      {/* Anomaly Detection Section */}
      {showAnomalySection && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Anomaly Detection</h2>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Period:</span>
              <ToggleGroup
                type="single"
                value={anomalyPeriod}
                onValueChange={(value) => value && setAnomalyPeriod(value as AnomalyPeriod)}
              >
                <ToggleGroupItem value="daily" aria-label="Daily anomalies" className="text-sm">
                  Daily
                </ToggleGroupItem>
                <ToggleGroupItem value="weekly" aria-label="Weekly anomalies" className="text-sm">
                  Weekly
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              title="Impression Anomalies"
              anomalies={anomalies.IMPRESSIONS}
              metric="IMPRESSIONS"
              anomalyPeriod={anomalyPeriod}
            />
            <MetricCard
              title="Click Anomalies"
              anomalies={anomalies.CLICKS}
              metric="CLICKS"
              anomalyPeriod={anomalyPeriod}
            />
            <MetricCard
              title="Revenue Anomalies"
              anomalies={anomalies.REVENUE}
              metric="REVENUE"
              anomalyPeriod={anomalyPeriod}
            />
          </div>
        </Card>
      )}

      {/* Main Charts Section */}
      {!(hideCharts.includes("metricsChart") && hideCharts.includes("revenueChart")) && (
        <div className="space-y-4">
          {/* Chart Container */}
          <div className={`${showDailyTotalsTable ? 'grid grid-cols-1 lg:grid-cols-3 gap-6' : 'w-full'}`}>
            {/* Performance Chart */}
            <div className={showDailyTotalsTable ? 'lg:col-span-2' : 'w-full'}>
              <CombinedMetricsChart
                data={chartData}
                title=""
                onTabChange={handleTabChange}
                initialTab={activeTab}
                customBarMetric={customBarMetric}
                customLineMetric={customLineMetric}
                rawData={data}
              />
            </div>

            {/* Daily Totals Table */}
            {showDailyTotalsTable && (
              <div className="lg:col-span-1">
                <DailyTotalsTable
                  data={data}
                  chartMode={activeTab as 'display' | 'attribution' | 'custom'}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dashboard Spark Charts */}
      {!hideDashboardSparkCharts && (
        <DashboardSparkCharts data={data} />
      )}

      {/* View Mode Toggle */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Chart View</h3>
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as ChartViewMode)}
          >
            <ToggleGroupItem value="date" aria-label="View by date">
              By Date
            </ToggleGroupItem>
            <ToggleGroupItem value="dayOfWeek" aria-label="View by day of week">
              By Day of Week
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </Card>
    </div>
  );
};

export default DashboardRefactored;