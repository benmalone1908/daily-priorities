
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
  // For percentage metrics (like CTR and ROAS), detect by both key and title
  const isPercentageMetric = dataKey === "ctr" || 
                            title.toLowerCase().includes("ctr") || 
                            title.toLowerCase().includes("click-through");
  
  const isRoasMetric = dataKey === "roas" || 
                      title.toLowerCase().includes("roas") || 
                      title.toLowerCase().includes("return on");
  
  // Detailed logging for debugging
  console.log(`SparkChartModal rendering for: "${title}"`);
  console.log(`dataKey: "${dataKey}" | isPercentage: ${isPercentageMetric} | isRoas: ${isRoasMetric}`);
  console.log("Data length:", data?.length || 0);
  
  // Safety check for data
  if (!data || data.length === 0) {
    console.log("No data available for chart!");
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="h-[400px] flex items-center justify-center">
            No data available to display
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  // Process values with detailed logging
  const values = data.map((item, index) => {
    // Handle both object access and direct value
    let rawValue;
    if (typeof item === 'object' && item !== null) {
      rawValue = item[dataKey];
    } else {
      rawValue = item;
    }
    
    const value = parseFloat(rawValue);
    console.log(`Data point ${index}: raw="${rawValue}", parsed=${value}, date=${item.date || 'unknown'}`);
    return isNaN(value) ? 0 : value;
  });
  
  console.log("All processed values:", values);
  
  // Calculate domain with safety checks
  let minValue = 0;
  let maxValue = 0;
  
  if (values.length > 0) {
    minValue = Math.min(...values);
    maxValue = Math.max(...values);
  }
  
  console.log(`Min value: ${minValue}, Max value: ${maxValue}`);
  
  // Determine Y-axis domain with special handling for percentages
  let yAxisDomain: [number, number] = [0, 0];
  
  if (isPercentageMetric) {
    console.log("Using percentage scaling for Y-axis");
    
    // For CTR (typically very small numbers like 0.01 = 1%)
    if (maxValue <= 0.0001) {
      // No meaningful data, show a small range
      yAxisDomain = [0, 0.001]; // 0% to 0.1%
    } else if (maxValue < 0.1) {
      // Small percentages, scale appropriately
      yAxisDomain = [0, Math.max(maxValue * 2, 0.01)];
    } else {
      // Normal percentage range
      yAxisDomain = [0, Math.max(maxValue * 1.2, 0.5)];
    }
  } else if (isRoasMetric) {
    console.log("Using ROAS scaling for Y-axis");
    
    // For ROAS, we want to start at 0 but give enough headroom
    if (maxValue <= 0.0001) {
      yAxisDomain = [0, 2]; // Default range if no data
    } else {
      yAxisDomain = [0, Math.max(maxValue * 1.5, 2)];
    }
  } else {
    console.log("Using standard metric scaling for Y-axis");
    // For standard metrics like impressions, clicks
    yAxisDomain = [
      Math.max(0, minValue * 0.9), // Don't go below zero
      Math.max(10, maxValue * 1.1)  // Ensure minimum visibility and add 10% at top
    ];
  }
  
  console.log(`Final Y-axis domain: [${yAxisDomain[0]}, ${yAxisDomain[1]}]`);
  
  // Create appropriate formatters for different metric types
  const effectiveFormatter = (value: number): string => {
    if (isPercentageMetric) {
      return `${(value * 100).toFixed(2)}%`;
    } else if (isRoasMetric) {
      return `${value.toFixed(2)}x`;
    } else {
      return valueFormatter(value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="h-[400px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={data} 
              margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
              onMouseMove={(e) => console.log("Chart mouse event:", e)}
            >
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
                isAnimationActive={false}
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
