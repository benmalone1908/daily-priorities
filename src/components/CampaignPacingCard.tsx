import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Target, TrendingUp, Clock } from 'lucide-react';
import { processCampaigns } from '@/lib/pacingCalculations';
import type { ContractTerms, PacingDeliveryData } from '@/types/pacing';
import type { DeliveryDataRow, ContractTermsRow, CSVRow } from '@/types/dashboard';
import { formatNumber } from '@/lib/utils';
import { parseDateString } from '@/lib/utils';

interface CampaignPacingCardProps {
  campaignName: string;
  contractTermsData: ContractTermsRow[];
  deliveryData: DeliveryDataRow[];
  unfilteredData: DeliveryDataRow[];
  dbContractTerms: ContractTermsRow[];
  pacingData: CSVRow[];
}

interface PacingStatus {
  level: 'on-target' | 'minor' | 'moderate' | 'major';
  label: string;
  color: string;
  bgColor: string;
}

const getPacingStatus = (currentPacing: number): PacingStatus => {
  const pacingPercent = currentPacing * 100;

  if (pacingPercent >= 95 && pacingPercent <= 105) {
    return {
      level: 'on-target',
      label: 'On Target',
      color: 'text-green-700',
      bgColor: 'bg-green-100'
    };
  } else if ((pacingPercent >= 85 && pacingPercent < 95) || (pacingPercent > 105 && pacingPercent <= 115)) {
    return {
      level: 'minor',
      label: 'Minor Deviation',
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-100'
    };
  } else if ((pacingPercent >= 70 && pacingPercent < 85) || (pacingPercent > 115 && pacingPercent <= 130)) {
    return {
      level: 'moderate',
      label: 'Moderate Deviation',
      color: 'text-orange-700',
      bgColor: 'bg-orange-100'
    };
  } else {
    return {
      level: 'major',
      label: 'Major Deviation',
      color: 'text-red-700',
      bgColor: 'bg-red-100'
    };
  }
};

