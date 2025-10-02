import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { CampaignDataRow } from "@/types/campaign";
import { formatNumber, formatCurrency, formatCTRPercentage, formatTransactions, formatAOVValue } from "@/lib/formatters";
import { calculatePeriodMetrics, getTrendInfo } from "@/lib/dashboardCalculations";

interface MetricCardsProps {
  currentPeriodData: CampaignDataRow[];
  previousPeriodData: CampaignDataRow[];
  comparisonPeriod: string;
}

interface MetricConfig {
  title: string;
  current: number;
  previous?: number;
  format: (value: number) => string;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  currentPeriodData,
  previousPeriodData,
  comparisonPeriod
}) => {
  const currentMetrics = calculatePeriodMetrics(currentPeriodData);
  const previousMetrics = calculatePeriodMetrics(previousPeriodData);

  const metrics: MetricConfig[] = [
    {
      title: "Impressions",
      current: currentMetrics.impressions,
      previous: previousMetrics.impressions,
      format: formatNumber
    },
    {
      title: "Clicks",
      current: currentMetrics.clicks,
      previous: previousMetrics.clicks,
      format: formatNumber
    },
    {
      title: "CTR",
      current: currentMetrics.ctr,
      previous: previousMetrics.ctr,
      format: formatCTRPercentage
    },
    {
      title: "Transactions",
      current: currentMetrics.transactions,
      previous: previousMetrics.transactions,
      format: formatTransactions
    },
    {
      title: "Attributed Sales",
      current: currentMetrics.revenue,
      previous: previousMetrics.revenue,
      format: (value: number) => formatCurrency(value, { compact: true })
    },
    {
      title: "AOV",
      current: currentMetrics.aov,
      previous: previousMetrics.aov,
      format: formatAOVValue
    },
    {
      title: "ROAS",
      current: currentMetrics.roas,
      previous: previousMetrics.roas,
      format: (value: number) => `${value.toFixed(2)}x`
    }
  ];

  const hasComparison = previousPeriodData && previousPeriodData.length > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
      {metrics.map((metric, index) => {
        const percentChange = hasComparison && metric.previous !== undefined
          ? ((metric.current - metric.previous) / (metric.previous || 1)) * 100
          : 0;

        const trendInfo = getTrendInfo(percentChange, metric.title !== 'spend');

        return (
          <Card key={index} className="p-4 hover:shadow-md transition-shadow">
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                {metric.title}
              </div>

              <div className="space-y-1">
                <div className="text-base font-bold">
                  {metric.format(metric.current)}
                </div>

                {hasComparison && metric.previous !== undefined && (
                  <div className={`flex items-center text-xs ${trendInfo.colorClasses}`}>
                    {trendInfo.isPositive ? (
                      <TrendingUp className="mr-1 h-3 w-3" />
                    ) : (
                      <TrendingDown className="mr-1 h-3 w-3" />
                    )}
                    <span className="font-medium">
                      {Math.abs(percentChange).toFixed(1)}%
                    </span>
                    <span className="text-gray-500 ml-1">
                      vs prev {comparisonPeriod}d
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};