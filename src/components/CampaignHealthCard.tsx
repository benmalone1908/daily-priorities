
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Activity, TrendingUp, Target, DollarSign, MousePointer, AlertTriangle, HelpCircle } from 'lucide-react';
import { calculateCampaignHealth, CampaignHealthData } from "@/utils/campaignHealthScoring";
import { processCampaigns } from '@/lib/pacingCalculations';
import type { ContractTerms, PacingDeliveryData } from '@/types/pacing';
import { parseDateString } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

interface CampaignHealthCardProps {
  campaignName: string;
  deliveryData: any[];
  pacingData: any[];
  contractTermsData: any[];
  unfilteredData?: any[];
  dbContractTerms?: any[];
}

interface HealthStatus {
  level: 'healthy' | 'warning' | 'critical';
  label: string;
  color: string;
  bgColor: string;
}

const getHealthStatus = (healthScore: number): HealthStatus => {
  if (healthScore >= 7) {
    return {
      level: 'healthy',
      label: 'Healthy',
      color: 'text-green-700',
      bgColor: 'bg-green-100'
    };
  } else if (healthScore >= 4) {
    return {
      level: 'warning',
      label: 'Warning',
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-100'
    };
  } else {
    return {
      level: 'critical',
      label: 'Critical',
      color: 'text-red-700',
      bgColor: 'bg-red-100'
    };
  }
};

const formatScore = (score: number): string => {
  return score.toFixed(1);
};

const renderBurnRateDetails = (campaign: CampaignHealthData) => {
  if (!campaign.burnRateData) return null;

  const { oneDayRate, threeDayRate, sevenDayRate, oneDayPercentage, threeDayPercentage, sevenDayPercentage, confidence } = campaign.burnRateData;

  // Map confidence levels to display styles
  const getConfidenceStyle = (rateType: string) => {
    if (confidence === '7-day') {
      return rateType === 'seven' ? 'font-medium text-green-700' : '';
    } else if (confidence === '3-day') {
      return rateType === 'three' ? 'font-medium text-yellow-700' : '';
    } else if (confidence === '1-day') {
      return rateType === 'one' ? 'font-medium text-red-700' : '';
    }
    return '';
  };

  // Format display - show percentage only if it's meaningful (not 0)
  const formatRate = (rate: number, percentage: number) => {
    const formattedRate = Math.round(rate).toLocaleString();
    if (percentage > 0) {
      return `${formattedRate} impressions (${percentage.toFixed(1)}%)`;
    } else {
      return `${formattedRate} impressions`;
    }
  };

  return (
    <div className="border-t pt-2 mt-2">
      <div className="text-xs font-medium mb-1">Burn Rate Details:</div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className={getConfidenceStyle('one')}>1-Day Rate:</span>
          <span className={getConfidenceStyle('one')}>{formatRate(oneDayRate, oneDayPercentage)}</span>
        </div>
        <div className="flex justify-between">
          <span className={getConfidenceStyle('three')}>3-Day Rate:</span>
          <span className={getConfidenceStyle('three')}>{formatRate(threeDayRate, threeDayPercentage)}</span>
        </div>
        <div className="flex justify-between">
          <span className={getConfidenceStyle('seven')}>7-Day Rate:</span>
          <span className={getConfidenceStyle('seven')}>{formatRate(sevenDayRate, sevenDayPercentage)}</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Confidence:</span>
          <span className="capitalize">{confidence.replace('-', ' ')}</span>
        </div>
      </div>
    </div>
  );
};

