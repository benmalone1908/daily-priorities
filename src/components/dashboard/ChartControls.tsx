import React from 'react';
import { Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MultiSelect, Option } from "@/components/MultiSelect";
import type { ChartViewMode, AnomalyPeriod, ComparisonPeriod } from "@/hooks/useDashboardState";

interface ChartControlsProps {
  // View mode controls
  metricsViewMode: ChartViewMode;
  revenueViewMode: ChartViewMode;
  onMetricsViewModeChange: (mode: ChartViewMode) => void;
  onRevenueViewModeChange: (mode: ChartViewMode) => void;

  // Period controls
  anomalyPeriod: AnomalyPeriod;
  comparisonPeriod: ComparisonPeriod;
  onAnomalyPeriodChange: (period: AnomalyPeriod) => void;
  onComparisonPeriodChange: (period: ComparisonPeriod) => void;

  // Filter controls
  selectedMetricsAdvertisers: string[];
  selectedMetricsAgencies: string[];
  selectedRevenueAdvertisers: string[];
  selectedRevenueAgencies: string[];
  onMetricsAdvertisersChange: (advertisers: string[]) => void;
  onMetricsAgenciesChange: (agencies: string[]) => void;
  onRevenueAdvertisersChange: (advertisers: string[]) => void;
  onRevenueAgenciesChange: (agencies: string[]) => void;

  // Options for dropdowns
  formattedAdvertiserOptions: Option[];
  formattedAgencyOptions: Option[];
}

export const ChartControls: React.FC<ChartControlsProps> = ({
  metricsViewMode,
  revenueViewMode,
  onMetricsViewModeChange,
  onRevenueViewModeChange,
  anomalyPeriod,
  comparisonPeriod,
  onAnomalyPeriodChange,
  onComparisonPeriodChange,
  selectedMetricsAdvertisers,
  selectedMetricsAgencies,
  selectedRevenueAdvertisers,
  selectedRevenueAgencies,
  onMetricsAdvertisersChange,
  onMetricsAgenciesChange,
  onRevenueAdvertisersChange,
  onRevenueAgenciesChange,
  formattedAdvertiserOptions,
  formattedAgencyOptions
}) => {
  return (
    <div className="space-y-6 mb-6">
      {/* View Mode Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Chart View:</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Metrics:</span>
            <ToggleGroup
              type="single"
              value={metricsViewMode}
              onValueChange={(value) => value && onMetricsViewModeChange(value as ChartViewMode)}
              className="bg-gray-50 rounded-md p-1"
            >
              <ToggleGroupItem value="date" size="sm">By Date</ToggleGroupItem>
              <ToggleGroupItem value="dayOfWeek" size="sm">By Day</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Revenue:</span>
            <ToggleGroup
              type="single"
              value={revenueViewMode}
              onValueChange={(value) => value && onRevenueViewModeChange(value as ChartViewMode)}
              className="bg-gray-50 rounded-md p-1"
            >
              <ToggleGroupItem value="date" size="sm">By Date</ToggleGroupItem>
              <ToggleGroupItem value="dayOfWeek" size="sm">By Day</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>

      {/* Period Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Comparison:</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Period:</span>
            <Select value={comparisonPeriod} onValueChange={(value) => onComparisonPeriodChange(value as ComparisonPeriod)}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7d</SelectItem>
                <SelectItem value="14">14d</SelectItem>
                <SelectItem value="30">30d</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Anomaly:</span>
            <Select value={anomalyPeriod} onValueChange={(value) => onAnomalyPeriodChange(value as AnomalyPeriod)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="space-y-4">
        <div className="text-sm font-medium text-gray-700">Filters:</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Metrics Filters */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Metrics Charts</div>
            <div className="space-y-2">
              <MultiSelect
                options={formattedAgencyOptions}
                selected={selectedMetricsAgencies}
                onChange={onMetricsAgenciesChange}
                placeholder="Filter by agencies"
                className="w-full"
              />
              <MultiSelect
                options={formattedAdvertiserOptions}
                selected={selectedMetricsAdvertisers}
                onChange={onMetricsAdvertisersChange}
                placeholder="Filter by advertisers"
                className="w-full"
              />
            </div>
          </div>

          {/* Revenue Filters */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Revenue Charts</div>
            <div className="space-y-2">
              <MultiSelect
                options={formattedAgencyOptions}
                selected={selectedRevenueAgencies}
                onChange={onRevenueAgenciesChange}
                placeholder="Filter by agencies"
                className="w-full"
              />
              <MultiSelect
                options={formattedAdvertiserOptions}
                selected={selectedRevenueAdvertisers}
                onChange={onRevenueAdvertisersChange}
                placeholder="Filter by advertisers"
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};