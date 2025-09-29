import { useMemo } from "react";
import { ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Maximize, Building } from "lucide-react";
import { SparkChartProps, SparkChartDataPoint } from "@/types/sparkCharts";
import { formatNumber } from "@/lib/utils";

/**
 * Individual Spark Chart Component
 * Extracted from CampaignSparkCharts.tsx for better reusability
 */
const SparkChart = ({
  item,
  metric,
  config,
  onChartClick,
  className = ""
}: SparkChartProps) => {

  // Prepare chart data with the specific metric values
  const chartData = useMemo(() => {
    return item.data.map(point => {
      let value = 0;

      switch (metric) {
        case "impressions":
          value = (point as SparkChartDataPoint & { impressions?: number }).impressions || 0;
          break;
        case "clicks":
          value = (point as SparkChartDataPoint & { clicks?: number }).clicks || 0;
          break;
        case "ctr":
          value = (point as SparkChartDataPoint & { ctr?: number }).ctr || 0;
          break;
        case "transactions":
          value = (point as SparkChartDataPoint & { transactions?: number }).transactions || 0;
          break;
        case "revenue":
          value = (point as SparkChartDataPoint & { revenue?: number }).revenue || 0;
          break;
        case "roas":
          value = (point as SparkChartDataPoint & { roas?: number }).roas || 0;
          break;
        default:
          value = 0;
      }

      return {
        ...point,
        value
      };
    });
  }, [item.data, metric]);

  // Get current metric value for display
  const currentValue = useMemo(() => {
    switch (metric) {
      case "impressions":
        return item.totals.impressions;
      case "clicks":
        return item.totals.clicks;
      case "ctr":
        return item.totals.ctr;
      case "transactions":
        return item.totals.transactions;
      case "revenue":
        return item.totals.revenue;
      case "roas":
        return item.totals.roas;
      default:
        return 0;
    }
  }, [item.totals, metric]);

  // Calculate trend (comparing last two data points)
  const trend = useMemo(() => {
    if (chartData.length < 2) return 0;

    const lastPoint = chartData[chartData.length - 1];
    const secondLastPoint = chartData[chartData.length - 2];

    if (secondLastPoint.value === 0) {
      return lastPoint.value > 0 ? 100 : 0;
    }

    return ((lastPoint.value - secondLastPoint.value) / secondLastPoint.value) * 100;
  }, [chartData]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; color?: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded shadow-lg text-xs">
          <p className="font-medium">{label}</p>
          <p className="text-blue-600">
            {config.title}: {config.formatter(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Handle chart click
  const handleChartClick = () => {
    onChartClick(item.name, metric, chartData);
  };

  return (
    <Card className={`hover:shadow-md transition-shadow cursor-pointer ${className}`}>
      <CardHeader className="pb-2">
        {/* Header with title and agency info */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium leading-tight truncate" title={item.name}>
              {item.name}
            </CardTitle>
            {item.agency && (
              <div className="flex items-center gap-1 mt-1">
                <Building className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground truncate" title={item.agency}>
                  {item.agency}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleChartClick}
            className="text-muted-foreground hover:text-foreground p-1 -m-1"
            title="Expand chart"
          >
            <Maximize className="h-3 w-3" />
          </button>
        </div>

        {/* Metric row */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <config.icon className="h-4 w-4" style={{ color: config.color }} />
            <span className="text-xs font-medium text-muted-foreground">{config.title}</span>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold">{config.formatter(currentValue)}</div>
            {Math.abs(trend) >= 0.1 && (
              <div className={`text-xs ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Chart area */}
      <div className="px-4 pb-4">
        <div className="h-16 w-full" onClick={handleChartClick}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={`gradient-${metric}-${item.name.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={config.color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={config.color} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={config.color}
                fillOpacity={1}
                fill={`url(#gradient-${metric}-${item.name.replace(/\s+/g, '-')})`}
                strokeWidth={1.5}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Tooltip content={<CustomTooltip />} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
};

export default SparkChart;