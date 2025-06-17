import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import { CampaignHealthData } from "@/utils/campaignHealthScoring";
import { ChartContainer, ChartTooltip } from "./ui/chart";
import { Button } from "./ui/button";
import { X } from "lucide-react";
import { useMemo, useState, useRef } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";

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
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  const [tooltipState, setTooltipState] = useState<TooltipState>({
    visible: false,
    campaigns: [],
    x: 0,
    y: 0
  });

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
        fill: getHealthColor(campaign.healthScore),
        campaignData: campaign
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

  const handleScatterClick = (data: any, event: any) => {
    console.log('Modal scatter clicked:', data, event);
    event?.stopPropagation?.();
    
    if (event) {
      const clientX = event.clientX || event.nativeEvent?.clientX || 100;
      const clientY = event.clientY || event.nativeEvent?.clientY || 100;
      
      // Increase tolerance and add debugging
      const tolerance = 0.5;
      const matchingCampaigns = healthData.filter(campaign => 
        Math.abs(campaign.completionPercentage - data.x) <= tolerance &&
        Math.abs(campaign.healthScore - data.y) <= tolerance
      );
      
      console.log('Modal matching campaigns:', matchingCampaigns);
      
      // Better positioning logic for modal
      const chartContainer = chartContainerRef.current;
      const containerRect = chartContainer?.getBoundingClientRect();
      
      let tooltipX = clientX;
      let tooltipY = clientY;
      
      if (containerRect) {
        // If tooltip would go off the right edge, position it to the left of cursor
        if (clientX + 400 > containerRect.right) {
          tooltipX = clientX - 420;
        }
        
        // Keep tooltip within container bounds
        tooltipX = Math.max(containerRect.left + 10, Math.min(tooltipX, containerRect.right - 410));
        
        // Position tooltip above cursor if it would go below container
        if (clientY + 200 > containerRect.bottom) {
          tooltipY = clientY - 210;
        }
        
        // Keep tooltip within vertical bounds
        tooltipY = Math.max(containerRect.top + 10, Math.min(tooltipY, containerRect.bottom - 210));
      }
      
      setTooltipState({
        visible: true,
        campaigns: matchingCampaigns,
        x: tooltipX,
        y: tooltipY
      });
    }
  };

  const closeTooltip = () => {
    setTooltipState({
      visible: false,
      campaigns: [],
      x: 0,
      y: 0
    });
  };

  const renderBurnRateDetails = (campaign: CampaignHealthData) => {
    if (!campaign.burnRateData) return null;

    const { oneDayRate, threeDayRate, sevenDayRate, oneDayPercentage, threeDayPercentage, sevenDayPercentage, confidence } = campaign.burnRateData;

    return (
      <div className="border-t pt-2 mt-2">
        <div className="text-xs font-medium mb-1">Burn Rate Details:</div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className={confidence === 'high' ? 'font-medium text-green-700' : ''}>1-Day Rate:</span>
            <span className={confidence === 'high' ? 'font-medium text-green-700' : ''}>{oneDayRate.toLocaleString()} impressions ({oneDayPercentage.toFixed(1)}%)</span>
          </div>
          <div className="flex justify-between">
            <span className={confidence === 'medium' ? 'font-medium text-yellow-700' : ''}>3-Day Rate:</span>
            <span className={confidence === 'medium' ? 'font-medium text-yellow-700' : ''}>{threeDayRate.toLocaleString()} impressions ({threeDayPercentage.toFixed(1)}%)</span>
          </div>
          <div className="flex justify-between">
            <span className={confidence === 'low' ? 'font-medium text-red-700' : ''}>7-Day Rate:</span>
            <span className={confidence === 'low' ? 'font-medium text-red-700' : ''}>{sevenDayRate.toLocaleString()} impressions ({sevenDayPercentage.toFixed(1)}%)</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Confidence:</span>
            <span className="capitalize">{confidence}</span>
          </div>
        </div>
      </div>
    );
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
          
          <div className="w-full border border-gray-200 rounded-lg p-4" ref={chartContainerRef}>
            <ChartContainer config={chartConfig} className="w-full min-h-[350px]">
              <ScatterChart
                data={filteredData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name="Completion %"
                  domain={[xMin, xMax]}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Campaign Completion (%)', position: 'insideBottom', offset: -10 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name="Health Score"
                  domain={[yMin, yMax]}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Health Score', angle: -90, position: 'insideLeft' }}
                />
                
                <Scatter 
                  dataKey="y"
                  className="cursor-pointer"
                >
                  {filteredData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.fill}
                      onClick={(event) => handleScatterClick(entry, event)}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ChartContainer>

            {/* Multi-Campaign Tooltip with Accordion */}
            {tooltipState.visible && tooltipState.campaigns.length > 0 && (
              <div 
                className="fixed bg-white border rounded shadow-lg max-w-md z-50 max-h-96 overflow-y-auto"
                style={{ 
                  left: tooltipState.x,
                  top: tooltipState.y
                }}
              >
                <div className="flex justify-between items-center p-3 border-b">
                  <h4 className="font-medium text-sm">
                    {tooltipState.campaigns.length === 1 
                      ? 'Campaign Details' 
                      : `${tooltipState.campaigns.length} Campaigns at this Point`
                    }
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeTooltip}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                
                {tooltipState.campaigns.length === 1 ? (
                  // Single campaign - show full details directly
                  <div className="p-3">
                    <p className="font-medium text-sm mb-2">{tooltipState.campaigns[0].campaignName}</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Overall Health:</span>
                        <span className="font-medium">{tooltipState.campaigns[0].healthScore}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ROAS:</span>
                        <span className="font-medium">{tooltipState.campaigns[0].roas.toFixed(1)}x (Score: {tooltipState.campaigns[0].roasScore})</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivery Pacing:</span>
                        <span className="font-medium">{tooltipState.campaigns[0].deliveryPacing.toFixed(1)}% (Score: {tooltipState.campaigns[0].deliveryPacingScore})</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Burn Rate:</span>
                        <span className="font-medium">{tooltipState.campaigns[0].burnRatePercentage.toFixed(1)}% (Score: {tooltipState.campaigns[0].burnRateScore})</span>
                      </div>
                      <div className="flex justify-between">
                        <span>CTR:</span>
                        <span className="font-medium">{tooltipState.campaigns[0].ctr.toFixed(3)}% (Score: {tooltipState.campaigns[0].ctrScore})</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Overspend:</span>
                        <span className="font-medium">${tooltipState.campaigns[0].overspend.toFixed(2)} (Score: {tooltipState.campaigns[0].overspendScore})</span>
                      </div>
                      <div className="border-t pt-1 mt-1">
                        <div className="flex justify-between">
                          <span>Completion:</span>
                          <span className="font-medium">{tooltipState.campaigns[0].completionPercentage.toFixed(1)}%</span>
                        </div>
                      </div>
                      {renderBurnRateDetails(tooltipState.campaigns[0])}
                    </div>
                  </div>
                ) : (
                  // Multiple campaigns - show accordion
                  <Accordion type="single" collapsible className="w-full">
                    {tooltipState.campaigns.map((campaign, index) => (
                      <AccordionItem key={`${campaign.campaignName}-${index}`} value={`campaign-${index}`}>
                        <AccordionTrigger className="px-3 py-2 text-left">
                          <div className="flex justify-between items-center w-full mr-2">
                            <span className="font-medium text-sm truncate">{campaign.campaignName}</span>
                            <div className="flex items-center gap-2 text-xs">
                              <span>Score: {campaign.healthScore}</span>
                              <span>Complete: {campaign.completionPercentage.toFixed(1)}%</span>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-3">
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span>ROAS:</span>
                              <span className="font-medium">{campaign.roas.toFixed(1)}x (Score: {campaign.roasScore})</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Delivery Pacing:</span>
                              <span className="font-medium">{campaign.deliveryPacing.toFixed(1)}% (Score: {campaign.deliveryPacingScore})</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Burn Rate:</span>
                              <span className="font-medium">{campaign.burnRatePercentage.toFixed(1)}% (Score: {campaign.burnRateScore})</span>
                            </div>
                            <div className="flex justify-between">
                              <span>CTR:</span>
                              <span className="font-medium">{campaign.ctr.toFixed(3)}% (Score: {campaign.ctrScore})</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Overspend:</span>
                              <span className="font-medium">${campaign.overspend.toFixed(2)} (Score: {campaign.overspendScore})</span>
                            </div>
                            {renderBurnRateDetails(campaign)}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
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
