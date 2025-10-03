import { useState, useEffect, useMemo, useCallback } from "react";
import { DateRange } from "react-day-picker";
import { useSupabase } from "@/contexts/use-supabase";
import { useCampaignFilter } from "@/contexts/use-campaign-filter";
import { setToStartOfDay, setToEndOfDay, parseDateString } from "@/lib/utils";
import { toast } from "sonner";
import { processCampaigns } from "@/lib/pacingCalculations";
import { calculateCampaignHealth } from "@/utils/campaignHealthScoring";
import { CampaignDataRow } from "@/types/campaign";
import { ContractTermsRow } from "@/types/dashboard";
import { GenericCSVRow } from "@/types/csv";
import { ProcessedCampaign } from "@/types/pacing";

interface UseCampaignManagerProps {
  data: CampaignDataRow[];
  pacingData: GenericCSVRow[];
  contractTermsData: ContractTermsRow[];
  globalDateRange?: DateRange | undefined;
}

interface CampaignSummary {
  impressions: number;
  clicks: number;
  ctr: number;
  revenue: number;
  spend: number;
  roas: number;
  transactions: number;
}

interface CampaignHealthScore {
  overall: number;
  metrics: Record<string, number>;
  issues: string[];
}

export interface CampaignManagerState {
  selectedCampaign: string | null;
  campaignData: CampaignDataRow[];
  campaignPacingData: GenericCSVRow[];
  campaignContractData: ContractTermsRow[];
  allContractData: ContractTermsRow[];
  isLoading: boolean;
  activeTab: string;
  pacingModalOpen: boolean;
  healthModalOpen: boolean;
}

export interface CampaignManagerActions {
  setSelectedCampaign: (campaign: string | null) => void;
  setActiveTab: (tab: string) => void;
  setPacingModalOpen: (open: boolean) => void;
  setHealthModalOpen: (open: boolean) => void;
  handleCampaignSelect: (campaign: string) => void;
  handleBackToCampaigns: () => void;
}

export interface CampaignManagerData {
  campaignList: string[];
  filteredCampaignData: CampaignDataRow[];
  campaignSummary: CampaignSummary;
  campaignPacingInfo: ProcessedCampaign | null;
  campaignHealthScore: CampaignHealthScore;
}

/**
 * Custom hook for managing campaign manager state and data processing
 * Extracted from CampaignManager.tsx for better maintainability
 */
