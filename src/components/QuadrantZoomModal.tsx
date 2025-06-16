import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { CampaignHealthData } from "@/utils/campaignHealthScoring";
import { ChartContainer, ChartTooltip } from "./ui/chart";
import { Button } from "./ui/button";
import { X } from "lucide-react";
import { useMemo, useState } from "react";

interface QuadrantZoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  healthData: CampaignHealthData[];
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

const QuadrantZoomModal = ({
  open,
  onOpenChange,
  healthData,
  xMin,
  xMax,
  yMin,
  yMax
}: QuadrantZoomModalProps) => {
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

  const filteredData = useMemo(() => {
    const campaigns = healthData.filter(campaign => 
      campaign.completionPercentage >= xMin && 
      campaign.completionPercentage <= xMax &&
      campaign.healthScore >= yMin && 
      campaign.healthScore <= yMax
    );

    const dataMap = new Map<string, { campaigns: CampaignHealthData[], count: number }>();
    
    // Group campaigns by coordinates to detect overlaps
    campaigns.forEach(campaign => {
      const key = `${campaign.completionPercentage.toFixed(1)},${campaign.healthScore.toFixed(1)}`;
      if (!dataMap.has(key)) {
        dataMap.set(key, { campaigns: [], count: 0 });
      }
      dataMap.get(key)!.campaigns.push(campaign);
      dataMap.get(key)!.count++;
    });

    return campaigns.map(campaign => ({
      x: campaign.completionPercentage,
      y: campaign.healthScore,
      name: campaign.campaignName,
      fill: getHealthColor(campaign.healthScore),
      campaignData: campaign,
      isStacked: dataMap.get(`${campaign.completionPercentage.toFixed(1)},${campaign.healthScore.toFixed(1)}`)!.count > 1,
      stackCount: dataMap.get(`${campaign.completionPercentage.toFixed(1)},${campaign.healthScore.toFixed(1)}`)!.count
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

  const findCampaignsAtCoordinate = (targetX: number, targetY: number, tolerance = 0.1) => {
    return healthData.filter(campaign => 
      Math.abs(campaign.completionPercentage - targetX) <= tolerance &&
      Math.abs(campaign.healthScore - targetY) <= tolerance &&
      campaign.completionPercentage >= xMin && 
      campaign.completionPercentage <= xMax &&
      campaign.healthScore >= yMin && 
      campaign.healthScore <= yMax
    );
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
          
          <div className="w-full h-[400px] relative">
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
                  content={() => null} // Disable default tooltip since we're using custom
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
                      {campaign.isStacked && <span className="text-blue-600">({campaign.stackCount} stacked)</span>}
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
  if (healthScore >= 7) return "#22c55e";
  if (healthScore >= 4) return "#f59e0b";
  return "#ef4444";
}

export default QuadrantZoomModal;
