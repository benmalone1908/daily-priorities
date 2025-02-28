import { useState } from "react";
import FileUpload from "@/components/FileUpload";
import Dashboard from "@/components/Dashboard";
import { toast } from "sonner";

const Index = () => {
  const [data, setData] = useState<any[]>([]);

  const handleDataLoaded = (uploadedData: any[]) => {
    try {
      // Validate data format before setting it
      if (!Array.isArray(uploadedData) || uploadedData.length === 0) {
        toast.error("Invalid data format received");
        return;
      }
      
      console.log(`Loaded ${uploadedData.length} rows of data`);
      
      // Further validation - check if we have necessary fields in at least the first row
      const requiredFields = ["DATE", "CAMPAIGN ORDER NAME", "IMPRESSIONS", "CLICKS", "REVENUE"];
      
      if (uploadedData[0]) {
        const missingFields = requiredFields.filter(field => 
          !Object.keys(uploadedData[0]).some(key => key.toUpperCase() === field)
        );
        
        if (missingFields.length > 0) {
          toast.error(`Missing required fields: ${missingFields.join(", ")}`);
          return;
        }
      }
      
      // Process dates to ensure they're in a standard format
      const processedData = uploadedData.map(row => {
        // Create a new object to avoid mutating the original
        const newRow = { ...row };
        
        // Ensure DATE is a string in YYYY-MM-DD format
        if (newRow.DATE) {
          try {
            const date = new Date(newRow.DATE);
            if (!isNaN(date.getTime())) {
              // Format as YYYY-MM-DD
              newRow.DATE = date.toISOString().split('T')[0];
            }
          } catch (e) {
            console.error("Error parsing date:", e);
            // Keep the original date if parsing fails
          }
        }
        
        // Ensure numerical fields are numbers
        ["IMPRESSIONS", "CLICKS", "TRANSACTIONS", "REVENUE", "SPEND"].forEach(field => {
          const normalizedField = Object.keys(newRow).find(key => key.toUpperCase() === field);
          if (normalizedField) {
            newRow[normalizedField] = Number(newRow[normalizedField]) || 0;
          }
        });
        
        return newRow;
      });
      
      setData(processedData);
      toast.success(`Successfully loaded ${processedData.length} rows of data`);
    } catch (error) {
      console.error("Error processing uploaded data:", error);
      toast.error("Failed to process the uploaded data");
    }
  };

  return (
    <div className="container py-8 space-y-8">
      <div className="space-y-2 text-center animate-fade-in">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
          Marketing Anomaly Detector
        </h1>
        <p className="text-muted-foreground">
          Upload your campaign data to identify potential anomalies and trends
        </p>
      </div>

      {data.length === 0 && (
        <div className="max-w-2xl mx-auto">
          <FileUpload onDataLoaded={handleDataLoaded} />
        </div>
      )}

      {data.length > 0 && <Dashboard data={data} />}
    </div>
  );
};

export default Index;
