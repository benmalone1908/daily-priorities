import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity, TrendingUp } from "lucide-react";

// Import existing components that we'll refactor later
import DashboardWrapper from "@/components/DashboardWrapper";
import CampaignSparkCharts from "@/components/CampaignSparkCharts";
import RawDataTableImproved from "@/components/RawDataTableImproved";
import CampaignSummaryTable from "@/components/CampaignSummaryTable";
import { CampaignPacingCard } from "@/components/CampaignPacingCard";
import CampaignHealthCard from "@/components/CampaignHealthCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Import our custom hook
import { useCampaignManager } from "@/hooks/useCampaignManager";
import type { DeliveryDataRow, ContractTermsRow, CSVRow } from '@/types/dashboard';

interface CampaignManagerProps {
  data: DeliveryDataRow[];
  pacingData: CSVRow[];
  contractTermsData: ContractTermsRow[];
  useGlobalFilters?: boolean;
  globalDateRange?: DateRange | undefined;
  onCampaignDetailViewChange?: (isInDetailView: boolean) => void;
}

/**
 * Refactored CampaignManager component - reduced from 680 lines
 * Uses extracted custom hook for state management and data processing
 */
const CampaignManager = ({
  data,
  pacingData,
  contractTermsData,
  useGlobalFilters = false,
  globalDateRange,
  onCampaignDetailViewChange
}: CampaignManagerProps) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Use our custom hook for all state management and data processing
  const { state, actions, data: campaignData } = useCampaignManager({
    data,
    pacingData,
    contractTermsData,
    globalDateRange
  });

  // Sync URL with selected campaign
  useEffect(() => {
    if (state.selectedCampaign) {
      setSearchParams({ tab: 'campaigns', campaign: state.selectedCampaign });
    } else {
      const current = Object.fromEntries(searchParams);
      if (current.campaign) {
        delete current.campaign;
        setSearchParams(current);
      }
    }
  }, [state.selectedCampaign, setSearchParams, searchParams]);

  // Load campaign from URL on mount
  useEffect(() => {
    const campaignFromUrl = searchParams.get('campaign');
    if (campaignFromUrl && !state.selectedCampaign) {
      actions.setSelectedCampaign(campaignFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Notify parent component when detail view changes
  useEffect(() => {
    onCampaignDetailViewChange?.(!!state.selectedCampaign);
  }, [state.selectedCampaign, onCampaignDetailViewChange]);

  // Show campaign list if no campaign is selected
  if (!state.selectedCampaign) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-gray-600" />
          <h2 className="text-xl font-semibold text-gray-900">Campaign Manager</h2>
        </div>

        {campaignData.campaignList.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-gray-500 text-center">No campaigns available</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            <CampaignSummaryTable
              data={data}
              onCampaignSelect={actions.handleCampaignSelect}
              contractTermsData={contractTermsData}
              pacingData={pacingData}
              useGlobalFilters={useGlobalFilters}
              globalDateRange={globalDateRange}
            />
          </div>
        )}
      </div>
    );
  }

  // Show campaign detail view
  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={actions.handleBackToCampaigns}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Campaigns
        </Button>
        <h2 className="text-xl font-semibold text-gray-900 truncate">
          {state.selectedCampaign}
        </h2>
      </div>

      {/* Loading state */}
      {state.isLoading && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p>Loading campaign data...</p>
          </CardContent>
        </Card>
      )}

      {/* Campaign metrics cards */}
      {!state.isLoading && campaignData.campaignSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Impressions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {campaignData.campaignSummary.impressions.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Clicks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {campaignData.campaignSummary.clicks.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${campaignData.campaignSummary.revenue.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">ROAS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {campaignData.campaignSummary.roas.toFixed(2)}x
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action buttons */}
      {!state.isLoading && (
        <div className="flex gap-4">
          {campaignData.campaignPacingInfo && (
            <Button
              variant="outline"
              onClick={() => actions.setPacingModalOpen(true)}
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              View Pacing
            </Button>
          )}

          {campaignData.campaignHealthScore && (
            <Button
              variant="outline"
              onClick={() => actions.setHealthModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              View Health
            </Button>
          )}
        </div>
      )}

      {/* Tabbed content */}
      {!state.isLoading && (
        <Tabs value={state.activeTab} onValueChange={actions.setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="raw-data">Raw Data</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <div className="space-y-6">
              <DashboardWrapper
                data={campaignData.filteredCampaignData}
                metricsData={campaignData.filteredCampaignData}
                revenueData={campaignData.filteredCampaignData}
                selectedMetricsCampaigns={[]}
                selectedRevenueCampaigns={[]}
                selectedRevenueAdvertisers={[]}
                selectedRevenueAgencies={[]}
                onMetricsCampaignsChange={() => {}}
                onRevenueCampaignsChange={() => {}}
                onRevenueAdvertisersChange={() => {}}
                onRevenueAgenciesChange={() => {}}
                selectedWeeklyCampaigns={[]}
                onWeeklyCampaignsChange={() => {}}
                selectedMetricsAdvertisers={[]}
                selectedMetricsAgencies={[]}
                onMetricsAdvertisersChange={() => {}}
                onMetricsAgenciesChange={() => {}}
                useGlobalFilters={true}
                dateRange={globalDateRange}
              />
            </div>
          </TabsContent>

          <TabsContent value="raw-data" className="mt-6">
            <RawDataTableImproved
              data={campaignData.filteredCampaignData}
              useGlobalFilters={false}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Pacing Modal */}
      <Dialog open={state.pacingModalOpen} onOpenChange={actions.setPacingModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Campaign Pacing Details</DialogTitle>
          </DialogHeader>
          {state.selectedCampaign && (
            <CampaignPacingCard
              campaignName={state.selectedCampaign}
              contractTermsData={state.campaignContractData}
              pacingData={state.campaignPacingData}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Health Modal */}
      <Dialog open={state.healthModalOpen} onOpenChange={actions.setHealthModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Campaign Health Details</DialogTitle>
          </DialogHeader>
          {state.selectedCampaign && campaignData.campaignHealthScore && (
            <CampaignHealthCard
              campaign={campaignData.campaignHealthScore}
              contractTermsData={state.allContractData}
              pacingData={state.campaignPacingData}
              deliveryData={campaignData.filteredCampaignData}
              campaignName={state.selectedCampaign}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignManager;