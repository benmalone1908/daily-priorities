
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { normalizeDate, logDateDetails, parseDateString } from "@/lib/utils";

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
                    try {
                      const dateStr = String(value).trim();
                      console.log(`Processing date from CSV row ${rowIndex + 1}: ${dateStr}`);
                      
                      // Keep original date format
                      processed[header] = dateStr;
                      
                      // Validate the date can be parsed
                      const parsedDate = parseDateString(dateStr);
                      if (!parsedDate) {
                        console.warn(`Invalid date in row ${rowIndex + 1}: "${dateStr}"`);
                        return null;
                      }
                      
                      // Log successful date processing
                      console.log(`Successfully processed date in row ${rowIndex + 1}: ${dateStr} -> ${parsedDate.toISOString()}`);
                    } catch (e) {
                      console.error(`Error parsing date in row ${rowIndex + 1}:`, e);
                      return null;
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
                
                return processed;
              }).filter((row): row is Record<string, any> => row !== null);
              
              if (processedData.length === 0) {
                toast.error("No valid data rows found in CSV");
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
                  // Use our safe date parsing to ensure consistent comparison
                  const dateA = parseDateString(a.DATE);
                  const dateB = parseDateString(b.DATE);
                  
                  if (!dateA || !dateB) {
                    console.warn(`Failed to parse date for sorting: ${a.DATE} or ${b.DATE}`);
                    return 0;
                  }
                  
                  return dateA.getTime() - dateB.getTime();
                } catch (e) {
                  console.error("Error comparing dates for sorting:", e);
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
          header: false,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim()
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
