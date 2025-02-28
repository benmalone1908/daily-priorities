
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getColorClasses } from "@/utils/anomalyColors";
import { useState } from "react";

interface AnomalyDetailsProps {
  anomalies: any[];
  metric: string;
  anomalyPeriod: "daily" | "weekly";
}

const AnomalyDetails = ({ anomalies, metric, anomalyPeriod }: AnomalyDetailsProps) => {
  const [selectedAnomaly, setSelectedAnomaly] = useState<any | null>(null);

  if (!anomalies || anomalies.length === 0) {
    return null;
  }

  const openDetails = (anomaly: any) => {
    setSelectedAnomaly(anomaly);
  };

  const closeDetails = () => {
    setSelectedAnomaly(null);
  };

  // Function to render the detailed view for a specific anomaly
  const renderAnomalyDetail = (anomaly: any) => {
    const colorClasses = getColorClasses(anomaly.deviation);
    const colorClass = colorClasses.split(' ').find(c => c.startsWith('text-'));
    
    // Check if the rows array exists and has data
    const hasDetails = anomalyPeriod === "weekly" && 
                      Array.isArray(anomaly.rows) && 
                      anomaly.rows.length > 0;
    
    // Extract date range from rows for weekly anomalies
    let dateRangeInfo = "";
    if (hasDetails) {
      try {
        // Get the actual dates directly from the rows data without adjustments
        const dates = anomaly.rows.map((row: any) => new Date(row.DATE));
        
        // Find the earliest and latest dates
        const firstDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const lastDate = new Date(Math.max(...dates.map(d => d.getTime())));
        
        // Format dates as MM/DD
        const formatDate = (date: Date) => {
          return `${date.getMonth() + 1}/${date.getDate()}`;
        };
        
        dateRangeInfo = `(${formatDate(firstDate)} - ${formatDate(lastDate)})`;
      } catch (error) {
        console.error("Error formatting date range:", error);
      }
    }
    
    return (
      <div className="p-4 border rounded-lg">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-lg">{anomaly.campaign}</h3>
            <p className="text-muted-foreground">
              {anomaly.DATE}
              {dateRangeInfo && <span className="ml-1 text-xs">{dateRangeInfo}</span>}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full ${colorClasses}`}>
            <span className="text-sm font-medium">
              {anomaly.deviation > 0 ? "+" : ""}{anomaly.deviation.toFixed(1)}%
            </span>
          </div>
        </div>
        
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Actual Value</p>
            <p className="text-xl font-bold">{Math.round(anomaly.actualValue).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Expected (Mean)</p>
            <p className="text-xl font-bold">{Math.round(anomaly.mean).toLocaleString()}</p>
          </div>
        </div>
        
        {hasDetails && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Daily breakdown:</p>
            <div className="bg-muted/50 p-2 rounded text-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-muted">
                    <th className="text-left py-2 font-medium">Date</th>
                    <th className="text-right py-2 font-medium">Actual</th>
                    <th className="text-right py-2 font-medium">Expected</th>
                    <th className="text-right py-2 font-medium">Deviation</th>
                  </tr>
                </thead>
                <tbody>
                  {anomaly.rows.map((row: any, idx: number) => {
                    const actualValue = Number(row[metric]);
                    
                    let expectedValue;
                    
                    if (anomaly.dailyExpectedValues && anomaly.dailyExpectedValues[idx]) {
                      expectedValue = anomaly.dailyExpectedValues[idx];
                    } 
                    else {
                      expectedValue = anomaly.mean / anomaly.rows.length;
                    }
                    
                    const dailyDeviation = expectedValue !== 0 
                      ? ((actualValue - expectedValue) / expectedValue) * 100 
                      : 0;
                    
                    const dailyColorClass = getColorClasses(dailyDeviation).split(' ').find(c => c.startsWith('text-'));
                    
                    return (
                      <tr key={idx} className="border-b last:border-b-0 border-muted">
                        <td className="py-2 text-left font-medium">{row.DATE}</td>
                        <td className="py-2 text-right">{Math.round(actualValue).toLocaleString()}</td>
                        <td className="py-2 text-right">{Math.round(expectedValue).toLocaleString()}</td>
                        <td className={`py-2 text-right ${dailyColorClass}`}>
                          {dailyDeviation > 0 ? "+" : ""}{dailyDeviation.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" className="h-7 px-2">View all</Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
            <DialogTitle>{metric.charAt(0) + metric.slice(1).toLowerCase()} Anomalies</DialogTitle>
            <DialogDescription>
              Showing {anomalies.length} {anomalyPeriod} anomalies detected in the data
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto" style={{ maxHeight: "calc(80vh - 140px)" }}>
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>{anomalyPeriod === "daily" ? "Date" : "Week"}</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Deviation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {anomalies.map((anomaly, index) => {
                  const colorClass = getColorClasses(anomaly.deviation).split(' ').find(c => c.startsWith('text-'));
                  
                  return (
                    <TableRow key={index}>
                      <TableCell 
                        className="font-medium cursor-pointer hover:underline hover:text-primary"
                        onClick={() => openDetails(anomaly)}
                      >
                        {anomaly.campaign}
                      </TableCell>
                      <TableCell>{anomaly.DATE}</TableCell>
                      <TableCell>{Math.round(anomaly.actualValue).toLocaleString()}</TableCell>
                      <TableCell>{Math.round(anomaly.mean).toLocaleString()}</TableCell>
                      <TableCell className={colorClass}>
                        {anomaly.deviation > 0 ? "+" : ""}{anomaly.deviation.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Nested Dialog for Detailed View */}
      {selectedAnomaly && (
        <Dialog open={!!selectedAnomaly} onOpenChange={(open) => !open && closeDetails()}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Anomaly Details</DialogTitle>
              <DialogDescription>
                Detailed view for {selectedAnomaly.campaign}
              </DialogDescription>
            </DialogHeader>
            {renderAnomalyDetail(selectedAnomaly)}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default AnomalyDetails;
