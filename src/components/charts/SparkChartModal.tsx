import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Eye, MousePointer, ShoppingCart, DollarSign, Percent, TrendingUp } from "lucide-react";
import { SparkChartModalData, SparkChartMetricType, SparkChartDataPoint } from "@/types/sparkCharts";
import { formatNumber } from "@/lib/utils";

interface SparkChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: SparkChartDataPoint[];
  metricType: SparkChartMetricType;
}

/**
 * Modal component for expanded spark chart view
 * Created specifically for the refactored spark chart system
 */
const SparkChartModal = ({
  isOpen,
  onClose,
  title,
  data,
  metricType
}: SparkChartModalProps) => {

  // Define metric configurations
  const getMetricConfig = (metric: SparkChartMetricType) => {
    switch (metric) {
      case "impressions":
        return {
          title: "Impressions",
          color: "#3B82F6",
          icon: Eye,
          formatter: (value: number) => formatNumber(value, { abbreviate: true })
        };
      case "clicks":
        return {
          title: "Clicks",
          color: "#10B981",
          icon: MousePointer,
          formatter: (value: number) => formatNumber(value, { abbreviate: true })
        };
      case "ctr":
        return {
          title: "CTR",
          color: "#F59E0B",
          icon: Percent,
          formatter: (value: number) => `${value.toFixed(2)}%`
        };
      case "transactions":
        return {
          title: "Transactions",
          color: "#8B5CF6",
          icon: ShoppingCart,
          formatter: (value: number) => formatNumber(value, { abbreviate: true })
        };
      case "revenue":
        return {
          title: "Attributed Sales",
          color: "#EF4444",
          icon: DollarSign,
          formatter: (value: number) => `$${formatNumber(value, { abbreviate: false })}`
        };
      case "roas":
        return {
          title: "ROAS",
          color: "#EC4899",
          icon: TrendingUp,
          formatter: (value: number) => formatNumber(value, { decimals: 2, suffix: 'x' })
        };
    }
  };

  const config = getMetricConfig(metricType);
  const gradientId = `gradient-modal-${metricType}`;

  // Prepare chart data with the specific metric values
  const chartData = data.map(point => ({
    ...point,
    value: (point as SparkChartDataPoint & Record<SparkChartMetricType, number>)[metricType] || 0
  }));

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; color?: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-sm" style={{ color: config.color }}>
            {config.title}: {value === 0 ? "0 (Campaign paused)" : config.formatter(value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[900px] w-full max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <config.icon className="h-5 w-5" style={{ color: config.color }} />
            {title} - {config.title}
          </DialogTitle>
        </DialogHeader>

        <div className="w-full h-[400px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={config.color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={config.color} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  if (typeof value === 'number') {
                    if (value >= 1000000) {
                      return `${(value / 1000000).toFixed(1)}M`;
                    } else if (value >= 1000) {
                      return `${(value / 1000).toFixed(1)}K`;
                    }
                    return value.toLocaleString();
                  }
                  return value;
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={config.color}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
                strokeWidth={2}
                connectNulls={false}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SparkChartModal;