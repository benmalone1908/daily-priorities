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

interface TooltipState {
  visible: boolean;
  pinned: boolean;
  data: CampaignHealthData | null;
  x: number;
  y: number;
}

interface MultiCampaignTooltipState {
  visible: boolean;
  campaigns: CampaignHealthData[];
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

  const [tooltipState, setTooltipState] = useState<TooltipState>({
    visible: false,
    pinned: false,
    data: null,
    x: 0,
    y: 0
  });

  const [multiCampaignTooltipState, setMultiCampaignTooltipState] = useState<MultiCampaignTooltipState>({
    visible: false,
    campaigns: [],
    x: 0,
    y: 0
  });

  const chartData = useMemo(() => {
    const dataMap = new Map<string, { campaigns: CampaignHealthData[], count: number }>();
    
    // Group campaigns by coordinates to detect overlaps
    healthData.forEach(campaign => {
      const key = `${campaign.completionPercentage.toFixed(1)},${campaign.healthScore.toFixed(1)}`;
      if (!dataMap.has(key)) {
        dataMap.set(key, { campaigns: [], count: 0 });
      }
      dataMap.get(key)!.campaigns.push(campaign);
      dataMap.get(key)!.count++;
    });

    // Create chart data with overlap indicators
    return healthData.map(campaign => {
      const key = `${campaign.completionPercentage.toFixed(1)},${campaign.healthScore.toFixed(1)}`;
      const overlap = dataMap.get(key)!;
      
      return {
        x: campaign.completionPercentage,
        y: campaign.healthScore,
        name: campaign.campaignName,
        fill: getHealthColor(campaign.healthScore),
        campaignData: campaign,
        isStacked: overlap.count > 1,
        stackCount: overlap.count
      };
    });
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

  const findCampaignsAtCoordinate = (targetX: number, targetY: number, tolerance = 0.1) => {
    return healthData.filter(campaign => 
      Math.abs(campaign.completionPercentage - targetX) <= tolerance &&
      Math.abs(campaign.healthScore - targetY) <= tolerance
    );
  };

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
    event?.stopPropagation?.();
    
    if (event) {
      const clientX = event.clientX || event.nativeEvent?.clientX || 100;
      const clientY = event.clientY || event.nativeEvent?.clientY || 100;
      
      // Find all campaigns at this coordinate
      const campaignsAtPoint = findCampaignsAtCoordinate(data.x, data.y);
      
      if (campaignsAtPoint.length > 1) {
        // Multiple campaigns - show multi-campaign tooltip
        setMultiCampaignTooltipState({
          visible: true,
          campaigns: campaignsAtPoint,
          x: clientX,
          y: clientY
        });
        // Hide single campaign tooltip
        setTooltipState({
          visible: false,
          pinned: false,
          data: null,
          x: 0,
          y: 0
        });
      } else if (campaignsAtPoint.length === 1) {
        // Single campaign - show regular tooltip
        setTooltipState({
          visible: true,
          pinned: true,
          data: campaignsAtPoint[0],
          x: clientX,
          y: clientY
        });
        // Hide multi-campaign tooltip
        setMultiCampaignTooltipState({
          visible: false,
          campaigns: [],
          x: 0,
          y: 0
        });
      }
    }
  };

  const handleTooltipMouseEnter = (data: any, event: any) => {
    if (!tooltipState.pinned && !multiCampaignTooltipState.visible) {
      const campaign = healthData.find(c => c.campaignName === data.name);
      if (campaign && event) {
        const clientX = event.clientX || event.nativeEvent?.clientX || 100;
        const clientY = event.clientY || event.nativeEvent?.clientY || 100;
        
        setTooltipState({
          visible: true,
          pinned: false,
          data: campaign,
          x: clientX,
          y: clientY
        });
      }
    }
  };

  const handleTooltipMouseLeave = () => {
    if (!tooltipState.pinned) {
      setTooltipState({
        visible: false,
        pinned: false,
        data: null,
        x: 0,
        y: 0
      });
    }
  };

  const closeTooltip = () => {
    setTooltipState({
      visible: false,
      pinned: false,
      data: null,
      x: 0,
      y: 0
    });
  };

  const closeMultiCampaignTooltip = () => {
    setMultiCampaignTooltipState({
      visible: false,
      campaigns: [],
      x: 0,
      y: 0
    });
  };

  const selectCampaignFromMulti = (campaign: CampaignHealthData, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setTooltipState({
      visible: true,
      pinned: true,
      data: campaign,
      x: rect.left + rect.width / 2,
      y: rect.top
    });
    closeMultiCampaignTooltip();
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
              content={() => null}
            />
            
            <Scatter 
              dataKey="y"
              onClick={handleScatterClick}
              onMouseEnter={handleTooltipMouseEnter}
              onMouseLeave={handleTooltipMouseLeave}
              className="cursor-pointer"
              shape={(props: any) => {
                const { cx, cy, fill, payload } = props;
                const isStacked = payload?.isStacked;
                const stackCount = payload?.stackCount || 1;
                
                return (
                  <g>
                    <circle 
                      cx={cx} 
                      cy={cy} 
                      r={isStacked ? 6 : 4} 
                      fill={fill}
                      stroke={isStacked ? "#1f2937" : "transparent"}
                      strokeWidth={isStacked ? 1 : 0}
                    />
                    {isStacked && stackCount > 1 && (
                      <text
                        x={cx + 8}
                        y={cy - 8}
                        fontSize={10}
                        fill="#1f2937"
                        fontWeight="bold"
                        className="pointer-events-none"
                      >
                        {stackCount}
                      </text>
                    )}
                  </g>
                );
              }}
            />
          </ScatterChart>
        </ChartContainer>
      </div>
      
      {/* Single Campaign Tooltip */}
      {tooltipState.visible && tooltipState.data && (
        <div 
          className="fixed bg-white p-4 border rounded shadow-lg max-w-xs z-50"
          style={{ 
            left: Math.min(tooltipState.x, window.innerWidth - 250),
            top: Math.max(10, tooltipState.y - 200)
          }}
        >
          <div className="flex justify-between items-start mb-2">
            <p className="font-medium text-sm">{tooltipState.data.campaignName}</p>
            {tooltipState.pinned && (
              <Button
                variant="ghost"
                size="sm"
                onClick={closeTooltip}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Overall Health:</span>
              <span className="font-medium">{tooltipState.data.healthScore}</span>
            </div>
            <div className="flex justify-between">
              <span>ROAS:</span>
              <span className="font-medium">{tooltipState.data.roas.toFixed(1)}x (Score: {tooltipState.data.roasScore})</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Pacing:</span>
              <span className="font-medium">{tooltipState.data.deliveryPacing.toFixed(1)}% (Score: {tooltipState.data.deliveryPacingScore})</span>
            </div>
            <div className="flex justify-between">
              <span>Burn Rate:</span>
              <span className="font-medium">{tooltipState.data.burnRatePercentage.toFixed(1)}% (Score: {tooltipState.data.burnRateScore})</span>
            </div>
            <div className="flex justify-between">
              <span>CTR:</span>
              <span className="font-medium">{tooltipState.data.ctr.toFixed(3)}% (Score: {tooltipState.data.ctrScore})</span>
            </div>
            <div className="flex justify-between">
              <span>Overspend:</span>
              <span className="font-medium">${tooltipState.data.overspend.toFixed(2)} (Score: {tooltipState.data.overspendScore})</span>
            </div>
            <div className="border-t pt-1 mt-1">
              <div className="flex justify-between">
                <span>Completion:</span>
                <span className="font-medium">{tooltipState.data.completionPercentage.toFixed(1)}%</span>
              </div>
            </div>
            
            <div className="border-t pt-2 mt-2">
              <div className="text-xs font-medium mb-1">Burn Rate Breakdown:</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>1-day avg:</span>
                  <span>{tooltipState.data.burnRateData.oneDayRate.toFixed(1)} ({tooltipState.data.burnRateData.oneDayPercentage.toFixed(1)}%)</span>
                </div>
                <div className="flex justify-between">
                  <span>3-day avg:</span>
                  <span>{tooltipState.data.burnRateData.threeDayRate.toFixed(1)} ({tooltipState.data.burnRateData.threeDayPercentage.toFixed(1)}%)</span>
                </div>
                <div className="flex justify-between">
                  <span>7-day avg:</span>
                  <span>{tooltipState.data.burnRateData.sevenDayRate.toFixed(1)} ({tooltipState.data.burnRateData.sevenDayPercentage.toFixed(1)}%)</span>
                </div>
                <div className="flex justify-between">
                  <span>Confidence:</span>
                  <span className="font-medium">{tooltipState.data.burnRateData.confidence}</span>
                </div>
                <div className="flex justify-between">
                  <span>Daily target:</span>
                  <span>{tooltipState.data.requiredDailyImpressions.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
          {!tooltipState.pinned && (
            <p className="text-xs text-blue-600 mt-2">
              Click to pin this info
            </p>
          )}
        </div>
      )}

      {/* Multi-Campaign Selection Tooltip */}
      {multiCampaignTooltipState.visible && (
        <div 
          className="fixed bg-white p-4 border rounded shadow-lg max-w-sm z-50"
          style={{ 
            left: Math.min(multiCampaignTooltipState.x, window.innerWidth - 350),
            top: Math.max(10, multiCampaignTooltipState.y - 100)
          }}
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="font-medium text-sm">Multiple Campaigns</p>
              <p className="text-xs text-gray-500">{multiCampaignTooltipState.campaigns.length} campaigns at this location</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={closeMultiCampaignTooltip}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {multiCampaignTooltipState.campaigns.map((campaign, index) => (
              <div 
                key={index}
                className="p-2 border rounded hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={(e) => selectCampaignFromMulti(campaign, e)}
              >
                <p className="font-medium text-xs truncate" title={campaign.campaignName}>
                  {campaign.campaignName}
                </p>
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>Health: {campaign.healthScore}</span>
                  <span>Complete: {campaign.completionPercentage.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
          
          <p className="text-xs text-blue-600 mt-3 text-center">
            Click on a campaign above to view details
          </p>
        </div>
      )}
      
      {zoomState.level === 0 && (
        <div className="mt-2 text-center">
          <p className="text-sm text-gray-500">
            Click on any quadrant to view detailed breakdown in modal • Points with numbers show multiple campaigns
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
  if (healthScore >= 7) return "#22c55e";
  if (healthScore >= 4) return "#f59e0b";
  return "#ef4444";
}

export default CampaignHealthScatterPlot;
