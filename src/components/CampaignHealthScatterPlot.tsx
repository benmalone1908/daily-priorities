
import { useMemo, useState } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from "recharts";
import { CampaignHealthData } from "@/utils/campaignHealthScoring";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart";
import { Button } from "./ui/button";
import { ZoomIn, ZoomOut, RotateCcw, X } from "lucide-react";
import QuadrantZoomModal from "./QuadrantZoomModal";

interface CampaignHealthScatterPlotProps {
  healthData: CampaignHealthData[];
}

interface ZoomState {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  level: number;
}

interface ModalState {
  open: boolean;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

interface PersistentTooltipState {
  visible: boolean;
  data: CampaignHealthData | null;
  x: number;
  y: number;
}

const CampaignHealthScatterPlot = ({ healthData }: CampaignHealthScatterPlotProps) => {
  const [zoomState, setZoomState] = useState<ZoomState>({
    xMin: 0,
    xMax: 100,
    yMin: 0,
    yMax: 10,
    level: 0
  });

  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    xMin: 0,
    xMax: 0,
    yMin: 0,
    yMax: 0
  });

  const [persistentTooltip, setPersistentTooltip] = useState<PersistentTooltipState>({
    visible: false,
    data: null,
    x: 0,
    y: 0
  });

  const chartData = useMemo(() => {
    return healthData.map(campaign => ({
      x: campaign.completionPercentage,
      y: campaign.healthScore,
      name: campaign.campaignName,
      fill: getHealthColor(campaign.healthScore),
      campaignData: campaign // Store full campaign data for tooltips
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

  // Generate custom tick arrays based on current zoom level
  const xTicks = useMemo(() => {
    const ticks = [];
    const increment = zoomState.level === 0 ? 20 : (zoomState.xMax - zoomState.xMin) / 5;
    for (let i = zoomState.xMin; i <= zoomState.xMax; i += increment) {
      ticks.push(Math.round(i));
    }
    return ticks;
  }, [zoomState]);

  const yTicks = useMemo(() => {
    const ticks = [];
    const increment = zoomState.level === 0 ? 2 : (zoomState.yMax - zoomState.yMin) / 5;
    for (let i = zoomState.yMin; i <= zoomState.yMax; i += increment) {
      ticks.push(Math.round(i * 10) / 10); // Round to 1 decimal place
    }
    return ticks;
  }, [zoomState]);

  const handleQuadrantClick = (xStart: number, xEnd: number, yStart: number, yEnd: number) => {
    setModalState({
      open: true,
      xMin: xStart,
      xMax: xEnd,
      yMin: yStart,
      yMax: yEnd
    });
  };

  const handleReset = () => {
    setZoomState({
      xMin: 0,
      xMax: 100,
      yMin: 0,
      yMax: 10,
      level: 0
    });
  };

  const handleZoomOut = () => {
    if (zoomState.level > 0) {
      const xRange = zoomState.xMax - zoomState.xMin;
      const yRange = zoomState.yMax - zoomState.yMin;
      const newXMin = Math.max(0, zoomState.xMin - xRange * 0.5);
      const newXMax = Math.min(100, zoomState.xMax + xRange * 0.5);
      const newYMin = Math.max(0, zoomState.yMin - yRange * 0.5);
      const newYMax = Math.min(10, zoomState.yMax + yRange * 0.5);
      
      setZoomState({
        xMin: newXMin,
        xMax: newXMax,
        yMin: newYMin,
        yMax: newYMax,
        level: Math.max(0, zoomState.level - 1)
      });
    }
  };

  const handleScatterClick = (data: any, event: any) => {
    event.stopPropagation();
    const campaign = healthData.find(c => c.campaignName === data.name);
    if (campaign && event.nativeEvent) {
      setPersistentTooltip({
        visible: true,
        data: campaign,
        x: event.nativeEvent.clientX,
        y: event.nativeEvent.clientY
      });
    }
  };

  const closePersistentTooltip = () => {
    setPersistentTooltip({
      visible: false,
      data: null,
      x: 0,
      y: 0
    });
  };

  // Generate clickable ReferenceArea components for quadrants
  const generateQuadrantAreas = () => {
    const areas = [];
    
    if (zoomState.level === 0) {
      // Use actual axis increments: 20% for x-axis, 2 points for y-axis
      const xIncrements = [0, 20, 40, 60, 80, 100];
      const yIncrements = [0, 2, 4, 6, 8, 10];

      for (let i = 0; i < xIncrements.length - 1; i++) {
        for (let j = 0; j < yIncrements.length - 1; j++) {
          const xStart = xIncrements[i];
          const xEnd = xIncrements[i + 1];
          const yStart = yIncrements[j];
          const yEnd = yIncrements[j + 1];

          areas.push(
            <ReferenceArea
              key={`quadrant-${i}-${j}`}
              x1={xStart}
              x2={xEnd}
              y1={yStart}
              y2={yEnd}
              fill="transparent"
              stroke="rgba(59, 130, 246, 0.2)"
              strokeWidth={1}
              className="cursor-pointer hover:fill-blue-50 hover:fill-opacity-20 transition-all"
              onClick={() => handleQuadrantClick(xStart, xEnd, yStart, yEnd)}
            />
          );
        }
      }
    } else {
      // For zoomed views, create 5x5 sub-quadrants
      const xStep = (zoomState.xMax - zoomState.xMin) / 5;
      const yStep = (zoomState.yMax - zoomState.yMin) / 5;

      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          const xStart = zoomState.xMin + i * xStep;
          const xEnd = zoomState.xMin + (i + 1) * xStep;
          const yStart = zoomState.yMin + j * yStep;
          const yEnd = zoomState.yMin + (j + 1) * yStep;

          areas.push(
            <ReferenceArea
              key={`quadrant-${i}-${j}`}
              x1={xStart}
              x2={xEnd}
              y1={yStart}
              y2={yEnd}
              fill="transparent"
              stroke="rgba(59, 130, 246, 0.2)"
              strokeWidth={1}
              className="cursor-pointer hover:fill-blue-50 hover:fill-opacity-20 transition-all"
              onClick={() => handleQuadrantClick(xStart, xEnd, yStart, yEnd)}
            />
          );
        }
      }
    }
    return areas;
  };

  if (healthData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No campaign health data available for plotting
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Zoom Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {zoomState.level === 0 ? "Full View" : `Zoom Level ${zoomState.level}`}
          </span>
          {zoomState.level > 0 && (
            <span className="text-xs text-gray-500">
              ({zoomState.xMin.toFixed(0)}-{zoomState.xMax.toFixed(0)}%, {zoomState.yMin.toFixed(1)}-{zoomState.yMax.toFixed(1)})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoomState.level === 0}
            className="flex items-center gap-1"
          >
            <ZoomOut className="h-3 w-3" />
            Zoom Out
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={zoomState.level === 0}
            className="flex items-center gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        </div>
      </div>

      <div className="w-full h-[500px] relative">
        <ChartContainer config={chartConfig}>
          <ScatterChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            
            {/* Quadrant Grid Lines */}
            {zoomState.level === 0 && (
              <>
                <ReferenceLine x={20} stroke="#e5e7eb" strokeDasharray="2 2" opacity={0.5} />
                <ReferenceLine x={40} stroke="#e5e7eb" strokeDasharray="2 2" opacity={0.5} />
                <ReferenceLine x={60} stroke="#e5e7eb" strokeDasharray="2 2" opacity={0.5} />
                <ReferenceLine x={80} stroke="#e5e7eb" strokeDasharray="2 2" opacity={0.5} />
                <ReferenceLine y={2} stroke="#e5e7eb" strokeDasharray="2 2" opacity={0.5} />
                <ReferenceLine y={4} stroke="#e5e7eb" strokeDasharray="2 2" opacity={0.5} />
                <ReferenceLine y={6} stroke="#e5e7eb" strokeDasharray="2 2" opacity={0.5} />
                <ReferenceLine y={8} stroke="#e5e7eb" strokeDasharray="2 2" opacity={0.5} />
              </>
            )}
            
            {/* Health score threshold lines */}
            <ReferenceLine y={7} stroke="#22c55e" strokeDasharray="5 5" opacity={0.5} />
            <ReferenceLine y={4} stroke="#f59e0b" strokeDasharray="5 5" opacity={0.5} />
            
            {/* Clickable Quadrant Areas */}
            {generateQuadrantAreas()}
            
            <XAxis 
              type="number" 
              dataKey="x" 
              name="Completion %"
              domain={[zoomState.xMin, zoomState.xMax]}
              ticks={xTicks}
              tick={{ fontSize: 12 }}
              label={{ value: 'Campaign Completion (%)', position: 'insideBottom', offset: -10 }}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name="Health Score"
              domain={[zoomState.yMin, zoomState.yMax]}
              ticks={yTicks}
              tick={{ fontSize: 12 }}
              label={{ value: 'Health Score', angle: -90, position: 'insideLeft' }}
            />
            
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const campaign = data.campaignData;
                  return (
                    <div className="bg-white p-4 border rounded shadow-lg max-w-xs">
                      <p className="font-medium text-sm mb-2">{data.name}</p>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Overall Health:</span>
                          <span className="font-medium">{campaign.healthScore}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>ROAS:</span>
                          <span className="font-medium">{campaign.roas}x (Score: {campaign.roasScore})</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Delivery Pacing:</span>
                          <span className="font-medium">{campaign.deliveryPacing}% (Score: {campaign.deliveryPacingScore})</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Burn Rate:</span>
                          <span className="font-medium">{campaign.burnRate}% (Score: {campaign.burnRateScore})</span>
                        </div>
                        <div className="flex justify-between">
                          <span>CTR:</span>
                          <span className="font-medium">{campaign.ctr}% (Score: {campaign.ctrScore})</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Overspend:</span>
                          <span className="font-medium">${campaign.overspend} (Score: {campaign.overspendScore})</span>
                        </div>
                        <div className="border-t pt-1 mt-1">
                          <div className="flex justify-between">
                            <span>Completion:</span>
                            <span className="font-medium">{data.x.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-blue-600 mt-2">
                        Click to pin this info
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            
            <Scatter 
              dataKey="y"
              onClick={handleScatterClick}
              className="cursor-pointer"
            />
          </ScatterChart>
        </ChartContainer>
      </div>
      
      {/* Persistent Tooltip */}
      {persistentTooltip.visible && persistentTooltip.data && (
        <div 
          className="fixed bg-white p-4 border rounded shadow-lg max-w-xs z-50"
          style={{ 
            left: Math.min(persistentTooltip.x, window.innerWidth - 250),
            top: Math.max(10, persistentTooltip.y - 150)
          }}
        >
          <div className="flex justify-between items-start mb-2">
            <p className="font-medium text-sm">{persistentTooltip.data.campaignName}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={closePersistentTooltip}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Overall Health:</span>
              <span className="font-medium">{persistentTooltip.data.healthScore}</span>
            </div>
            <div className="flex justify-between">
              <span>ROAS:</span>
              <span className="font-medium">{persistentTooltip.data.roas}x (Score: {persistentTooltip.data.roasScore})</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Pacing:</span>
              <span className="font-medium">{persistentTooltip.data.deliveryPacing}% (Score: {persistentTooltip.data.deliveryPacingScore})</span>
            </div>
            <div className="flex justify-between">
              <span>Burn Rate:</span>
              <span className="font-medium">{persistentTooltip.data.burnRate}% (Score: {persistentTooltip.data.burnRateScore})</span>
            </div>
            <div className="flex justify-between">
              <span>CTR:</span>
              <span className="font-medium">{persistentTooltip.data.ctr}% (Score: {persistentTooltip.data.ctrScore})</span>
            </div>
            <div className="flex justify-between">
              <span>Overspend:</span>
              <span className="font-medium">${persistentTooltip.data.overspend} (Score: {persistentTooltip.data.overspendScore})</span>
            </div>
            <div className="border-t pt-1 mt-1">
              <div className="flex justify-between">
                <span>Completion:</span>
                <span className="font-medium">{persistentTooltip.data.completionPercentage.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {zoomState.level === 0 && (
        <div className="mt-2 text-center">
          <p className="text-sm text-gray-500">
            Click on any quadrant to view detailed breakdown in modal
          </p>
        </div>
      )}

      {/* Quadrant Zoom Modal */}
      <QuadrantZoomModal
        open={modalState.open}
        onOpenChange={(open) => setModalState(prev => ({ ...prev, open }))}
        healthData={healthData}
        xMin={modalState.xMin}
        xMax={modalState.xMax}
        yMin={modalState.yMin}
        yMax={modalState.yMax}
      />
    </div>
  );
};

function getHealthColor(healthScore: number): string {
  if (healthScore >= 7) return "#22c55e"; // Green for healthy
  if (healthScore >= 4) return "#f59e0b"; // Yellow/Orange for warning
  return "#ef4444"; // Red for critical
}

export default CampaignHealthScatterPlot;
