import React, { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { useSupabase } from '@/contexts/use-supabase';
import { toast } from 'sonner';

interface ClearDatabaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ClearDatabaseDialog: React.FC<ClearDatabaseDialogProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [isClearing, setIsClearing] = useState(false);
  const { clearCampaignData, clearContractTerms } = useSupabase();

  const handleClearCampaignData = async () => {
    try {
      setIsClearing(true);
      await clearCampaignData();
      toast.success('Successfully cleared all campaign delivery data');
      onSuccess?.();
    } catch (error) {
      console.error('Error clearing campaign data:', error);
      toast.error('Failed to clear campaign data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearContractTerms = async () => {
    try {
      setIsClearing(true);
      await clearContractTerms();
      toast.success('Successfully cleared all contract terms');
      onSuccess?.();
    } catch (error) {
      console.error('Error clearing contract terms:', error);
      toast.error('Failed to clear contract terms: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearAll = async () => {
    try {
      setIsClearing(true);
      await Promise.all([
        clearCampaignData(),
        clearContractTerms()
      ]);
      toast.success('Successfully cleared all database data');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error clearing all data:', error);
      toast.error('Failed to clear all data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            Clear Database
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Warning:</strong> These actions permanently delete data from your database and cannot be undone.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="flex flex-col gap-2">
              <h4 className="font-medium text-gray-900">Clear Campaign Delivery Data</h4>
              <p className="text-sm text-gray-600">
                Removes all uploaded campaign performance data (impressions, clicks, revenue, etc.)
              </p>
              <Button
                variant="destructive"
                onClick={handleClearCampaignData}
                disabled={isClearing}
                className="w-full"
              >
                {isClearing ? 'Clearing...' : 'Clear Campaign Data'}
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <h4 className="font-medium text-gray-900">Clear Contract Terms</h4>
              <p className="text-sm text-gray-600">
                Removes all contract terms data (budgets, goals, flight dates, etc.)
              </p>
              <Button
                variant="destructive"
                onClick={handleClearContractTerms}
                disabled={isClearing}
                className="w-full"
              >
                {isClearing ? 'Clearing...' : 'Clear Contract Terms'}
              </Button>
            </div>

            <div className="border-t pt-3">
              <div className="flex flex-col gap-2">
                <h4 className="font-medium text-gray-900">Clear Everything</h4>
                <p className="text-sm text-gray-600">
                  Removes all campaign data and contract terms from the database
                </p>
                <Button
                  variant="destructive"
                  onClick={handleClearAll}
                  disabled={isClearing}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  {isClearing ? 'Clearing...' : 'Clear All Data'}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isClearing}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};