export const CampaignPacingCard: React.FC<CampaignPacingCardProps> = ({
  campaignName,
  contractTermsData,
  deliveryData,
  unfilteredData,
  dbContractTerms,
  pacingData
}) => {
  const pacingMetrics = useMemo(() => {
    try {
      console.log('CampaignPacingCard: Processing campaign:', campaignName);
      console.log('CampaignPacingCard: dbContractTerms length:', dbContractTerms.length);
      console.log('CampaignPacingCard: contractTermsData length:', contractTermsData.length);
      console.log('CampaignPacingCard: deliveryData length:', deliveryData.length);
      console.log('CampaignPacingCard: unfilteredData length:', unfilteredData.length);
      console.log('CampaignPacingCard: pacingData length:', pacingData.length);

      // Use the same contract terms processing logic as the Pacing tab
      let contractTerms: ContractTerms[] = [];

      if (dbContractTerms.length > 0) {
        // Convert database contract terms to the expected format
        contractTerms = dbContractTerms.map((row) => ({
          Name: (row as Record<string, unknown>).campaign_name as string,
          'Start Date': (row as Record<string, unknown>).start_date as string,
          'End Date': (row as Record<string, unknown>).end_date as string,
          Budget: ((row as Record<string, unknown>).budget as number).toString(),
          CPM: ((row as Record<string, unknown>).cpm as number).toString(),
          'Impressions Goal': ((row as Record<string, unknown>).impressions_goal as number).toString()
        }));
      } else if (contractTermsData.length > 0) {
        // Fallback to uploaded contract terms data
        contractTerms = contractTermsData.map((row) => ({
          Name: (row.Name || row['Campaign Name' as keyof typeof row] || row['CAMPAIGN_ORDER_NAME' as keyof typeof row] || row['CAMPAIGN ORDER NAME' as keyof typeof row] || '') as string,
          'Start Date': (row['Start Date'] || row['START_DATE' as keyof typeof row] || '') as string,
          'End Date': (row['End Date'] || row['END_DATE' as keyof typeof row] || '') as string,
          Budget: (row.Budget || row['BUDGET' as keyof typeof row] || '') as string,
          CPM: (row.CPM || row['cpm' as keyof typeof row] || '') as string,
          'Impressions Goal': (row['Impressions Goal'] || row['IMPRESSIONS_GOAL' as keyof typeof row] || row['GOAL IMPRESSIONS' as keyof typeof row] || '') as string
        }));
      } else {
        // Try to derive contract terms from campaign data
        const campaignRows = deliveryData.filter(row => row['CAMPAIGN ORDER NAME'] === campaignName);

        if (campaignRows.length === 0) {
          return null;
        }

        const dates = campaignRows
          .map(row => parseDateString(row.DATE))
          .filter(Boolean) as Date[];
        dates.sort((a, b) => a.getTime() - b.getTime());
        const startDate = dates[0];
        const endDate = dates[dates.length - 1];

        // Calculate totals for this campaign
        const totalImpressions = campaignRows.reduce((sum, row) => sum + (parseInt(row.IMPRESSIONS?.toString().replace(/,/g, '') || '0') || 0), 0);
        const totalSpend = campaignRows.reduce((sum, row) => sum + (parseFloat(row.SPEND?.toString().replace(/[$,]/g, '') || '0') || 0), 0);

        // Estimate CPM from spend and impressions
        const estimatedCPM = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;

        contractTerms = [{
          Name: campaignName,
          'Start Date': startDate ? startDate.toISOString().split('T')[0] : '',
          'End Date': endDate ? endDate.toISOString().split('T')[0] : '',
          Budget: totalSpend.toString(),
          CPM: estimatedCPM.toFixed(2),
          'Impressions Goal': Math.round(totalImpressions * 1.1).toString() // Assume 10% buffer over actual
        }];
      }

      // Transform delivery data to the expected format
      const formattedDeliveryData: PacingDeliveryData[] = deliveryData.map((row) => ({
        DATE: row.DATE || '',
        'CAMPAIGN ORDER NAME': row['CAMPAIGN ORDER NAME'] || '',
        IMPRESSIONS: row.IMPRESSIONS?.toString() || '0',
        SPEND: (row.SPEND ?? row['SPEND' as keyof typeof row])?.toString() || '0'
      }));

      // Transform unfiltered data for global date calculation
      const unfilteredDeliveryData: PacingDeliveryData[] = unfilteredData.map((row) => ({
        DATE: row.DATE || '',
        'CAMPAIGN ORDER NAME': row['CAMPAIGN ORDER NAME'] || '',
        IMPRESSIONS: row.IMPRESSIONS?.toString() || '0',
        SPEND: (row.SPEND ?? row['SPEND' as keyof typeof row])?.toString() || '0'
      }));

      // Use processCampaigns to get the processed campaign data
      const processedCampaigns = processCampaigns(contractTerms, formattedDeliveryData, unfilteredDeliveryData);

      console.log('CampaignPacingCard: Processed campaigns:', processedCampaigns.length);
      console.log('CampaignPacingCard: Contract terms used:', contractTerms.length);

      // Find the specific campaign we're looking for
      const campaign = processedCampaigns.find(c => c.name === campaignName);

      if (campaign) {
        console.log('CampaignPacingCard: Found campaign metrics for:', campaign.name);
        console.log('CampaignPacingCard: Current pacing:', campaign.metrics.currentPacing);
        console.log('CampaignPacingCard: Yesterday vs needed:', campaign.metrics.yesterdayVsNeeded);
        console.log('CampaignPacingCard: Full metrics:', {
          daysIntoCampaign: campaign.metrics.daysIntoCampaign,
          daysUntilEnd: campaign.metrics.daysUntilEnd,
          actualImpressions: campaign.metrics.actualImpressions,
          expectedImpressions: campaign.metrics.expectedImpressions,
          yesterdayImpressions: campaign.metrics.yesterdayImpressions
        });
      } else {
        console.log('CampaignPacingCard: Campaign not found in processed campaigns');
        console.log('CampaignPacingCard: Looking for:', campaignName);
        console.log('CampaignPacingCard: Available campaign names:', processedCampaigns.map(c => c.name));
      }

      return campaign?.metrics || null;
    } catch (error) {
      console.error('Error calculating pacing metrics:', error);
      return null;
    }
  }, [campaignName, contractTermsData, deliveryData, unfilteredData, dbContractTerms, pacingData]);

  if (!pacingMetrics) {
    return (
      <Card className="col-span-2 md:col-span-3">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            Campaign Pacing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            No pacing data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const status = getPacingStatus(pacingMetrics.currentPacing);
  const yesterdayRatio = pacingMetrics.yesterdayVsNeeded;

  return (
    <Card className="col-span-2 md:col-span-3">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            Campaign Pacing
          </CardTitle>
          <Badge variant="secondary" className={`${status.color} ${status.bgColor} border-0`}>
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Days Into Campaign */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <div className="text-lg font-semibold">{pacingMetrics.daysIntoCampaign}</div>
              <div className="text-xs text-muted-foreground">Days Into</div>
            </div>
          </div>

          {/* Days Until End */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-50">
              <Clock className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <div className="text-lg font-semibold">{pacingMetrics.daysUntilEnd}</div>
              <div className="text-xs text-muted-foreground">Days Until End</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Current Pacing */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <div className="text-lg font-semibold">{(pacingMetrics.currentPacing * 100).toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">Current Pacing</div>
            </div>
          </div>

          {/* Yesterday's Ratio */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50">
              <Target className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <div className={`text-lg font-semibold ${
                yesterdayRatio >= 1 ? 'text-green-600' :
                yesterdayRatio >= 0.8 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {(yesterdayRatio * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">Yesterday's Ratio</div>
            </div>
          </div>
        </div>

        {/* Campaign Completion */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Campaign Completion</span>
            <span>{formatNumber(pacingMetrics.actualImpressions)} / {formatNumber(pacingMetrics.impressionGoal)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                pacingMetrics.currentPacing >= 0.95 && pacingMetrics.currentPacing <= 1.05
                  ? 'bg-green-500'
                  : pacingMetrics.currentPacing < 0.85 || pacingMetrics.currentPacing > 1.15
                  ? 'bg-red-500'
                  : 'bg-yellow-500'
              }`}
              style={{ width: `${Math.min(100, (pacingMetrics.actualImpressions / pacingMetrics.impressionGoal) * 100)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};