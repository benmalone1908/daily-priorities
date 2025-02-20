
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";

interface FileUploadProps {
  onDataLoaded: (data: any[]) => void;
}

const FileUpload = ({ onDataLoaded }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    
    if (file) {
      Papa.parse(file, {
        complete: (results) => {
          const headers = results.data[0];
          const requiredHeaders = [
            "DATE",
            "CAMPAIGN ORDER NAME",
            "IMPRESSIONS",
            "CLICKS",
            "TRANSACTIONS",
            "REVENUE",
            "SPEND"
          ];

          const missingHeaders = requiredHeaders.filter(
            (header) => !headers.includes(header)
          );

          if (missingHeaders.length > 0) {
            toast.error(`Missing required headers: ${missingHeaders.join(", ")}`);
            return;
          }

          onDataLoaded(results.data.slice(1));
          toast.success("Data loaded successfully!");
        },
        header: true,
        skipEmptyLines: true,
      });
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
