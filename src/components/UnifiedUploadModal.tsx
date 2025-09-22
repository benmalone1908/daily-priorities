import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Target } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';

interface UnifiedUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeliveryDataLoaded?: (data: any[]) => void;
  onContractTermsLoaded?: (data: any[]) => void;
}

type FileType = 'delivery' | 'contract-terms' | '';

const UnifiedUploadModal: React.FC<UnifiedUploadModalProps> = ({
  isOpen,
  onClose,
  onDeliveryDataLoaded,
  onContractTermsLoaded
}) => {
  const [selectedFileType, setSelectedFileType] = useState<FileType>('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedFileType) {
      toast.error('Please select a file type first');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setIsUploading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setIsUploading(false);

        if (results.errors.length > 0) {
          console.error('CSV parsing errors:', results.errors);
          toast.error('Error parsing CSV file');
          return;
        }

        const data = results.data as any[];

        if (selectedFileType === 'delivery') {
          // Validate delivery data columns
          const requiredColumns = ['DATE', 'CAMPAIGN ORDER NAME', 'IMPRESSIONS', 'CLICKS', 'REVENUE', 'SPEND'];
          const headers = Object.keys(data[0] || {});
          const missingColumns = requiredColumns.filter(col =>
            !headers.some(header => header.toUpperCase().includes(col))
          );

          if (missingColumns.length > 0) {
            toast.error(`Missing required columns: ${missingColumns.join(', ')}`);
            return;
          }

          onDeliveryDataLoaded?.(data);
          toast.success(`Successfully loaded ${data.length} delivery records`);
        } else if (selectedFileType === 'contract-terms') {
          // Validate contract terms columns
          const requiredColumns = ['Name', 'Start Date', 'End Date', 'Budget', 'CPM', 'Impressions Goal'];
          const headers = Object.keys(data[0] || {});
          const missingColumns = requiredColumns.filter(col =>
            !headers.some(header => header.toLowerCase().includes(col.toLowerCase()))
          );

          if (missingColumns.length > 0) {
            toast.error(`Missing required columns: ${missingColumns.join(', ')}`);
            return;
          }

          onContractTermsLoaded?.(data);
          toast.success(`Successfully loaded ${data.length} contract terms`);
        }

        // Reset form and close modal
        setSelectedFileType('');
        onClose();
      },
      error: (error) => {
        setIsUploading(false);
        console.error('CSV parsing error:', error);
        toast.error('Failed to parse CSV file');
      }
    });

    // Reset file input
    event.target.value = '';
  };

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFileType('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload CSV Data
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">File Type</label>
            <Select value={selectedFileType} onValueChange={(value: FileType) => setSelectedFileType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select the type of data you're uploading" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="delivery">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Campaign Delivery Data</div>
                      <div className="text-xs text-muted-foreground">Performance reports with impressions, clicks, revenue</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="contract-terms">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Contract Terms</div>
                      <div className="text-xs text-muted-foreground">Campaign budgets, goals, and date ranges</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">CSV File</label>
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="csv-upload"
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  selectedFileType
                    ? 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                    : 'border-gray-200 bg-gray-25 cursor-not-allowed'
                }`}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className={`w-8 h-8 mb-4 ${selectedFileType ? 'text-gray-500' : 'text-gray-300'}`} />
                  <p className={`mb-2 text-sm ${selectedFileType ? 'text-gray-500' : 'text-gray-400'}`}>
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className={`text-xs ${selectedFileType ? 'text-gray-500' : 'text-gray-400'}`}>
                    CSV files only
                  </p>
                </div>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={!selectedFileType || isUploading}
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isUploading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UnifiedUploadModal;