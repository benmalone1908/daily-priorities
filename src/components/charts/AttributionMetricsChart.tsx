import { CampaignDataRow } from '@/types/campaign';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { formatNumber } from "@/lib/utils";

interface AttributionMetricsChartProps {
  data: CampaignDataRow[];
  barSize: number;
  formatTooltipValue: (value: unknown, name: string) => [string, string];
}

export const AttributionMetricsChart = ({ data, barSize, formatTooltipValue }: AttributionMetricsChartProps) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data}>
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis yAxisId="left" tickFormatter={(value) => formatNumber(value)} tick={{ fontSize: 10 }} />
        <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `$${formatNumber(value)}`} tick={{ fontSize: 10 }} />
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
        <Tooltip
          formatter={formatTooltipValue}
          contentStyle={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            border: "1px solid #eee",
            borderRadius: "4px",
            padding: "8px 12px",
            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)"
          }}
        />
        <Line
          type="monotone"
          dataKey="TRANSACTIONS"
          stroke="#ef4444"
          strokeWidth={2}
          yAxisId="left"
          name="Transactions"
          dot={false}
          connectNulls={true}
        />
        <Bar
          dataKey="REVENUE"
          fill="#8b5cf6"
          yAxisId="right"
          name="Attributed Sales"
          barSize={barSize}
          opacity={0.8}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};