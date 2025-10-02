import { useState } from "react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { TrendingDown, TrendingUp, Maximize } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useCampaignFilter } from "@/contexts/use-campaign-filter";
import { useCampaignData } from "@/hooks/useCampaignData";
import { useModalState } from "@/hooks/useModalState";
import SparkChartModal from "@/components/SparkChartModal";
import { getColorClasses } from "@/utils/anomalyColors";
import { formatters } from "@/utils/campaignCalculations";
import { CampaignDataRow, MetricType, TimeSeriesDataPoint } from "@/types/campaign";

interface AggregatedSparkChartsProps {
  data: CampaignDataRow[];
}

/**
 * Aggregated Spark Charts component that matches the campaign row style
 * Extracted from the massive Index.tsx component
 */
export const AggregatedSparkCharts = ({ data }: AggregatedSparkChartsProps) => {
  const { showAggregatedSparkCharts } = useCampaignFilter();
  const { modalData, openModal, closeModal, setModalData } = useModalState();
  const { timeSeriesData, totals, trends } = useCampaignData({ data });

  // Early return after all hooks are called
  if (!showAggregatedSparkCharts || !data || data.length === 0) {
    return null;
  }

  const handleChartClick = (metricType: MetricType, title: string) => {
    // Transform the data to include calculated CTR and ROAS fields
    let transformedData = timeSeriesData;

    if (metricType === "ctr") {
      transformedData = timeSeriesData.map(item => ({
        ...item,
        value: item.CTR
      }));
    } else if (metricType === "roas") {
      transformedData = timeSeriesData.map(item => ({
        ...item,
        value: item.ROAS
      }));
    }

    openModal(metricType, title, transformedData);
  };

  const createSparkChart = (
    data: TimeSeriesDataPoint[],
    dataKey: keyof TimeSeriesDataPoint,
    color: string
  ) => {
    const chartData = data.map(item => ({
      value: Number(item[dataKey]) || 0
    }));

    return (
      <ResponsiveContainer width="100%" height={40}>
        <AreaChart data={chartData}>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fill={color}
            strokeWidth={1.5}
            dot={false}
            fillOpacity={0.2}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  const getTrendIcon = (trend: number) => {
    if (Math.abs(trend) < 0.1) return null;
    return trend > 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  const getTrendColor = (trend: number) => {
    if (Math.abs(trend) < 0.1) return "text-gray-500";
    return trend > 0 ? "text-green-500" : "text-red-500";
  };

  return (
    <>
      <Card className="w-full">
        <div className="p-4 border-b">
          <h3 className="text-sm font-medium text-gray-900">
            Aggregated Performance
          </h3>
          <p className="text-xs text-gray-500">
            Combined metrics across all campaigns
          </p>
        </div>
        <div className="p-2">
          <Table>
            <TableBody>
              {/* Impressions Row */}
              <TableRow className="hover:bg-gray-50/50">
                <TableCell className="py-2 px-3 w-20">
                  <div className="text-xs font-medium text-gray-700">IMP</div>
                </TableCell>
                <TableCell className="py-2 px-3 w-24 text-right">
                  <div className="text-sm font-medium">
                    {formatters.number(totals.impressions)}
                  </div>
                </TableCell>
                <TableCell className="py-2 px-3 w-20 text-right">
                  <div className={`text-xs flex items-center justify-end gap-1 ${getTrendColor(trends.impressions)}`}>
                    {getTrendIcon(trends.impressions)}
                    {formatters.percentage(trends.impressions)}
                  </div>
                </TableCell>
                <TableCell className="py-2 px-3 w-32">
                  <div
                    className="cursor-pointer"
                    onClick={() => handleChartClick("impressions", "Aggregated Impressions")}
                  >
                    {createSparkChart(timeSeriesData, "IMPRESSIONS", "#3B82F6")}
                  </div>
                </TableCell>
                <TableCell className="py-2 px-3 w-8">
                  <button
                    onClick={() => handleChartClick("impressions", "Aggregated Impressions")}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Maximize className="h-3 w-3" />
                  </button>
                </TableCell>
              </TableRow>

              {/* Clicks Row */}
              <TableRow className="hover:bg-gray-50/50">
                <TableCell className="py-2 px-3 w-20">
                  <div className="text-xs font-medium text-gray-700">CLK</div>
                </TableCell>
                <TableCell className="py-2 px-3 w-24 text-right">
                  <div className="text-sm font-medium">
                    {formatters.number(totals.clicks)}
                  </div>
                </TableCell>
                <TableCell className="py-2 px-3 w-20 text-right">
                  <div className={`text-xs flex items-center justify-end gap-1 ${getTrendColor(trends.clicks)}`}>
                    {getTrendIcon(trends.clicks)}
                    {formatters.percentage(trends.clicks)}
                  </div>
                </TableCell>
                <TableCell className="py-2 px-3 w-32">
                  <div
                    className="cursor-pointer"
                    onClick={() => handleChartClick("clicks", "Aggregated Clicks")}
                  >
                    {createSparkChart(timeSeriesData, "CLICKS", "#10B981")}
                  </div>
                </TableCell>
                <TableCell className="py-2 px-3 w-8">
                  <button
                    onClick={() => handleChartClick("clicks", "Aggregated Clicks")}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Maximize className="h-3 w-3" />
                  </button>
                </TableCell>
              </TableRow>

              {/* CTR Row */}
              <TableRow className="hover:bg-gray-50/50">
                <TableCell className="py-2 px-3 w-20">
                  <div className="text-xs font-medium text-gray-700">CTR</div>
                </TableCell>
                <TableCell className="py-2 px-3 w-24 text-right">
                  <div className="text-sm font-medium">
                    {formatters.ctr(totals.ctr)}
                  </div>
                </TableCell>
                <TableCell className="py-2 px-3 w-20 text-right">
                  <div className={`text-xs flex items-center justify-end gap-1 ${getTrendColor(trends.ctr)}`}>
                    {getTrendIcon(trends.ctr)}
                    {formatters.percentage(trends.ctr)}
                  </div>
                </TableCell>
                <TableCell className="py-2 px-3 w-32">
                  <div
                    className="cursor-pointer"
                    onClick={() => handleChartClick("ctr", "Aggregated CTR")}
                  >
                    {createSparkChart(timeSeriesData, "CTR", "#F59E0B")}
                  </div>
                </TableCell>
                <TableCell className="py-2 px-3 w-8">
                  <button
                    onClick={() => handleChartClick("ctr", "Aggregated CTR")}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Maximize className="h-3 w-3" />
                  </button>
                </TableCell>
              </TableRow>

              {/* Revenue Row */}
              <TableRow className="hover:bg-gray-50/50">
                <TableCell className="py-2 px-3 w-20">
                  <div className="text-xs font-medium text-gray-700">REV</div>
                </TableCell>
                <TableCell className="py-2 px-3 w-24 text-right">
                  <div className="text-sm font-medium">
                    {formatters.revenue(totals.revenue)}
                  </div>
                </TableCell>
                <TableCell className="py-2 px-3 w-20 text-right">
                  <div className={`text-xs flex items-center justify-end gap-1 ${getTrendColor(trends.revenue)}`}>
                    {getTrendIcon(trends.revenue)}
                    {formatters.percentage(trends.revenue)}
                  </div>
                </TableCell>
                <TableCell className="py-2 px-3 w-32">
                  <div
                    className="cursor-pointer"
                    onClick={() => handleChartClick("revenue", "Aggregated Revenue")}
                  >
                    {createSparkChart(timeSeriesData, "REVENUE", "#EF4444")}
                  </div>
                </TableCell>
                <TableCell className="py-2 px-3 w-8">
                  <button
                    onClick={() => handleChartClick("revenue", "Aggregated Revenue")}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Maximize className="h-3 w-3" />
                  </button>
                </TableCell>
              </TableRow>

              {/* Transactions Row */}
              <TableRow className="hover:bg-gray-50/50">
                <TableCell className="py-2 px-3 w-20">
                  <div className="text-xs font-medium text-gray-700">TXN</div>
                </TableCell>
                <TableCell className="py-2 px-3 w-24 text-right">
                  <div className="text-sm font-medium">
                    {formatters.number(totals.transactions)}
                  </div>
                </TableCell>
                <TableCell className="py-2 px-3 w-20 text-right">
                  <div className={`text-xs flex items-center justify-end gap-1 ${getTrendColor(trends.transactions)}`}>
                    {getTrendIcon(trends.transactions)}
                    {formatters.percentage(trends.transactions)}
                  </div>
                </TableCell>
                <TableCell className="py-2 px-3 w-32">
                  <div
                    className="cursor-pointer"
                    onClick={() => handleChartClick("transactions", "Aggregated Transactions")}
                  >
                    {createSparkChart(timeSeriesData, "TRANSACTIONS", "#8B5CF6")}
                  </div>
                </TableCell>
                <TableCell className="py-2 px-3 w-8">
                  <button
                    onClick={() => handleChartClick("transactions", "Aggregated Transactions")}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Maximize className="h-3 w-3" />
                  </button>
                </TableCell>
              </TableRow>

              {/* ROAS Row */}
              <TableRow className="hover:bg-gray-50/50">
                <TableCell className="py-2 px-3 w-20">
                  <div className="text-xs font-medium text-gray-700">ROAS</div>
                </TableCell>
                <TableCell className="py-2 px-3 w-24 text-right">
                  <div className="text-sm font-medium">
                    {formatters.roas(totals.roas)}
                  </div>
                </TableCell>
                <TableCell className="py-2 px-3 w-20 text-right">
                  <div className={`text-xs flex items-center justify-end gap-1 ${getTrendColor(trends.roas)}`}>
                    {getTrendIcon(trends.roas)}
                    {formatters.percentage(trends.roas)}
                  </div>
                </TableCell>
                <TableCell className="py-2 px-3 w-32">
                  <div
                    className="cursor-pointer"
                    onClick={() => handleChartClick("roas", "Aggregated ROAS")}
                  >
                    {createSparkChart(timeSeriesData, "ROAS", "#EC4899")}
                  </div>
                </TableCell>
                <TableCell className="py-2 px-3 w-8">
                  <button
                    onClick={() => handleChartClick("roas", "Aggregated ROAS")}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Maximize className="h-3 w-3" />
                  </button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Spark Chart Modal */}
      <SparkChartModal
        isOpen={modalData.isOpen}
        onClose={closeModal}
        title={modalData.title}
        data={modalData.data}
        metricType={modalData.metricType}
      />
    </>
  );
};