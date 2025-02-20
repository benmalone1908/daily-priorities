
import { useState } from "react";
import FileUpload from "@/components/FileUpload";
import Dashboard from "@/components/Dashboard";

const Index = () => {
  const [data, setData] = useState<any[]>([]);

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
          <FileUpload onDataLoaded={setData} />
        </div>
      )}

      {data.length > 0 && <Dashboard data={data} />}
    </div>
  );
};

export default Index;
