
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getColorClasses } from "@/utils/anomalyColors";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface AnomalyDetailsProps {
  anomalies: any[];
  metric: string;
  anomalyPeriod: "daily" | "weekly";
}

const AnomalyDetails = ({ anomalies, metric, anomalyPeriod }: AnomalyDetailsProps) => {
  if (!anomalies || anomalies.length === 0) {
    return null;
  }

  const formatDayOfWeek = (dateStr: string) => {
    try {
      // Check if it's already a day name
      if (dateStr.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i)) {
        return dateStr;
      }
      
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
    } catch (err) {
      console.error("Error formatting day of week:", err);
      return dateStr;
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="h-7 px-2">View all</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{metric.charAt(0) + metric.slice(1).toLowerCase()} Anomalies</DialogTitle>
          <DialogDescription>
            Showing {anomalies.length} {anomalyPeriod} anomalies detected in the data
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="table">
          <TabsList className="mb-4">
            <TabsTrigger value="table">Table View</TabsTrigger>
            <TabsTrigger value="details">Detailed View</TabsTrigger>
            <TabsTrigger value="chart">Chart View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="table">
            <Table>
              <TableHeader>
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
                      <TableCell className="font-medium">{anomaly.campaign}</TableCell>
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
          </TabsContent>
          
          <TabsContent value="details">
            <div className="space-y-6">
              {anomalies.map((anomaly, index) => {
                const colorClasses = getColorClasses(anomaly.deviation);
                const colorClass = colorClasses.split(' ').find(c => c.startsWith('text-'));
                
                return (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-lg">{anomaly.campaign}</h3>
                        <p className="text-muted-foreground">{anomaly.DATE}</p>
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
                    
                    {anomalyPeriod === "weekly" && Array.isArray(anomaly.rows) && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Daily breakdown:</p>
                        <div className="bg-muted/50 p-2 rounded text-sm">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-muted">
                                <th className="text-left py-2 font-medium">Date</th>
                                <th className="text-left py-2 font-medium">Day</th>
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
                                else if (anomaly.dayOfWeekBaselines && row.DATE) {
                                  const dayOfWeek = formatDayOfWeek(row.DATE);
                                  expectedValue = anomaly.dayOfWeekBaselines[dayOfWeek] || (anomaly.mean / anomaly.rows.length);
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
                                    <td className="py-2 text-left">{formatDayOfWeek(row.DATE)}</td>
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
                    
                    {anomalyPeriod === "weekly" && anomaly.dayOfWeekDistribution && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Day of week distribution:</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          Shows how the actual distribution compares to historical pattern
                        </p>
                        <div className="h-[180px] mt-4">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={Object.keys(anomaly.dayOfWeekDistribution).map(day => ({
                                day,
                                actual: anomaly.dayOfWeekDistribution[day].actual,
                                expected: anomaly.dayOfWeekDistribution[day].expected,
                              }))}
                              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                              <XAxis dataKey="day" />
                              <YAxis />
                              <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                              <Bar name="Expected %" dataKey="expected" fill="#4ade80" opacity={0.7} />
                              <Bar name="Actual %" dataKey="actual" fill="#f43f5e" opacity={0.7} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>
          
          <TabsContent value="chart">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={anomalies.map(anomaly => ({
                    name: anomaly.campaign.length > 20 
                      ? anomaly.campaign.substring(0, 20) + '...' 
                      : anomaly.campaign,
                    actual: anomaly.actualValue,
                    expected: anomaly.mean,
                    date: anomaly.DATE,
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => {
                      if (name === "actual") return [`Actual: ${value.toLocaleString()}`, `${props.payload.date}`];
                      return [`Expected: ${value.toLocaleString()}`, `${props.payload.date}`];
                    }}
                  />
                  <Bar name="expected" dataKey="expected" fill="#4ade80" opacity={0.6} />
                  <Bar name="actual" dataKey="actual" fill="#f43f5e" opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AnomalyDetails;
