import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { processCampaigns } from '@/lib/pacingCalculations';
import type { ContractTerms, PacingDeliveryData, ProcessedCampaign } from '@/types/pacing';
import type { CampaignDataRow } from '@/types/campaign';
import { parseDateString } from '@/lib/utils';

import { useSupabase } from '@/contexts/use-supabase';

interface ContractTermsDbRow {
  campaign_name: string;
  start_date: string;
  end_date: string;
  budget: number;
  cpm: number;
  impressions_goal: number;
}

export interface PacingProps {
  data: CampaignDataRow[];
  unfilteredData: CampaignDataRow[];
}

export interface PacingState {
  selectedCampaign: ProcessedCampaign | null;
  error: string | null;
  dbContractTerms: ContractTermsDbRow[];
  missingContracts: string[];
  missingContractsData: Array<{name: string; firstDate: string; lastDate: string; totalImpressions: number}>;
  showMissingModal: boolean;
  isLoading: boolean;
}

export interface PacingActions {
  handleCampaignClick: (campaign: ProcessedCampaign) => void;
  handleModalClose: () => void;
  setShowMissingModal: (show: boolean) => void;
}

export interface PacingData {
  campaigns: ProcessedCampaign[];
  processedCampaignsCount: number;
}

/**
 * Custom hook for managing pacing state and business logic
 * Extracted from Pacing.tsx for better maintainability
 */
