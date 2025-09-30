import React, { useMemo, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import MetricCard from "./MetricCard";
import { normalizeDate } from "@/lib/utils";
import CombinedMetricsChart from "./CombinedMetricsChart";
import { DailyTotalsTable } from "./DailyTotalsTable";
import DashboardSparkCharts from "./DashboardSparkCharts";

// Import our extracted hooks and components
import { useDashboardState } from "@/hooks/useDashboardState";
import { useDashboardDataProcessing } from "@/hooks/useDashboardDataProcessing";
import { getComparisonData, getDataForPeriod } from "@/lib/dashboardCalculations";
import { MetricCards } from "./dashboard/MetricCards";
import { ChartControls } from "./dashboard/ChartControls";

interface DashboardProps {
  data: any[];
  metricsData?: any[];
  revenueData?: any[];
  selectedMetricsAdvertisers?: string[];
  selectedMetricsAgencies?: string[];
  selectedRevenueAdvertisers?: string[];
  selectedRevenueAgencies?: string[];
  onMetricsAdvertisersChange?: (advertisers: string[]) => void;
  onMetricsAgenciesChange?: (agencies: string[]) => void;
  onRevenueAdvertisersChange?: (advertisers: string[]) => void;
  onRevenueAgenciesChange?: (agencies: string[]) => void;
  formattedAdvertiserOptions?: Array<{value: string; label: string}>;
  formattedAgencyOptions?: Array<{value: string; label: string}>;
  useGlobalFilters?: boolean;
  hideCharts?: string[];
  chartToggleComponent?: React.ReactNode;
  chartModeSelector?: React.ReactNode;
  activeTab?: string;
  onChartTabChange?: (tab: string) => void;
  viewByDate?: boolean;
  customBarMetric?: string;
  customLineMetric?: string;
  showDailyTotalsTable?: boolean;
  hideDashboardSparkCharts?: boolean;
}

const DashboardRefactored: React.FC<DashboardProps> = ({
  data,
  metricsData,
  revenueData,
  selectedMetricsAdvertisers = [],
  selectedMetricsAgencies = [],
  selectedRevenueAdvertisers = [],
  selectedRevenueAgencies = [],
  onMetricsAdvertisersChange,
  onMetricsAgenciesChange,
  onRevenueAdvertisersChange,
  onRevenueAgenciesChange,
  formattedAdvertiserOptions = [],
  formattedAgencyOptions = [],
  useGlobalFilters = false,
  hideCharts = [],
  chartToggleComponent,
  chartModeSelector,
  activeTab = "display",
  onChartTabChange,
  viewByDate = false,
  customBarMetric,
  customLineMetric,
  showDailyTotalsTable = false,
  hideDashboardSparkCharts = false
}) => {
  // Use our extracted state management hook
  const { state, actions } = useDashboardState({
    selectedMetricsAdvertisers,
    selectedMetricsAgencies,
    viewByDate
  });

  // Use our extracted data processing hook
  const { aggregatedData, aggregatedDataByDayOfWeek } = useDashboardDataProcessing(data);

  // Process metrics and revenue data using the aggregated data
  const processedMetricsData = useMemo(() => {
    const dataToProcess = metricsData || data;
    return state.metricsViewMode === "date"
      ? aggregatedData.filter(row => {
          if (!dataToProcess?.length) return false;
          return dataToProcess.some(originalRow =>
            normalizeDate(originalRow.DATE) === row.DATE
          );
        })
      : aggregatedDataByDayOfWeek;
  }, [metricsData, data, aggregatedData, aggregatedDataByDayOfWeek, state.metricsViewMode]);

  const processedRevenueData = useMemo(() => {
    const dataToProcess = revenueData || data;
    return state.revenueViewMode === "date"
      ? aggregatedData.filter(row => {
          if (!dataToProcess?.length) return false;
          return dataToProcess.some(originalRow =>
            normalizeDate(originalRow.DATE) === row.DATE
          );
        })
      : aggregatedDataByDayOfWeek;
  }, [revenueData, data, aggregatedData, aggregatedDataByDayOfWeek, state.revenueViewMode]);

  // Calculate comparison data for metric cards
  const currentPeriodData = useMemo(() => {
    if (!data?.length) return [];
    const now = new Date();
    const daysBack = parseInt(state.comparisonPeriod);
    const startDate = new Date();
    startDate.setDate(now.getDate() - daysBack);
    return getDataForPeriod(data, startDate, now);
  }, [data, state.comparisonPeriod]);

  const previousPeriodData = useMemo(() => {
    return getComparisonData(data, currentPeriodData, parseInt(state.comparisonPeriod));
  }, [data, currentPeriodData, state.comparisonPeriod]);

  // Date range information
  const dateRange = useMemo(() => {
    if (!data?.length) return null;

    const dates = data
      .map(row => normalizeDate(row.DATE))
      .filter(Boolean)
      .map(dateStr => new Date(dateStr))
      .sort((a, b) => a.getTime() - b.getTime());

    if (dates.length === 0) return null;

    return {
      start: dates[0],
      end: dates[dates.length - 1]
    };
  }, [data]);

  const dateRangeText = useMemo(() => {
    if (!dateRange) return "";
    return `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`;
  }, [dateRange]);

  // Effect to sync view modes with parent component
  useEffect(() => {
    if (activeTab && viewByDate !== undefined) {
      actions.setMetricsViewMode(viewByDate ? "date" : "dayOfWeek");
      actions.setRevenueViewMode(viewByDate ? "date" : "dayOfWeek");
    }
  }, [activeTab, viewByDate, actions]);

  // Handlers for view mode changes
  const handleMetricsViewModeChange = (value: any) => {
    if (!value) return;
    actions.setMetricsViewMode(value);
    if (onChartTabChange && activeTab !== "display") {
      onChartTabChange("display");
    }
  };

  const handleRevenueViewModeChange = (value: any) => {
    if (!value) return;
    actions.setRevenueViewMode(value);
    if (onChartTabChange && activeTab !== "attribution") {
      onChartTabChange("attribution");
    }
  };

  // Prepare combined data for CombinedMetricsChart component
  const combinedChartData = useMemo(() => {
    if (activeTab === "custom") {
      const dataToUse = metricsData || data;
      return viewByDate ? aggregatedData : aggregatedDataByDayOfWeek;
    }
    return activeTab === "display" ? processedMetricsData : processedRevenueData;
  }, [activeTab, processedMetricsData, processedRevenueData, metricsData, data, viewByDate, aggregatedData, aggregatedDataByDayOfWeek]);

  // Handler for CombinedMetricsChart tab changes
  const handleCombinedChartTabChange = (tab: string) => {
    if (onChartTabChange) {
      onChartTabChange(tab);
    }
  };

  // Early return if no data
  if (!data?.length) {
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
      {/* Date range info when not using global filters */}
      {!useGlobalFilters && dateRange && (
        <div className="text-sm text-muted-foreground text-center">
          <span className="font-medium">{dateRangeText}</span>
          {` (${data.length.toLocaleString()} records)`}
        </div>
      )}

      {/* Metric Cards showing period comparisons */}
      <MetricCards
        currentPeriodData={currentPeriodData}
        previousPeriodData={previousPeriodData}
        comparisonPeriod={state.comparisonPeriod}
      />

      {/* Chart Controls */}
      <ChartControls
        metricsViewMode={state.metricsViewMode}
        revenueViewMode={state.revenueViewMode}
        onMetricsViewModeChange={handleMetricsViewModeChange}
        onRevenueViewModeChange={handleRevenueViewModeChange}
        anomalyPeriod={state.anomalyPeriod}
        comparisonPeriod={state.comparisonPeriod}
        onAnomalyPeriodChange={actions.setAnomalyPeriod}
        onComparisonPeriodChange={actions.setComparisonPeriod}
        selectedMetricsAdvertisers={selectedMetricsAdvertisers}
        selectedMetricsAgencies={selectedMetricsAgencies}
        selectedRevenueAdvertisers={selectedRevenueAdvertisers}
        selectedRevenueAgencies={selectedRevenueAgencies}
        onMetricsAdvertisersChange={onMetricsAdvertisersChange || (() => {})}
        onMetricsAgenciesChange={onMetricsAgenciesChange || (() => {})}
        onRevenueAdvertisersChange={onRevenueAdvertisersChange || (() => {})}
        onRevenueAgenciesChange={onRevenueAgenciesChange || (() => {})}
        formattedAdvertiserOptions={formattedAdvertiserOptions}
        formattedAgencyOptions={formattedAgencyOptions}
      />

      {/* Anomaly Detection Section */}
      {state.showAnomalySection && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Anomaly Detection</h2>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Anomaly period:</span>
              <ToggleGroup
                type="single"
                value={state.anomalyPeriod}
                onValueChange={(value) => value && actions.setAnomalyPeriod(value as any)}
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
              anomalies={state.anomalies.impressions || []}
              metric="IMPRESSIONS"
              anomalyPeriod={state.anomalyPeriod}
            />
            <MetricCard
              title="Click Anomalies"
              anomalies={state.anomalies.clicks || []}
              metric="CLICKS"
              anomalyPeriod={state.anomalyPeriod}
            />
            <MetricCard
              title="Attributed Sales Anomalies"
              anomalies={state.anomalies.revenue || []}
              metric="REVENUE"
              anomalyPeriod={state.anomalyPeriod}
            />
          </div>
        </div>
      )}

      {/* Charts Section */}
      {!(hideCharts.includes("metricsChart") && hideCharts.includes("revenueChart")) && (
        <div className="space-y-4">
          {/* Chart Mode Selector above table, aligned right - only show when table is visible */}
          {showDailyTotalsTable && (
            <div className="flex justify-end">
              {chartModeSelector}
            </div>
          )}

          <div className={`${showDailyTotalsTable ? 'grid grid-cols-1 lg:grid-cols-3 gap-6' : 'w-full'}`}>
            {/* Performance Chart */}
            <div className={showDailyTotalsTable ? 'lg:col-span-2' : 'w-full'}>
              <CombinedMetricsChart
                data={combinedChartData}
                title=""
                chartToggleComponent={chartToggleComponent}
                onTabChange={handleCombinedChartTabChange}
                initialTab={activeTab}
                customBarMetric={customBarMetric}
                customLineMetric={customLineMetric}
                chartModeSelector={!showDailyTotalsTable ? chartModeSelector : undefined}
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
        <DashboardSparkCharts
          data={data}
          metricsData={metricsData}
          revenueData={revenueData}
        />
      )}
    </div>
  );
};

export default DashboardRefactored;