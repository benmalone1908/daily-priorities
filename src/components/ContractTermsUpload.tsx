import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, X } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { useSupabase } from "@/contexts/SupabaseContext";

interface ContractTermsUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ContractTermsUpload = ({ isOpen, onClose, onSuccess }: ContractTermsUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const { upsertContractTerms } = useSupabase();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];

    if (file) {
      try {
        toast.info("Processing contract terms CSV file...");

        Papa.parse(file, {
          complete: async (results) => {
            try {
              if (!results.data || !Array.isArray(results.data) || results.data.length < 2) {
                toast.error("Invalid CSV format or empty file");
                return;
              }

              const headers = results.data[0] as string[];
              if (!Array.isArray(headers) || headers.length === 0) {
                toast.error("Invalid or missing headers in CSV");
                return;
              }

              // Find column indices (case-insensitive)
              const findColumn = (targetHeader: string) => {
                return headers.findIndex(header =>
                  header.toLowerCase().trim() === targetHeader.toLowerCase()
                );
              };

              const nameIndex = Math.max(
                findColumn("name"),
                findColumn("campaign name"),
                findColumn("campaign"),
                findColumn("campaign order name")
              );
              const startDateIndex = Math.max(
                findColumn("start date"),
                findColumn("startdate"),
                findColumn("flight start")
              );
              const endDateIndex = Math.max(
                findColumn("end date"),
                findColumn("enddate"),
                findColumn("flight end")
              );
              const budgetIndex = Math.max(
                findColumn("budget"),
                findColumn("total budget")
              );
              const cpmIndex = Math.max(
                findColumn("cpm"),
                findColumn("rate")
              );
              const impressionsGoalIndex = Math.max(
                findColumn("impressions goal"),
                findColumn("goal impressions"),
                findColumn("target impressions"),
                findColumn("impressions target")
              );

              if (nameIndex === -1 || startDateIndex === -1 || endDateIndex === -1) {
                toast.error("Required columns missing: Campaign Name, Start Date, End Date");
                return;
              }

              const contractTerms = results.data
                .slice(1) // Skip header row
                .filter((row: any) => row && row.length > 0 && row[nameIndex]) // Filter out empty rows
                .map((row: any) => {
                  const campaignName = row[nameIndex]?.toString().trim();
                  if (!campaignName) return null;

                  // Parse dates
                  const startDate = row[startDateIndex]?.toString().trim();
                  const endDate = row[endDateIndex]?.toString().trim();

                  // Parse numeric fields
                  const budget = parseFloat(row[budgetIndex]?.toString().replace(/[$,]/g, '') || '0') || 0;
                  const cpm = parseFloat(row[cpmIndex]?.toString().replace(/[$,]/g, '') || '0') || 0;
                  const impressionsGoal = parseInt(row[impressionsGoalIndex]?.toString().replace(/[,]/g, '') || '0') || 0;

                  return {
                    campaign_name: campaignName,
                    start_date: startDate,
                    end_date: endDate,
                    budget,
                    cpm,
                    impressions_goal: impressionsGoal
                  };
                })
                .filter(Boolean); // Remove null entries

              if (contractTerms.length === 0) {
                toast.error("No valid contract terms found in the file");
                return;
              }

              // Save to database
              await upsertContractTerms(contractTerms, true); // Clear first = true
              toast.success(`Successfully uploaded ${contractTerms.length} contract terms`);
              onSuccess();
              onClose();

            } catch (error) {
              console.error("Error processing contract terms:", error);
              toast.error("Failed to process contract terms: " + (error instanceof Error ? error.message : 'Unknown error'));
            }
          },
          header: false,
          skipEmptyLines: true,
          error: (error) => {
            console.error("CSV parsing error:", error);
            toast.error("Failed to parse CSV file");
          }
        });
      } catch (error) {
        console.error("File processing error:", error);
        toast.error("Failed to process file");
      }
    }
  }, [upsertContractTerms, onSuccess, onClose]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    multiple: false,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    onDropAccepted: () => setIsDragging(false),
    onDropRejected: () => setIsDragging(false)
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload Contract Terms
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
              ${isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
              }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-600 mb-2">
              {isDragging
                ? "Drop your contract terms CSV file here"
                : "Drag and drop your contract terms CSV file here, or click to browse"
              }
            </p>
            <p className="text-xs text-gray-500">
              Required columns: Campaign Name, Start Date, End Date<br/>
              Optional: Budget, CPM, Impressions Goal
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContractTermsUpload;