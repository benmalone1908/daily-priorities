import { useState } from "react";
import Dashboard from "../components/Dashboard";
import FileUpload from "../components/FileUpload";
import { cn } from "@/lib/utils";

export default function Index() {
  const [data, setData] = useState<any[]>([]);

  return (
    <main className="container p-4 md:p-8">
      <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl mb-8">
        Campaign Anomaly Detection
      </h1>
      
      {data.length === 0 ? (
        <div className="max-w-3xl mx-auto">
          <FileUpload onDataLoaded={setData} />
        </div>
      ) : (
        <Dashboard data={data} />
      )}
    </main>
  );
}
