
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle } from "lucide-react";

interface AnomalyDetailsProps {
  anomalies: any[];
  metric: string;
}

const AnomalyDetails = ({ anomalies, metric }: AnomalyDetailsProps) => {
  // Group anomalies by campaign
  const anomaliesByCampaign = anomalies.reduce((acc, anomaly) => {
    if (!acc[anomaly.campaign]) {
      acc[anomaly.campaign] = [];
    }
    acc[anomaly.campaign].push(anomaly);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="text-sm text-blue-500 hover:underline">
          View all {anomalies.length} anomalies →
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{metric} Anomalies Detail</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] mt-4">
          <div className="space-y-6">
            {Object.entries(anomaliesByCampaign).map(([campaign, campaignAnomalies]) => (
              <Card key={campaign} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{campaign}</h4>
                      <p className="text-sm text-muted-foreground">
                        {campaignAnomalies.length} anomal{campaignAnomalies.length === 1 ? 'y' : 'ies'} detected
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {campaignAnomalies.map((anomaly, idx) => (
                      <div key={idx} className="text-sm border rounded-lg p-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="font-medium">Date: {anomaly.DATE}</span>
                        </div>
                        <div className="text-muted-foreground pl-6 space-y-1">
                          <p>Value: {anomaly.actualValue.toLocaleString()}</p>
                          <p>Campaign Average: {Math.round(anomaly.mean).toLocaleString()}</p>
                          <p className={anomaly.deviation > 0 ? "text-alert" : "text-warning"}>
                            Deviation: {anomaly.deviation > 0 ? "+" : ""}{anomaly.deviation.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default AnomalyDetails;
