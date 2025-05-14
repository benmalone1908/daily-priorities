
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { formatNumber as formatNum } from "@/lib/utils";
import AnomalyDetails from "./AnomalyDetails";

interface MetricCardProps {
  title: string;
  value?: number;
  trend?: number;
  anomalies?: any[];
  metric?: string;
  anomalyPeriod?: "daily" | "weekly";
}

const MetricCard = ({ 
  title, 
  value, 
  trend = 0, 
  anomalies = [], 
  metric = "", 
  anomalyPeriod = "daily" 
}: MetricCardProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  
  const formatValue = (val: number) => {
    if (metric === "REVENUE") {
      return `$${Math.round(val).toLocaleString()}`;
    }
    return formatNum(val);
  };

  // Format the display value based on whether it's a summary card or anomaly card
  const displayValue = value !== undefined ? 
    (metric === "REVENUE" ? `$${Math.round(value).toLocaleString()}` : formatNum(value)) : 
    null;
  
  return (
    <Card className="p-4 relative">
      <div className="flex items-center mb-2">
        <h3 className="text-base font-semibold">{title}</h3>
        {anomalies && anomalies.length > 0 && (
          <div className="ml-auto flex items-center">
            <AlertTriangle className="mr-1 h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">{anomalies.length}</span>
          </div>
        )}
      </div>
      
      {/* Show the value if it's a summary card */}
      {displayValue !== null && (
        <div className="mt-2 mb-1">
          <div className="text-2xl font-bold">{displayValue}</div>
          {trend !== 0 && (
            <div className="flex items-center text-xs">
              {trend > 0 ? (
                <>
                  <TrendingUp className="h-3.5 w-3.5 text-green-500 mr-1" />
                  <span className="text-green-500">+{trend}% from previous period</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3.5 w-3.5 text-red-500 mr-1" />
                  <span className="text-red-500">{trend}% from previous period</span>
                </>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Show anomalies if available */}
      {anomalies && anomalies.length > 0 ? (
        <div className="space-y-3 mt-4">
          {anomalies.slice(0, 3).map((anomaly, i) => {
            const isIncrease = anomaly.deviation > 0;
            const absDeviation = Math.abs(anomaly.deviation);
            let severityClass = "";
            
            if (absDeviation > 50) {
              severityClass = isIncrease ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200";
            } else if (absDeviation > 25) {
              severityClass = isIncrease ? "bg-orange-50 border-orange-200" : "bg-sky-50 border-sky-200";
            } else {
              severityClass = isIncrease ? "bg-amber-50 border-amber-200" : "bg-teal-50 border-teal-200";
            }
            
            return (
              <div
                key={i}
                className={`p-3 rounded-md border ${severityClass} cursor-pointer hover:opacity-90 transition-opacity`}
                onClick={() => setSelectedIndex(i)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-medium truncate max-w-[180px]">
                    {anomaly.campaign}
                  </div>
                  <div className="flex items-center">
                    {isIncrease ? (
                      <TrendingUp className="h-3.5 w-3.5 text-red-500 mr-1" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-blue-500 mr-1" />
                    )}
                    <span className={`text-xs font-semibold ${isIncrease ? "text-red-500" : "text-blue-500"}`}>
                      {isIncrease ? "+" : ""}{anomaly.deviation.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Actual</span>
                    <span className="text-sm font-semibold">{formatValue(anomaly.actualValue)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">{anomaly.periodType === "weekly" ? "Previous" : "Average"}</span>
                    <span className="text-sm font-semibold">{formatValue(anomaly.mean)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Date</span>
                    <span className="text-sm">{anomaly.DATE.split(' ')[0]}</span>
                  </div>
                </div>
              </div>
            );
          })}
          
          {anomalies.length > 3 && (
            <button
              className="w-full py-1.5 text-xs font-medium text-center text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setSelectedIndex(-1)} // Using -1 as a special indicator to view all anomalies
            >
              View {anomalies.length - 3} more...
            </button>
          )}
        </div>
      ) : (
        anomalies && (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">No anomalies detected</p>
          </div>
        )
      )}
      
      {anomalies && selectedIndex !== null && (
        <AnomalyDetails 
          anomalies={anomalies}
          initialIndex={selectedIndex}
          metric={metric}
          onClose={() => setSelectedIndex(null)}
          anomalyPeriod={anomalyPeriod}
        />
      )}
    </Card>
  );
};

export default MetricCard;
