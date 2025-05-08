
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatNumber } from "@/lib/utils";

interface SparkChartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  data: any[];
  dataKey: string;
  color: string;
  gradientId: string;
  valueFormatter?: (value: number) => string;
  labelFormatter?: (label: string) => string;
}

const SparkChartModal = ({
  open,
  onOpenChange,
  title,
  data,
  dataKey,
  color,
  gradientId,
  valueFormatter = (value) => formatNumber(value, { abbreviate: false }),
  labelFormatter = (label) => label,
}: SparkChartModalProps) => {
  // For percentage metrics (like CTR and ROAS), we need to properly format the domain
  const isPercentageMetric = dataKey === "ctr" || title.includes("CTR");
  const isRoasMetric = dataKey === "roas" || title.includes("ROAS");
  
  // Determine min and max values for better Y-axis scaling
  const values = data.map(item => parseFloat(item[dataKey]) || 0);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  
  // Add a small buffer to the min/max for better visualization
  const yAxisDomain = [
    Math.max(0, minValue * 0.9),  // Ensure we don't go below zero
    maxValue * 1.1                 // Add 10% buffer at the top
  ];

  // Handle edge cases where all values are zero
  if (maxValue === 0 && minValue === 0) {
    yAxisDomain[1] = isPercentageMetric ? 1 : 10;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="h-[400px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 30 }}>
              <defs>
                <linearGradient id={`modal-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }} 
                tickMargin={10}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={valueFormatter}
                domain={yAxisDomain}
                allowDecimals={true}
              />
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <Tooltip 
                formatter={(value: any) => [valueFormatter(value), title]}
                labelFormatter={labelFormatter}
                contentStyle={{ 
                  backgroundColor: "rgba(255, 255, 255, 0.95)", 
                  border: "1px solid #eee",
                  borderRadius: "4px",
                  padding: "8px 12px",
                  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)"
                }}
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                fill={`url(#modal-${gradientId})`}
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
