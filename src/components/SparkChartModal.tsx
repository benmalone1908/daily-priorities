
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
  // Case-insensitive key matching for metrics
  const lowerDataKey = dataKey.toLowerCase();
  
  // For percentage metrics (like CTR and ROAS), detect by both key and title
  const isPercentageMetric = lowerDataKey === "ctr" || 
                            title.toLowerCase().includes("ctr") || 
                            title.toLowerCase().includes("click-through");
  
  const isRoasMetric = lowerDataKey === "roas" || 
                      title.toLowerCase().includes("roas") || 
                      title.toLowerCase().includes("return on");
  
  // Detailed logging for debugging
  console.log(`SparkChartModal rendering for: "${title}"`);
  console.log(`dataKey: "${dataKey}" | isPercentage: ${isPercentageMetric} | isRoas: ${isRoasMetric}`);
  console.log("Data length:", data?.length || 0);
  if (data?.length > 0) {
    console.log("Sample data point:", JSON.stringify(data[0], null, 2));
  }
  
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
  
  // Create processed data array with calculated CTR and ROAS if needed
  const processedData = data.map(item => {
    if (!item) return null;
    
    const newItem = { ...item };
    
    // For CTR, calculate or use existing value
    if (isPercentageMetric) {
      // Try to find CTR in different case variations
      let ctrValue = item.CTR ?? item.ctr ?? item.Ctr;
      
      // If CTR not found but we have impressions and clicks, calculate it
      if (ctrValue === undefined) {
        const impressions = Number(item.IMPRESSIONS || item.impressions || 0);
        const clicks = Number(item.CLICKS || item.clicks || 0);
        if (impressions > 0) {
          ctrValue = (clicks / impressions) * 100; // As percentage
        } else {
          ctrValue = 0;
        }
      }
      
      // Ensure it's a valid number
      ctrValue = Number(ctrValue);
      if (isNaN(ctrValue)) ctrValue = 0;
      
      // Add both uppercase and lowercase versions
      newItem.CTR = ctrValue;
      newItem.ctr = ctrValue;
    }
    
    // For ROAS, calculate or use existing value
    if (isRoasMetric) {
      // Try to find ROAS in different case variations
      let roasValue = item.ROAS ?? item.roas ?? item.Roas;
      
      // If ROAS not found but we have revenue and spend info, calculate it
      if (roasValue === undefined) {
        const revenue = Number(item.REVENUE || item.revenue || 0);
        // Use provided spend directly instead of estimating
        const spend = Number(item.SPEND || item.spend || 0);
        
        if (spend > 0) {
          roasValue = revenue / spend;
        } else {
          roasValue = 0;
        }
      }
      
      // Ensure it's a valid number
      roasValue = Number(roasValue);
      if (isNaN(roasValue)) roasValue = 0;
      
      // Add both uppercase and lowercase versions
      newItem.ROAS = roasValue;
      newItem.roas = roasValue;
    }
    
    return newItem;
  }).filter(Boolean);
  
  console.log("Processed data for chart:", processedData.slice(0, 2));
  
  // Process values with detailed logging
  const values = processedData.map((item, index) => {
    // Create a consistent dataKey that matches our processed data
    const effectiveKey = isPercentageMetric ? (isPercentageMetric ? "CTR" : dataKey.toUpperCase()) :
                        isRoasMetric ? "ROAS" : dataKey.toUpperCase();
    
    const rawValue = item[effectiveKey];
    const value = parseFloat(rawValue);
    console.log(`Data point ${index}: key="${effectiveKey}", raw=${rawValue}, parsed=${value}`);
    return isNaN(value) ? 0 : value;
  });
  
  console.log("All processed values:", values.slice(0, 5), "...");
  
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

  // Create a case-insensitive accessor function for the Area component
  const dataKeyAccessor = (item: any) => {
    if (!item) return 0;
    
    // For percentage metrics, use the consistent keys we created
    if (isPercentageMetric) {
      return parseFloat(item.CTR) || 0;
    } else if (isRoasMetric) {
      return parseFloat(item.ROAS) || 0;
    }
    
    // Otherwise try all case variations
    // Try original case
    let value = item[dataKey];
    
    // Try lowercase if original not found
    if (value === undefined) {
      value = item[dataKey.toLowerCase()];
    }
    
    // Try uppercase if still not found
    if (value === undefined) {
      value = item[dataKey.toUpperCase()];
    }
    
    return parseFloat(value) || 0;
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
              data={processedData} 
              margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
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
                dataKey={dataKeyAccessor}
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
