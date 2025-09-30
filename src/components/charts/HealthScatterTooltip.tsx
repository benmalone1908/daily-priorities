import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { X } from "lucide-react";
import { CampaignHealthData } from "@/utils/campaignHealthScoring";
import { TooltipState } from "@/hooks/useHealthScatterPlot";
import { getTooltipZIndex } from "@/utils/tooltipPositioning";

interface HealthScatterTooltipProps {
  tooltipState: TooltipState;
  onClose: () => void;
}

export const HealthScatterTooltip = ({
  tooltipState,
  onClose
}: HealthScatterTooltipProps) => {

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

  if (!tooltipState.visible || tooltipState.campaigns.length === 0) {
    return null;
  }

  return (
    <div
      data-tooltip-content
      className={`fixed bg-white border rounded shadow-lg ${getTooltipZIndex()} max-h-80 overflow-y-auto`}
      style={{
        left: tooltipState.x,
        top: tooltipState.y,
        width: '480px',
        maxWidth: '480px'
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
          onClick={onClose}
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
                <div className="flex justify-between items-start w-full mr-2 gap-2">
                  <span className="font-medium text-sm break-words flex-1">{campaign.campaignName}</span>
                  <div className="flex items-center gap-2 text-xs flex-shrink-0">
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
  );
};