
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
  const isPercentageMetric = dataKey === "ctr" || title.toLowerCase().includes("ctr");
  const isRoasMetric = dataKey === "roas" || title.toLowerCase().includes("roas");
  
  // Log for debugging
  console.log(`Chart modal opened for: ${title}, dataKey: ${dataKey}, isPercentage: ${isPercentageMetric}, isRoas: ${isRoasMetric}`);
  console.log("Modal data:", data);
  
  // Make sure we parse values correctly - some might be strings
  const values = data.map(item => {
    const value = parseFloat(item[dataKey]);
    console.log(`Value for ${item.date || 'unknown date'}: ${value}`);
    return isNaN(value) ? 0 : value;
  });
  
  console.log("Processed values:", values);
  
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  
  console.log(`Min value: ${minValue}, Max value: ${maxValue}`);
  
  // For percentage metrics, ensure the scale makes sense
  let yAxisDomain: [number, number];
  
  if (isPercentageMetric || isRoasMetric) {
    // For percentages, typically we want to show 0-100% range or at least include 0
    // unless all values are concentrated in a narrow range
    const range = maxValue - minValue;
    
    if (range < 0.05 && maxValue > 0) {
      // Very narrow range (less than 5 percentage points), create a more focused view
      yAxisDomain = [
        Math.max(0, minValue - range), // Go slightly below min but not below 0
        maxValue + range * 2 // Give some headroom
      ];
    } else {
      // Normal case - start at 0 with some headroom at top
      yAxisDomain = [0, Math.max(maxValue * 1.2, minValue + 0.1)];
    }
  } else {
    // For non-percentage metrics, provide a good visual range
    yAxisDomain = [
      Math.max(0, minValue * 0.9), // Ensure we don't go below zero
      maxValue * 1.1              // Add 10% buffer at the top
    ];
  }
  
  // Handle edge cases where all values are zero or very close to zero
  if (maxValue < 0.001) {
    yAxisDomain = isPercentageMetric ? [0, 0.01] : [0, 10];
  }
  
  console.log(`Using Y-axis domain: [${yAxisDomain[0]}, ${yAxisDomain[1]}]`);

  // For percentage metrics, create a special formatter
  const effectiveFormatter = isPercentageMetric 
    ? (value: number) => `${(value * 100).toFixed(2)}%` 
    : isRoasMetric 
      ? (value: number) => `${value.toFixed(2)}x`
      : valueFormatter;

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
                tickFormatter={effectiveFormatter}
                domain={yAxisDomain}
                allowDecimals={true}
              />
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <Tooltip 
                formatter={(value: any) => [effectiveFormatter(value), title]}
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
