
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { normalizeDate, logDateDetails, parseCsvDate } from "@/lib/utils";

interface FileUploadProps {
  onDataLoaded: (data: any[]) => void;
}

const FileUpload = ({ onDataLoaded }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    
    if (file) {
      try {
        toast.info("Processing CSV file...");
        
        Papa.parse(file, {
          complete: (results) => {
            try {
              // Ensure we have data
              if (!results.data || !Array.isArray(results.data) || results.data.length < 2) {
                toast.error("Invalid CSV format or empty file");
                return;
              }
              
              console.log("CSV parse results:", results);
              
              // Ensure headers are provided and properly formatted
              const headers = results.data[0] as string[];
              if (!Array.isArray(headers) || headers.length === 0) {
                toast.error("Invalid or missing headers in CSV");
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
                return;
              }

              // Map header indices for quicker access
              const headerIndexMap = headers.reduce((map, header, index) => {
                map[header.toUpperCase()] = index;
                return map;
              }, {} as Record<string, number>);

              // Process the data to ensure numerical values are properly parsed
              const processedData = results.data.slice(1).map((row, rowIndex) => {
                if (!Array.isArray(row)) {
                  console.warn(`Row ${rowIndex + 1} is not an array:`, row);
                  return null;
                }
                
                if (row.length !== headers.length) {
                  console.warn(`Row ${rowIndex + 1} has ${row.length} values, expected ${headers.length}`);
                  return null;
                }
                
                // Check if row has any content
                if (row.every(cell => cell === null || cell === undefined || cell === "")) {
                  console.warn(`Row ${rowIndex + 1} is empty`);
                  return null;
                }
                
                const processed: Record<string, any> = {};
                
                // Process each header
                headers.forEach((header, index) => {
                  const value = row[index];
                  
                  if (header.toUpperCase() === "DATE") {
                    // Enhanced date handling with better logging
                    try {
                      const dateStr = String(value).trim();
                      
                      // Use our custom date parser for consistent handling
                      const normalizedDate = parseCsvDate(dateStr);
                      
                      if (!normalizedDate) {
                        console.warn(`Invalid date in row ${rowIndex + 1}: "${dateStr}"`);
                        processed[header] = ""; // Use empty string for invalid date
                      } else {
                        processed[header] = normalizedDate;
                        
                        // Log sample dates for debugging
                        if (rowIndex % 100 === 0 || normalizedDate.includes('-04-')) {
                          logDateDetails(`Row ${rowIndex + 1} date parsing`, dateStr, `-> ${normalizedDate}`);
                        }
                      }
                    } catch (e) {
                      console.warn(`Error parsing date in row ${rowIndex + 1}:`, e);
                      processed[header] = ""; // Use empty string for invalid date
                    }
                  } 
                  // Convert numerical fields to numbers
                  else if (["IMPRESSIONS", "CLICKS", "TRANSACTIONS", "REVENUE", "SPEND"].includes(header.toUpperCase())) {
                    processed[header] = Number(value) || 0;
                  } 
                  else {
                    processed[header] = String(value || "");
                  }
                });
                
                // Final validation - ensure we have a valid date and campaign name
                if (!processed.DATE || !processed["CAMPAIGN ORDER NAME"]) {
                  console.warn(`Row ${rowIndex + 1} missing DATE or CAMPAIGN ORDER NAME`);
                  return null;
                }
                
                return processed;
              }).filter((row): row is Record<string, any> => row !== null);
              
              if (processedData.length === 0) {
                toast.error("No valid data rows found in CSV");
                return;
              }

              console.log(`Processed ${processedData.length} valid rows`);
              
              // Log date statistics
              const dateSet = new Set<string>();
              processedData.forEach(row => {
                if (row.DATE) dateSet.add(row.DATE);
              });
              
              const dates = Array.from(dateSet).sort();
              console.log(`Found ${dates.length} unique dates from ${dates[0]} to ${dates[dates.length - 1]}`);
              console.log(`All dates in dataset: ${dates.join(', ')}`);
              
              // Count data by date
              const dateCounts: Record<string, number> = {};
              processedData.forEach(row => {
                const date = row.DATE;
                dateCounts[date] = (dateCounts[date] || 0) + 1;
              });
              
              // Log count of rows per date
              console.log("Rows per date:", dateCounts);
              
              // Focus on most recent date to check for issues
              if (dates.length > 0) {
                const mostRecentDate = dates[dates.length - 1];
                console.log(`Most recent date: ${mostRecentDate}, rows: ${dateCounts[mostRecentDate]}`);
                
                // Log a sample of rows from the most recent date
                const recentDateRows = processedData.filter(row => row.DATE === mostRecentDate);
                console.log(`Sample rows from ${mostRecentDate} (${recentDateRows.length} total):`, 
                  recentDateRows.slice(0, 5));
              }
              
              // Sort data by date (ascending) for consistency
              processedData.sort((a, b) => {
                try {
                  const dateA = new Date(a.DATE);
                  const dateB = new Date(b.DATE);
                  return dateA.getTime() - dateB.getTime();
                } catch (e) {
                  return 0;
                }
              });
              
              onDataLoaded(processedData);
              toast.success(`Successfully loaded ${processedData.length} rows from ${file.name}`);
            } catch (err) {
              console.error("Error processing CSV data:", err);
              toast.error("Error processing CSV data. Check console for details.");
            }
          },
          error: (error) => {
            console.error("CSV parsing error:", error);
            toast.error(`CSV parsing error: ${error.message}`);
          },
          header: false, // We'll handle headers manually for better control
          skipEmptyLines: true,
          transformHeader: (header) => {
            // Trim whitespace from headers
            return header.trim();
          }
        });
      } catch (err) {
        console.error("Error parsing CSV:", err);
        toast.error("Failed to parse CSV file");
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
  });

  return (
    <div
      {...getRootProps()}
      className={`relative flex flex-col items-center justify-center w-full p-12 transition-all duration-300 border-2 border-dashed rounded-lg cursor-pointer bg-background/50 backdrop-blur-sm ${
        isDragging
          ? "border-primary/50 bg-primary/5"
          : "border-border hover:border-primary/30 hover:bg-accent/5"
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center space-y-4 text-center animate-fade-in">
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
      </div>
    </div>
  );
};

export default FileUpload;
