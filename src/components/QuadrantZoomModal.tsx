
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { CampaignHealthData } from "@/utils/campaignHealthScoring";
import { ChartContainer, ChartTooltip } from "./ui/chart";
import { useMemo } from "react";

interface QuadrantZoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  healthData: CampaignHealthData[];
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

const QuadrantZoomModal = ({
  open,
  onOpenChange,
  healthData,
  xMin,
  xMax,
  yMin,
  yMax
}: QuadrantZoomModalProps) => {
  const filteredData = useMemo(() => {
    return healthData
      .filter(campaign => 
        campaign.completionPercentage >= xMin && 
        campaign.completionPercentage <= xMax &&
        campaign.healthScore >= yMin && 
        campaign.healthScore <= yMax
      )
      .map(campaign => ({
        x: campaign.completionPercentage,
        y: campaign.healthScore,
        name: campaign.campaignName,
        fill: getHealthColor(campaign.healthScore)
      }));
  }, [healthData, xMin, xMax, yMin, yMax]);

  const chartConfig = {
    healthScore: {
      label: "Health Score",
    },
    completionPercentage: {
      label: "Completion %",
    },
  };

  // Generate ticks for the zoomed view with proper bounds checking
  const xTicks = useMemo(() => {
    if (xMax <= xMin) return [xMin]; // Prevent invalid range
    
    const ticks = [];
    const increment = (xMax - xMin) / 5;
    
    // Ensure we don't create too many ticks
    if (increment <= 0) return [xMin, xMax];
    
    for (let i = xMin; i <= xMax && ticks.length < 10; i += increment) {
      ticks.push(Math.round(i));
    }
    
    // Ensure xMax is included if not already
    if (ticks[ticks.length - 1] !== Math.round(xMax)) {
      ticks.push(Math.round(xMax));
    }
    
    return ticks;
  }, [xMin, xMax]);

  const yTicks = useMemo(() => {
    if (yMax <= yMin) return [yMin]; // Prevent invalid range
    
    const ticks = [];
    const increment = (yMax - yMin) / 5;
    
    // Ensure we don't create too many ticks
    if (increment <= 0) return [yMin, yMax];
    
    for (let i = yMin; i <= yMax && ticks.length < 10; i += increment) {
      ticks.push(Math.round(i * 10) / 10);
    }
    
    // Ensure yMax is included if not already
    if (ticks[ticks.length - 1] !== Math.round(yMax * 10) / 10) {
      ticks.push(Math.round(yMax * 10) / 10);
    }
    
    return ticks;
  }, [yMin, yMax]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px] w-full max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            Quadrant Detail View ({xMin}%-{xMax}%, {yMin.toFixed(1)}-{yMax.toFixed(1)})
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          <div className="mb-4 text-sm text-muted-foreground">
            Showing {filteredData.length} campaign(s) in this quadrant
          </div>
          
          <div className="w-full h-[400px]">
            <ChartContainer config={chartConfig}>
              <ScatterChart
                data={filteredData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                
                {/* Health score threshold lines */}
                {yMin <= 7 && yMax >= 7 && (
                  <ReferenceLine y={7} stroke="#22c55e" strokeDasharray="5 5" opacity={0.5} />
                )}
                {yMin <= 4 && yMax >= 4 && (
                  <ReferenceLine y={4} stroke="#f59e0b" strokeDasharray="5 5" opacity={0.5} />
                )}
                
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name="Completion %"
                  domain={[xMin, xMax]}
                  ticks={xTicks}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Campaign Completion (%)', position: 'insideBottom', offset: -10 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name="Health Score"
                  domain={[yMin, yMax]}
                  ticks={yTicks}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Health Score', angle: -90, position: 'insideLeft' }}
                />
                
                <Tooltip
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

          {filteredData.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Campaigns in this quadrant:</h4>
              <div className="max-h-32 overflow-y-auto text-sm space-y-1">
                {filteredData.map((campaign, index) => (
                  <div key={index} className="flex justify-between items-center py-1 px-2 bg-gray-50 rounded">
                    <span className="truncate">{campaign.name}</span>
                    <div className="flex items-center gap-2 text-xs">
                      <span>Score: {campaign.y}</span>
                      <span>Complete: {campaign.x.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

function getHealthColor(healthScore: number): string {
  if (healthScore >= 7) return "#22c55e"; // Green for healthy
  if (healthScore >= 4) return "#f59e0b"; // Yellow/Orange for warning
  return "#ef4444"; // Red for critical
}

export default QuadrantZoomModal;
