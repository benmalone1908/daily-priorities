import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { normalizeDate, logDateDetails, parseDateString } from "@/lib/utils";

interface FileUploadProps {
  onDataLoaded: (data: any[]) => void;
}

// Constants for chunking and processing
const CHUNK_SIZE = 500; // Process 500 rows at a time
const PROCESSING_DELAY = 0; // Milliseconds between chunks

const FileUpload = ({ onDataLoaded }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const processDataInChunks = (results: Papa.ParseResult<unknown>) => {
    try {
      // Add null check for results and results.data
      if (!results || !results.data) {
        toast.error("Invalid CSV format or empty data");
        setIsProcessing(false);
        return;
      }
      
      // Ensure we have data
      if (!Array.isArray(results.data) || results.data.length < 2) {
        toast.error("Invalid CSV format or empty file");
        setIsProcessing(false);
        return;
      }
      
      console.log("CSV parse results:", results);
      
      // Ensure headers are provided and properly formatted
      const headers = results.data[0] as string[];
      if (!Array.isArray(headers) || headers.length === 0) {
        toast.error("Invalid or missing headers in CSV");
        setIsProcessing(false);
        return;
      }
      
      // Required headers from the CSV
      const requiredHeaders = [
        "DATE",
        "CAMPAIGN ORDER NAME",
        "IMPRESSIONS",
        "CLICKS",
        "TRANSACTIONS",
        "REVENUE",
        "SPEND"
      ];

      // Convert headers to uppercase for case-insensitive comparison
      const upperHeaders = headers.map(header => String(header).toUpperCase());
      
      const missingHeaders = requiredHeaders.filter(
        (header) => !upperHeaders.includes(header)
      );

      if (missingHeaders.length > 0) {
        toast.error(`Missing required headers: ${missingHeaders.join(", ")}`);
        setIsProcessing(false);
        return;
      }

      // Map header indices for quicker access
      const headerIndexMap = headers.reduce((map, header, index) => {
        map[header.toUpperCase()] = index;
        return map;
      }, {} as Record<string, number>);

      // Get data rows (excluding header row)
      const dataRows = results.data.slice(1);
      const totalRows = dataRows.length;
      
      // Prepare array for processed data
      const processedData: Record<string, any>[] = [];
      
      // Process data in chunks to avoid UI freezing
      const processChunk = (startIndex: number) => {
        const endIndex = Math.min(startIndex + CHUNK_SIZE, totalRows);
        
        // Process current chunk
        for (let i = startIndex; i < endIndex; i++) {
          const row = dataRows[i];
          const rowIndex = i;
          
          if (!Array.isArray(row)) {
            console.warn(`Row ${rowIndex + 1} is not an array:`, row);
            continue;
          }
          
          if (row.length !== headers.length) {
            console.warn(`Row ${rowIndex + 1} has ${row.length} values, expected ${headers.length}`);
            continue;
          }
          
          // Check if row has any content
          if (row.every(cell => cell === null || cell === undefined || cell === "")) {
            console.warn(`Row ${rowIndex + 1} is empty`);
            continue;
          }
          
          const processed: Record<string, any> = {};
          
          // Process each header
          for (let j = 0; j < headers.length; j++) {
            const header = headers[j];
            const value = row[j];
            
            if (header.toUpperCase() === "DATE") {
              try {
                const dateStr = String(value).trim();
                
                // Keep original date format
                processed[header] = dateStr;
                
                // Validate the date can be parsed
                const parsedDate = parseDateString(dateStr);
                if (!parsedDate) {
                  console.warn(`Invalid date in row ${rowIndex + 1}: "${dateStr}"`);
                  continue;
                }
              } catch (e) {
                console.error(`Error parsing date in row ${rowIndex + 1}:`, e);
                continue;
              }
            } 
            // Convert numerical fields to numbers
            else if (["IMPRESSIONS", "CLICKS", "TRANSACTIONS", "REVENUE", "SPEND"].includes(header.toUpperCase())) {
              processed[header] = Number(value) || 0;
            } 
            else {
              processed[header] = String(value || "");
            }
          }
          
          processedData.push(processed);
        }
        
        // Update progress
        const newProgress = Math.min(Math.round((endIndex / totalRows) * 100), 99);
        setProgress(newProgress);
        
        // If there are more rows to process, schedule next chunk
        if (endIndex < totalRows) {
          setTimeout(() => processChunk(endIndex), PROCESSING_DELAY);
        } else {
          // All chunks processed, finalize
          finalizeProcessing(processedData);
        }
      };
      
      // Start processing chunks
      setIsProcessing(true);
      setProgress(0);
      processChunk(0);
    } catch (err) {
      console.error("Error processing CSV data:", err);
      toast.error("Error processing CSV data. Check console for details.");
      setIsProcessing(false);
    }
  };
  
  const finalizeProcessing = (processedData: Record<string, any>[]) => {
    try {
      if (processedData.length === 0) {
        toast.error("No valid data rows found in CSV");
        setIsProcessing(false);
        return;
      }
      
      console.log(`Processed ${processedData.length} valid rows`);
      
      // Log date statistics after processing
      const dates = processedData
        .map(row => row.DATE)
        .filter(Boolean)
        .sort();
      
      if (dates.length > 0) {
        console.log(`Processed date range: ${dates[0]} to ${dates[dates.length - 1]}`);
        console.log(`Total unique dates: ${new Set(dates).size}`);
      }
      
      // Count data by date - use object for higher performance than calling forEach
      const dateCounts: Record<string, number> = {};
      for (let i = 0; i < processedData.length; i++) {
        const date = processedData[i].DATE;
        dateCounts[date] = (dateCounts[date] || 0) + 1;
      }
      
      // Sort data by date (ascending) for consistency - use memoization in components instead
      processedData.sort((a, b) => {
        try {
          // Use our safe date parsing to ensure consistent comparison
          const dateA = parseDateString(a.DATE);
          const dateB = parseDateString(b.DATE);
          
          if (!dateA || !dateB) {
            return 0;
          }
          
          return dateA.getTime() - dateB.getTime();
        } catch (e) {
          return 0;
        }
      });
      
      // Complete and pass data to parent component
      setProgress(100);
      setIsProcessing(false);
      onDataLoaded(processedData);
      toast.success(`Successfully loaded ${processedData.length} rows`);
    } catch (err) {
      console.error("Error finalizing CSV data:", err);
      toast.error("Error finalizing data. Check console for details.");
      setIsProcessing(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    
    if (file) {
      try {
        toast.info("Processing CSV file...");
        
        Papa.parse(file, {
          complete: processDataInChunks,
          error: (error) => {
            console.error("CSV parsing error:", error);
            toast.error(`CSV parsing error: ${error.message}`);
            setIsProcessing(false);
          },
          header: false,
          skipEmptyLines: true,
          // Remove worker option to process in main thread to debug
          // worker: true, // Use a web worker if possible
          chunk: (results, parser) => {
            // This is only called if streaming
            console.log(`Parsing chunk with ${results.data.length} rows`);
          },
        });
      } catch (err) {
        console.error("Error parsing CSV:", err);
        toast.error("Failed to parse CSV file");
        setIsProcessing(false);
      }
    }
  }, [onDataLoaded]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    multiple: false,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    disabled: isProcessing,
  });

  return (
    <div
      {...getRootProps()}
      className={`relative flex flex-col items-center justify-center w-full p-12 transition-all duration-300 border-2 border-dashed rounded-lg ${
        isProcessing ? "cursor-not-allowed" : "cursor-pointer"
      } bg-background/50 backdrop-blur-sm ${
        isDragging
          ? "border-primary/50 bg-primary/5"
          : "border-border hover:border-primary/30 hover:bg-accent/5"
      }`}
    >
      <input {...getInputProps()} disabled={isProcessing} />
      <div className="flex flex-col items-center space-y-4 text-center animate-fade-in">
        {isProcessing ? (
          <>
            <div className="w-full max-w-xs bg-muted rounded-full h-2.5 mb-4">
              <div 
                className="bg-primary h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <h3 className="text-lg font-semibold">Processing CSV data...</h3>
            <p className="text-sm text-muted-foreground">
              {progress < 100 ? `${progress}% complete` : 'Finalizing...'}
            </p>
          </>
        ) : (
          <>
            <div className="p-4 rounded-full bg-primary/5">
              <Upload className="w-8 h-8 text-primary/50" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Upload your campaign data</h3>
              <p className="text-sm text-muted-foreground">
                Drag and drop your CSV file here, or click to browse
              </p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span>Accepts CSV files only</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
