import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface CustomMetricsChartProps {
  data: any[];
  barSize: number;
  customBarMetric: string;
  customLineMetric: string;
  barFormatter: (value: number) => string;
  lineFormatter: (value: number) => string;
  barLabel: string;
  lineLabel: string;
  formatTooltipValue: (value: any, name: string) => [string, string];
}

export const CustomMetricsChart = ({
  data,
  barSize,
  customBarMetric,
  customLineMetric,
  barFormatter,
  lineFormatter,
  barLabel,
  lineLabel,
  formatTooltipValue
}: CustomMetricsChartProps) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data}>
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis yAxisId="left" tickFormatter={(value) => barFormatter(value)} tick={{ fontSize: 10 }} />
        <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => lineFormatter(value)} tick={{ fontSize: 10 }} />
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
          dataKey={customBarMetric}
          fill="#3b82f6"
          yAxisId="left"
          name={barLabel}
          barSize={barSize}
          opacity={0.8}
        />
        <Line
          type="monotone"
          dataKey={customLineMetric}
          stroke="#eab308"
          strokeWidth={2}
          yAxisId="right"
          name={lineLabel}
          dot={false}
          connectNulls={true}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};