export const usePacing = ({ data, unfilteredData }: PacingProps) => {
  const { getContractTerms } = useSupabase();

  // State management
  const [selectedCampaign, setSelectedCampaign] = useState<ProcessedCampaign | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dbContractTerms, setDbContractTerms] = useState<ContractTermsDbRow[]>([]);
  const [missingContracts, setMissingContracts] = useState<string[]>([]);
  const [missingContractsData, setMissingContractsData] = useState<Array<{name: string; firstDate: string; lastDate: string; totalImpressions: number}>>([]);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load contract terms from database
  useEffect(() => {
    const loadContractTerms = async () => {
      try {
        setIsLoading(true);
        const dbTerms = await getContractTerms();
        setDbContractTerms(dbTerms);
        console.log(`📋 Loaded ${dbTerms.length} contract terms from database`);
      } catch (error) {
        console.error('Error loading contract terms:', error);
        toast.error('Failed to load contract terms from database');
      } finally {
        setIsLoading(false);
      }
    };

    loadContractTerms();
  }, [getContractTerms]);

  // Transform existing data to pacing format
  const campaigns = useMemo(() => {
    try {
      if (data.length === 0) {
        return [];
      }

      // Only proceed if we have database contract terms
      if (dbContractTerms.length === 0) {
        console.log('📋 No database contract terms available for pacing analysis');
        return [];
      }

      // Get unique campaign names from data
      const campaignNamesInData = Array.from(new Set(data.map(row => row['CAMPAIGN ORDER NAME'])));

      // Convert database contract terms to the expected format
      const contractTerms: ContractTerms[] = dbContractTerms.map((row: ContractTermsDbRow) => ({
        Name: row.campaign_name,
        'Start Date': row.start_date,
        'End Date': row.end_date,
        Budget: row.budget.toString(),
        CPM: row.cpm.toString(),
        'Impressions Goal': row.impressions_goal.toString()
      }));

      // Find campaigns that are missing contract terms
      const campaignsWithContracts = new Set(dbContractTerms.map(t => t.campaign_name));
      const missing = campaignNamesInData.filter(name => !campaignsWithContracts.has(name));

      // Calculate detailed data for missing campaigns and filter out campaigns with zero impressions on most recent day
      const missingDetails = missing.map(campaignName => {
        const campaignRows = data.filter(row => row['CAMPAIGN ORDER NAME'] === campaignName);

        const dates = campaignRows
          .map(row => parseDateString(row.DATE))
          .filter(Boolean) as Date[];
        dates.sort((a, b) => a.getTime() - b.getTime());

        // Find the most recent day's data
        const mostRecentDate = dates[dates.length - 1];
        const mostRecentRow = campaignRows.find(row => {
          const rowDate = parseDateString(row.DATE);
          return rowDate && rowDate.getTime() === mostRecentDate?.getTime();
        });

        // Check if most recent day has zero impressions (not blank, but actual zero)
        const mostRecentImpressions = mostRecentRow ? parseInt(mostRecentRow.IMPRESSIONS?.toString().replace(/,/g, '') || '0') : 0;
        const hasZeroImpressionsOnMostRecentDay = mostRecentRow && mostRecentRow.IMPRESSIONS !== undefined && mostRecentRow.IMPRESSIONS !== null && mostRecentRow.IMPRESSIONS !== 0 && mostRecentImpressions === 0;

        const totalImpressions = campaignRows.reduce((sum, row) =>
          sum + (parseInt(row.IMPRESSIONS?.toString().replace(/,/g, '') || '0') || 0), 0);

        return {
          name: campaignName,
          firstDate: dates[0] ? dates[0].toLocaleDateString() : 'Unknown',
          lastDate: dates[dates.length - 1] ? dates[dates.length - 1].toLocaleDateString() : 'Unknown',
          totalImpressions,
          hasZeroImpressionsOnMostRecentDay
        };
      }).filter(campaign => !campaign.hasZeroImpressionsOnMostRecentDay); // Filter out campaigns with zero impressions on most recent day

      setMissingContractsData(missingDetails);
      setMissingContracts(missingDetails.map(c => c.name));
      console.log(`📋 Using ${contractTerms.length} database contract terms`);
      console.log(`⚠️ Found ${missingDetails.length} campaigns without contract terms:`, missingDetails.map(c => c.name));

      // Transform delivery data (use filtered data for display/calculations)
      const deliveryData: PacingDeliveryData[] = data.map((row: CampaignDataRow) => ({
        DATE: row.DATE || '',
        'CAMPAIGN ORDER NAME': row['CAMPAIGN ORDER NAME'] || '',
        IMPRESSIONS: row.IMPRESSIONS?.toString() || '0',
        SPEND: row.SPEND?.toString() || '0'
      }));

      // Transform unfiltered data for global date calculation (use all data)
      const unfilteredDeliveryData: PacingDeliveryData[] = unfilteredData.map((row: CampaignDataRow) => ({
        DATE: row.DATE || '',
        'CAMPAIGN ORDER NAME': row['CAMPAIGN ORDER NAME'] || '',
        IMPRESSIONS: row.IMPRESSIONS?.toString() || '0',
        SPEND: row.SPEND?.toString() || '0'
      }));

      const processedCampaigns = processCampaigns(contractTerms, deliveryData, unfilteredDeliveryData);

      if (processedCampaigns.length === 0) {
        setError('No campaigns could be processed. All campaigns may be missing contract terms or delivery data.');
      } else if (processedCampaigns.length < contractTerms.length) {
        const skippedCount = contractTerms.length - processedCampaigns.length;
        setError(`Successfully processed ${processedCampaigns.length} campaigns. ${skippedCount} campaigns were skipped due to missing delivery data.`);
      } else {
        setError(null);
      }

      return processedCampaigns;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing campaign data');
      return [];
    }
  }, [data, unfilteredData, dbContractTerms]);

  // Actions
  const handleCampaignClick = (campaign: ProcessedCampaign) => {
    setSelectedCampaign(campaign);
  };

  const handleModalClose = () => {
    setSelectedCampaign(null);
  };

  const state: PacingState = {
    selectedCampaign,
    error,
    dbContractTerms,
    missingContracts,
    missingContractsData,
    showMissingModal,
    isLoading
  };

  const actions: PacingActions = {
    handleCampaignClick,
    handleModalClose,
    setShowMissingModal
  };

  const pacingData: PacingData = {
    campaigns,
    processedCampaignsCount: campaigns.length
  };

  return {
    state,
    actions,
    data: pacingData
  };
};