export const useCampaignManager = ({
  data,
  pacingData,
  contractTermsData,
  globalDateRange
}: UseCampaignManagerProps) => {
  const { getCampaignData, getContractTerms } = useSupabase();
  const { isTestCampaign } = useCampaignFilter();

  // State management
  const [state, setState] = useState<CampaignManagerState>({
    selectedCampaign: null,
    campaignData: [],
    campaignPacingData: [],
    campaignContractData: [],
    allContractData: [],
    isLoading: false,
    activeTab: "dashboard",
    pacingModalOpen: false,
    healthModalOpen: false
  });

  // Actions
  const setSelectedCampaign = useCallback((campaign: string | null) => {
    setState(prev => ({ ...prev, selectedCampaign: campaign }));
  }, []);

  const setActiveTab = useCallback((tab: string) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  const setPacingModalOpen = useCallback((open: boolean) => {
    setState(prev => ({ ...prev, pacingModalOpen: open }));
  }, []);

  const setHealthModalOpen = useCallback((open: boolean) => {
    setState(prev => ({ ...prev, healthModalOpen: open }));
  }, []);

  // Get unique campaigns from data
  const campaignList = useMemo(() => {
    if (!data || data.length === 0) return [];

    const campaigns = new Set<string>();
    data.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"];
      if (campaignName && !isTestCampaign(campaignName)) {
        campaigns.add(campaignName);
      }
    });

    return Array.from(campaigns).sort();
  }, [data, isTestCampaign]);

  // Load campaign-specific data when a campaign is selected
  const handleCampaignSelect = useCallback(async (campaign: string) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Get campaign data from Supabase
      const campaignRows = await getCampaignData();
      const filteredCampaignRows = campaignRows.filter(
        row => row.campaign_order_name === campaign
      );

      // Transform to expected format
      const transformedData = filteredCampaignRows.map(row => ({
        DATE: row.date,
        "CAMPAIGN ORDER NAME": row.campaign_order_name,
        IMPRESSIONS: row.impressions,
        CLICKS: row.clicks,
        REVENUE: row.revenue,
        SPEND: row.spend,
        TRANSACTIONS: row.transactions
      }));

      // Get contract terms for this campaign
      const allContracts = await getContractTerms();
      const campaignContracts = allContracts.filter(
        contract => contract.campaign_name === campaign
      );

      // Transform contract data
      const transformedContracts = campaignContracts.map(contract => ({
        Name: contract.campaign_name,
        "Start Date": new Date(contract.start_date).toLocaleDateString(),
        "End Date": new Date(contract.end_date).toLocaleDateString(),
        Budget: contract.budget?.toString() || "0",
        CPM: contract.cpm?.toString() || "0",
        "Impressions Goal": contract.impressions_goal?.toString() || "0"
      }));

      // Filter pacing data for this campaign
      const campaignPacing = pacingData.filter(
        row => row.Campaign === campaign || row["Campaign Name"] === campaign
      );

      setState(prev => ({
        ...prev,
        selectedCampaign: campaign,
        campaignData: transformedData,
        campaignContractData: transformedContracts,
        campaignPacingData: campaignPacing,
        allContractData: allContracts,
        isLoading: false
      }));

    } catch (error) {
      console.error("Error loading campaign data:", error);
      toast.error("Failed to load campaign data");
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [getCampaignData, getContractTerms, pacingData]);

  const handleBackToCampaigns = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedCampaign: null,
      campaignData: [],
      campaignPacingData: [],
      campaignContractData: []
    }));
  }, []);

  // Filter campaign data based on global date range
  const filteredCampaignData = useMemo(() => {
    // If a campaign is selected, filter the original data for that campaign
    // Otherwise use state.campaignData (which would be empty if no campaign selected)
    const sourceData = state.selectedCampaign
      ? data.filter(row => {
          // Normalize both campaign names by removing extra spaces after colons for comparison
          const normalizedRowName = row["CAMPAIGN ORDER NAME"]?.replace(/:\s+/g, ':').trim();
          const normalizedSelectedName = state.selectedCampaign?.replace(/:\s+/g, ':').trim();
          return normalizedRowName === normalizedSelectedName;
        })
      : state.campaignData;

    let filtered = sourceData.filter(
      row =>
        row &&
        row.DATE !== 'Totals' &&
        !isTestCampaign(row["CAMPAIGN ORDER NAME"] || "")
    );

    // Apply global date range filter if set
    if (globalDateRange?.from || globalDateRange?.to) {
      filtered = filtered.filter(row => {
        const rowDate = parseDateString(row.DATE);
        if (!rowDate) return false;

        const startDate = globalDateRange.from ? setToStartOfDay(new Date(globalDateRange.from)) : null;
        const endDate = globalDateRange.to ? setToEndOfDay(new Date(globalDateRange.to)) : null;

        if (startDate && rowDate < startDate) return false;
        if (endDate && rowDate > endDate) return false;
        return true;
      });
    }

    return filtered;
  }, [data, state.selectedCampaign, state.campaignData, isTestCampaign, globalDateRange]);

  // Calculate campaign summary metrics
  const campaignSummary = useMemo(() => {
    if (!filteredCampaignData.length) return null;

    const totals = filteredCampaignData.reduce((acc, row) => ({
      impressions: acc.impressions + (parseFloat(row.IMPRESSIONS) || 0),
      clicks: acc.clicks + (parseFloat(row.CLICKS) || 0),
      revenue: acc.revenue + (parseFloat(row.REVENUE) || 0),
      spend: acc.spend + (parseFloat(row.SPEND) || 0),
      transactions: acc.transactions + (parseFloat(row.TRANSACTIONS) || 0)
    }), {
      impressions: 0,
      clicks: 0,
      revenue: 0,
      spend: 0,
      transactions: 0
    });

    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const roas = totals.spend > 0 ? totals.revenue / totals.spend : 0;

    return {
      ...totals,
      ctr,
      roas
    };
  }, [filteredCampaignData]);

  // Calculate campaign pacing information
  const campaignPacingInfo = useMemo(() => {
    if (!state.campaignPacingData.length || !state.selectedCampaign) return null;

    try {
      const processedPacing = processCampaigns(
        state.campaignPacingData,
        state.campaignContractData
      );

      return processedPacing.find(
        campaign => campaign.name === state.selectedCampaign
      );
    } catch (error) {
      console.error("Error processing pacing data:", error);
      return null;
    }
  }, [state.campaignPacingData, state.campaignContractData, state.selectedCampaign]);

  // Calculate campaign health score
  const campaignHealthScore = useMemo(() => {
    if (!filteredCampaignData.length || !state.selectedCampaign) return null;

    try {
      const healthData = calculateCampaignHealth(
        filteredCampaignData,
        state.campaignPacingData,
        state.allContractData
      );

      return healthData.find(
        campaign => campaign.campaignName === state.selectedCampaign
      );
    } catch (error) {
      console.error("Error calculating health score:", error);
      return null;
    }
  }, [filteredCampaignData, state.campaignPacingData, state.allContractData, state.selectedCampaign]);

  const actions: CampaignManagerActions = {
    setSelectedCampaign,
    setActiveTab,
    setPacingModalOpen,
    setHealthModalOpen,
    handleCampaignSelect,
    handleBackToCampaigns
  };

  const data_computed: CampaignManagerData = {
    campaignList,
    filteredCampaignData,
    campaignSummary,
    campaignPacingInfo,
    campaignHealthScore
  };

  return {
    state,
    actions,
    data: data_computed
  };
};