const CampaignHealthCard = ({
  campaignName,
  deliveryData,
  pacingData,
  contractTermsData,
  unfilteredData = [],
  dbContractTerms = []
}: CampaignHealthCardProps) => {
  // Modal state for campaign details
  const [modalOpen, setModalOpen] = useState(false);

  const handleHealthHeaderClick = () => {
    setModalOpen(true);
  };

  // Get real pacing metrics using the same logic as the pacing card
  const realPacingMetrics = useMemo(() => {
    console.log('CampaignHealthCard: Getting real pacing metrics for:', campaignName);
    console.log('CampaignHealthCard: unfilteredData length:', unfilteredData.length);
    console.log('CampaignHealthCard: dbContractTerms length:', dbContractTerms.length);
    console.log('CampaignHealthCard: deliveryData length:', deliveryData.length);

    // We need deliveryData to have content, not necessarily unfilteredData or dbContractTerms
    if (!deliveryData.length) {
      console.log('CampaignHealthCard: No delivery data available');
      return null;
    }

    try {
      // Use the same contract terms processing logic as the Pacing tab
      let contractTerms: ContractTerms[] = [];

      if (dbContractTerms.length > 0) {
        // Convert database contract terms to the expected format
        contractTerms = dbContractTerms.map((row: any) => ({
          Name: row.campaign_name,
          'Start Date': row.start_date,
          'End Date': row.end_date,
          Budget: row.budget.toString(),
          CPM: row.cpm.toString(),
          'Impressions Goal': row.impressions_goal.toString()
        }));
      } else if (contractTermsData.length > 0) {
        // Fallback to uploaded contract terms data
        contractTerms = contractTermsData.map((row: any) => ({
          Name: row.Name || row['Campaign Name'] || row.CAMPAIGN_ORDER_NAME || row['CAMPAIGN ORDER NAME'] || '',
          'Start Date': row['Start Date'] || row.START_DATE || '',
          'End Date': row['End Date'] || row.END_DATE || '',
          Budget: row.Budget || row.BUDGET || '',
          CPM: row.CPM || row.cpm || '',
          'Impressions Goal': row['Impressions Goal'] || row.IMPRESSIONS_GOAL || row['GOAL IMPRESSIONS'] || ''
        }));
      }

      if (contractTerms.length === 0) {
        return null;
      }

      // Transform delivery data to the expected format
      const formattedDeliveryData: PacingDeliveryData[] = deliveryData.map((row: any) => ({
        DATE: row.DATE || '',
        'CAMPAIGN ORDER NAME': row['CAMPAIGN ORDER NAME'] || '',
        IMPRESSIONS: row.IMPRESSIONS?.toString() || '0',
        SPEND: row.SPEND?.toString() || '0'
      }));

      // Transform unfiltered data for global date calculation
      const unfilteredDeliveryData: PacingDeliveryData[] = unfilteredData.map((row: any) => ({
        DATE: row.DATE || '',
        'CAMPAIGN ORDER NAME': row['CAMPAIGN ORDER NAME'] || '',
        IMPRESSIONS: row.IMPRESSIONS?.toString() || '0',
        SPEND: row.SPEND?.toString() || '0'
      }));

      // Use processCampaigns to get the processed campaign data
      const processedCampaigns = processCampaigns(contractTerms, formattedDeliveryData, unfilteredDeliveryData);

      console.log('CampaignHealthCard: Processed campaigns:', processedCampaigns.length);
      console.log('CampaignHealthCard: Contract terms used:', contractTerms.length);

      // Find the specific campaign we're looking for
      const campaign = processedCampaigns.find(c => c.name === campaignName);

      if (campaign) {
        console.log('CampaignHealthCard: Found campaign metrics for:', campaign.name);
        console.log('CampaignHealthCard: Campaign metrics:', campaign.metrics);
        return campaign.metrics;
      } else {
        console.log('CampaignHealthCard: Campaign not found in processed campaigns');
        console.log('CampaignHealthCard: Looking for:', campaignName);
        console.log('CampaignHealthCard: Available campaign names:', processedCampaigns.map(c => c.name));
        return null;
      }
    } catch (error) {
      console.error('Error calculating real pacing metrics:', error);
      return null;
    }
  }, [campaignName, deliveryData, unfilteredData, dbContractTerms, contractTermsData]);

  const healthData = useMemo(() => {
    try {
      console.log('CampaignHealthCard: Calculating health data for:', campaignName);
      console.log('CampaignHealthCard: Real pacing metrics available:', !!realPacingMetrics);
      console.log('CampaignHealthCard: deliveryData length:', deliveryData.length);
      console.log('CampaignHealthCard: pacingData length:', pacingData.length);
      console.log('CampaignHealthCard: contractTermsData length:', contractTermsData.length);

      if (realPacingMetrics) {
        console.log('CampaignHealthCard: Real pacing metrics:', realPacingMetrics);
      }

      const result = calculateCampaignHealth(deliveryData, campaignName, pacingData, contractTermsData, realPacingMetrics);
      console.log('CampaignHealthCard: Health calculation result:', result);

      if (!result) {
        console.error('CampaignHealthCard: Health calculation returned null');
        return null;
      }

      if (result.healthScore === 0) {
        console.error('CampaignHealthCard: Health calculation returned zero score');
      }

      return result;
    } catch (error) {
      console.error('CampaignHealthCard: Error calculating health data:', error);
      console.error('CampaignHealthCard: Error stack:', error.stack);
      return null;
    }
  }, [campaignName, deliveryData, pacingData, contractTermsData, realPacingMetrics]);

  if (!healthData || healthData.healthScore === 0) {
    return (
      <Card className="col-span-2 md:col-span-3">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-500" />
            Campaign Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            No health data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const status = getHealthStatus(healthData.healthScore);

  return (
    <Card className="col-span-2 md:col-span-3">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle
            className="text-base flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors group"
            onClick={handleHealthHeaderClick}
          >
            <Activity className="h-5 w-5 text-green-500 group-hover:text-blue-500 transition-colors" />
            Campaign Health
            <HelpCircle className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold">{formatScore(healthData.healthScore)}</div>
            <Badge variant="secondary" className={`${status.color} ${status.bgColor} border-0`}>
              {status.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* ROAS Score */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <div className="text-lg font-semibold">{formatScore(healthData.roasScore)}</div>
              <div className="text-xs text-muted-foreground">ROAS Score</div>
              <div className="text-xs text-muted-foreground">{healthData.roas.toFixed(2)}x return</div>
            </div>
          </div>

          {/* CTR Score */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <MousePointer className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <div className="text-lg font-semibold">{formatScore(healthData.ctrScore)}</div>
              <div className="text-xs text-muted-foreground">CTR Score</div>
              <div className="text-xs text-muted-foreground">{healthData.ctr.toFixed(2)}% rate</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Delivery Pacing Score */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50">
              <Target className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <div className="text-lg font-semibold">{formatScore(healthData.deliveryPacingScore)}</div>
              <div className="text-xs text-muted-foreground">Delivery Score</div>
              <div className="text-xs text-muted-foreground">{healthData.deliveryPacing.toFixed(1)}% pace</div>
            </div>
          </div>

          {/* Burn Rate Score */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-50">
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <div className="text-lg font-semibold">{formatScore(healthData.burnRateScore)}</div>
              <div className="text-xs text-muted-foreground">Burn Rate Score</div>
              <div className="text-xs text-muted-foreground">{healthData.burnRateConfidence}</div>
            </div>
          </div>
        </div>

        {/* Overspend Risk */}
        {healthData.overspendScore < 8 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-red-700">Overspend Risk</div>
              <div className="text-xs text-red-600">
                Score: {formatScore(healthData.overspendScore)} | Risk: ${healthData.overspend.toFixed(0)}
              </div>
            </div>
          </div>
        )}

      </CardContent>

      {/* Campaign Details Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">Campaign Details</DialogTitle>
          </DialogHeader>

          {healthData && (
            <div className="space-y-3 mt-4">
              <div className="font-medium text-sm mb-2">{campaignName}</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>Overall Health:</span>
                  <span className="font-medium">{healthData.healthScore.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ROAS:</span>
                  <span className="font-medium">{healthData.roas.toFixed(1)}x (Score: {healthData.roasScore.toFixed(0)})</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Pacing:</span>
                  <span className="font-medium">{healthData.deliveryPacing.toFixed(1)}% (Score: {healthData.deliveryPacingScore.toFixed(0)})</span>
                </div>
                <div className="flex justify-between">
                  <span>Burn Rate:</span>
                  <span className="font-medium">
                    {healthData.burnRatePercentage > 0
                      ? `${healthData.burnRatePercentage.toFixed(1)}% (Score: ${healthData.burnRateScore.toFixed(0)})`
                      : `${Math.round(healthData.burnRate).toLocaleString()} daily (Score: ${healthData.burnRateScore.toFixed(0)})`
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>CTR:</span>
                  <span className="font-medium">{healthData.ctr.toFixed(3)}% (Score: {healthData.ctrScore.toFixed(0)})</span>
                </div>
                <div className="flex justify-between">
                  <span>Overspend:</span>
                  <span className="font-medium">${healthData.overspend.toFixed(2)} (Score: {healthData.overspendScore.toFixed(0)})</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between">
                    <span>Completion:</span>
                    <span className="font-medium">{healthData.completionPercentage.toFixed(1)}%</span>
                  </div>
                </div>
                {renderBurnRateDetails(healthData)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CampaignHealthCard;
