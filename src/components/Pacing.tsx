import React from 'react';
import { Target, AlertTriangle, AlertCircle } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePacing } from '@/hooks/usePacing';
import { SummaryCards } from './pacing/SummaryCards';
import { CampaignOverviewTable } from './pacing/CampaignOverviewTable';
import { Modal } from './pacing/Modal';
import { MissingContractsModal } from './MissingContractsModal';
import { DetailedCampaignView } from './pacing/DetailedCampaignView';
import type { CampaignDataRow } from '@/types/campaign';

interface PacingProps {
  data: CampaignDataRow[];
  unfilteredData: CampaignDataRow[];
}

/**
 * Refactored Pacing component - significantly reduced from 528 lines
 * Uses extracted usePacing hook and modular components for better maintainability
 */
export const Pacing: React.FC<PacingProps> = ({ data, unfilteredData }) => {
  const { state, actions, data: pacingData } = usePacing({ data, unfilteredData });
  const { campaigns } = pacingData;
  const {
    selectedCampaign,
    error,
    missingContracts,
    missingContractsData,
    showMissingModal,
    isLoading
  } = state;
  const { handleCampaignClick, handleModalClose, setShowMissingModal } = actions;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Loading contract terms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Target className="h-5 w-5 text-gray-600" />
        <h2 className="text-xl font-semibold text-gray-900">Campaign Pacing</h2>
      </div>

      {campaigns.length === 0 ? (
        <Card className="p-6">
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Campaign Data Available</h3>
            <p className="text-gray-600">
              {data.length === 0
                ? "Please upload campaign data in the main dashboard first."
                : "Processing campaign data for pacing analysis..."
              }
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Missing Contract Terms Warning */}
          {missingContracts.length > 0 && (
            <Alert
              className="border-yellow-200 bg-yellow-50 cursor-pointer hover:bg-yellow-100 transition-colors"
              onClick={() => setShowMissingModal(true)}
            >
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Missing Contract Terms:</strong> {missingContracts.length} campaign{missingContracts.length > 1 ? 's are' : ' is'} missing contract terms in database. <span className="underline">Click to view details</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Summary Cards */}
          <SummaryCards campaigns={campaigns} />

          {/* Campaign Overview Table */}
          <CampaignOverviewTable
            campaigns={campaigns}
            onCampaignClick={handleCampaignClick}
            selectedAgencies={[]}
            selectedAdvertisers={[]}
            selectedCampaigns={[]}
          />
        </div>
      )}

      {/* Modal for detailed campaign view */}
      <Modal
        isOpen={!!selectedCampaign}
        onClose={handleModalClose}
        title={selectedCampaign?.name}
      >
        {selectedCampaign && <DetailedCampaignView campaign={selectedCampaign} />}
      </Modal>

      {/* Missing Contracts Modal */}
      <MissingContractsModal
        isOpen={showMissingModal}
        onClose={() => setShowMissingModal(false)}
        missingCampaigns={missingContractsData}
      />

      {/* Error Display */}
      {error && (
        <Card className="border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-start gap-2 text-yellow-800">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        </Card>
      )}
    </div>
  );
};