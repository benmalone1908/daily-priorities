import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { formatNumber } from "@/lib/utils";

interface DisplayMetricsChartProps {
  data: any[];
  barSize: number;
  formatTooltipValue: (value: any, name: string) => [string, string];
}

export const DisplayMetricsChart = ({ data, barSize, formatTooltipValue }: DisplayMetricsChartProps) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data}>
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis yAxisId="left" tickFormatter={(value) => formatNumber(value)} tick={{ fontSize: 10 }} />
        <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => formatNumber(value)} tick={{ fontSize: 10 }} />
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
        <Bar
          dataKey="IMPRESSIONS"
          fill="#4ade80"
          yAxisId="left"
          name="Impressions"
          barSize={barSize}
          opacity={0.8}
        />
        <Line
          type="monotone"
          dataKey="CLICKS"
          stroke="#f59e0b"
          strokeWidth={2}
          yAxisId="right"
          name="Clicks"
          dot={false}
          connectNulls={true}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};