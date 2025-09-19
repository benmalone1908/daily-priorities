import React from 'react';
import { AlertTriangle, Calendar, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Card, CardContent } from './ui/card';
import { formatNumber } from '@/lib/pacingUtils';

interface MissingContractsModalProps {
  isOpen: boolean;
  onClose: () => void;
  missingCampaigns: Array<{
    name: string;
    firstDate: string;
    lastDate: string;
    totalImpressions: number;
  }>;
}

export const MissingContractsModal: React.FC<MissingContractsModalProps> = ({
  isOpen,
  onClose,
  missingCampaigns
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Missing Contract Terms ({missingCampaigns.length} campaigns)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            The following campaigns appear in your delivery data but don't have contract terms in the database.
            Add contract terms to see accurate pacing calculations.
          </p>

          <div className="space-y-3">
            {missingCampaigns.map((campaign, index) => (
              <Card key={index} className="border-l-4 border-l-yellow-400">
                <CardContent className="pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-2">{campaign.name}</h4>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>First: {campaign.firstDate}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Last: {campaign.lastDate}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          <span>Total: {formatNumber(campaign.totalImpressions)} impressions</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};