
import { useMemo } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { CampaignHealthData } from "@/utils/campaignHealthScoring";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart";

interface CampaignHealthScatterPlotProps {
  healthData: CampaignHealthData[];
}

const CampaignHealthScatterPlot = ({ healthData }: CampaignHealthScatterPlotProps) => {
  const chartData = useMemo(() => {
    return healthData.map(campaign => ({
      x: campaign.completionPercentage,
      y: campaign.healthScore,
      name: campaign.campaignName,
      fill: getHealthColor(campaign.healthScore)
    }));
  }, [healthData]);

  const chartConfig = {
    healthScore: {
      label: "Health Score",
    },
    completionPercentage: {
      label: "Completion %",
    },
  };

  if (healthData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No campaign health data available for plotting
      </div>
    );
  }

  return (
    <div className="w-full h-[500px]">
      <ChartContainer config={chartConfig}>
        <ScatterChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis 
            type="number" 
            dataKey="x" 
            name="Completion %"
            domain={[0, 100]}
            tick={{ fontSize: 12 }}
            label={{ value: 'Campaign Completion (%)', position: 'insideBottom', offset: -10 }}
          />
          <YAxis 
            type="number" 
            dataKey="y" 
            name="Health Score"
            domain={[0, 10]}
            tick={{ fontSize: 12 }}
            label={{ value: 'Health Score', angle: -90, position: 'insideLeft' }}
          />
          
          {/* Reference lines for health score thresholds */}
          <ReferenceLine y={7} stroke="#22c55e" strokeDasharray="5 5" opacity={0.5} />
          <ReferenceLine y={4} stroke="#f59e0b" strokeDasharray="5 5" opacity={0.5} />
          
          <ChartTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 border rounded shadow-lg">
                    <p className="font-medium text-sm">{data.name}</p>
                    <p className="text-sm text-gray-600">
                      Health Score: <span className="font-medium">{data.y}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Completion: <span className="font-medium">{data.x.toFixed(1)}%</span>
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          
          <Scatter 
            dataKey="y"
          />
        </ScatterChart>
      </ChartContainer>
    </div>
  );
};

function getHealthColor(healthScore: number): string {
  if (healthScore >= 7) return "#22c55e"; // Green for healthy
  if (healthScore >= 4) return "#f59e0b"; // Yellow/Orange for warning
  return "#ef4444"; // Red for critical
}

export default CampaignHealthScatterPlot;
