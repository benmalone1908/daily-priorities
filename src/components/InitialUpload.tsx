
import { toast } from "sonner";
import FileUpload from "@/components/FileUpload";

interface InitialUploadProps {
  onDataLoaded: (data: any[]) => void;
}

const InitialUpload = ({ onDataLoaded }: InitialUploadProps) => {
  const handleDataLoaded = (uploadedData: any[]) => {
    try {
      if (!Array.isArray(uploadedData) || uploadedData.length === 0) {
        toast.error("Invalid data format received");
        return;
      }
      
      console.log(`Loaded ${uploadedData.length} rows of data`);
      
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
      
      // Warn user about large datasets
      if (uploadedData.length > 5000) {
        toast.warning(`Large dataset detected (${uploadedData.length} rows). Some visualizations may be slower to load.`);
      }
      
      onDataLoaded(uploadedData);
    } catch (error) {
      console.error("Error processing uploaded data:", error);
      toast.error("Failed to process the uploaded data");
    }
  };

  return (
    <>
      <div className="space-y-2 text-center animate-fade-in">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
          Display Campaign Monitor
        </h1>
        <p className="text-muted-foreground">
          Upload your campaign data to identify potential anomalies and trends
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <FileUpload onDataLoaded={handleDataLoaded} />
      </div>
    </>
  );
};

export default InitialUpload;
