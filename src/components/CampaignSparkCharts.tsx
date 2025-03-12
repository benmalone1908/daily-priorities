import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DateRange } from "react-day-picker";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { MultiSelect, Option } from "./MultiSelect";

interface CampaignSparkChartsProps {
  data: any[];
  dateRange?: DateRange;
}

const CampaignSparkCharts = ({ data, dateRange }: CampaignSparkChartsProps) => {
  const [selectedAdvertisers, setSelectedAdvertisers] = useState<string[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);

  const advertisers = useMemo(() => {
    if (!data || !data.length) return [];
    
    const uniqueAdvertisers = new Set<string>();
    
    data.forEach(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      const match = campaignName.match(/SM:\s+([^-]+)/);
      if (match) {
        const advertiser = match[1].trim();
        if (advertiser) {
          uniqueAdvertisers.add(advertiser);
        }
      }
    });
    
    return Array.from(uniqueAdvertisers).sort();
  }, [data]);

  const campaigns = useMemo(() => {
    if (!data || !data.length) return [];
    return Array.from(new Set(data.map(row => row["CAMPAIGN ORDER NAME"]))).filter(Boolean).sort();
  }, [data]);

  const advertiserOptions: Option[] = useMemo(() => {
    return advertisers.map(advertiser => ({
      value: advertiser,
      label: advertiser
    }));
  }, [advertisers]);

  const campaignOptions: Option[] = useMemo(() => {
    if (!selectedAdvertisers.length) {
      return campaigns.map(campaign => ({
        value: campaign,
        label: campaign
      }));
    }

    return campaigns
      .filter(campaign => {
        const match = campaign.match(/SM:\s+([^-]+)/);
        const advertiser = match ? match[1].trim() : "";
        return selectedAdvertisers.includes(advertiser);
      })
      .map(campaign => ({
        value: campaign,
        label: campaign
      }));
  }, [campaigns, selectedAdvertisers]);

  const filteredData = useMemo(() => {
    let filtered = data;

    if (selectedAdvertisers.length > 0) {
      filtered = filtered.filter(row => {
        const campaignName = row["CAMPAIGN ORDER NAME"] || "";
        const match = campaignName.match(/SM:\s+([^-]+)/);
        const advertiser = match ? match[1].trim() : "";
        return selectedAdvertisers.includes(advertiser);
      });
    }

    if (selectedCampaigns.length > 0) {
      filtered = filtered.filter(row => selectedCampaigns.includes(row["CAMPAIGN ORDER NAME"]));
    }

    return filtered;
  }, [data, selectedAdvertisers, selectedCampaigns]);

  const campaignMetrics = useMemo(() => {
    if (!filteredData.length) return [];
    
    const metrics: Record<string, any[]> = {};
    
    filteredData.forEach(row => {
      const campaign = row["CAMPAIGN ORDER NAME"];
      if (!metrics[campaign]) {
        metrics[campaign] = [];
      }
      metrics[campaign].push(row);
    });
    
    return Object.entries(metrics).map(([campaign, rows]) => {
      rows.sort((a, b) => new Date(a.DATE).getTime() - new Date(b.DATE).getTime());
      
      return {
        campaign,
        data: rows
      };
    });
  }, [filteredData]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <span className="text-sm font-medium my-auto">Filter by:</span>
        <MultiSelect
          options={advertiserOptions}
          selected={selectedAdvertisers}
          onChange={setSelectedAdvertisers}
          placeholder="Advertiser"
          className="w-[200px]"
        />
        <MultiSelect
          options={campaignOptions}
          selected={selectedCampaigns}
          onChange={setSelectedCampaigns}
          placeholder="Campaign"
          className="w-[200px]"
        />
      </div>

      <ScrollArea className="h-[500px]">
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {campaignMetrics.map((campaignMetric) => (
            <Card key={campaignMetric.campaign} className="p-4">
              <h3 className="text-sm font-medium">{campaignMetric.campaign}</h3>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={campaignMetric.data}>
                  <Line
                    type="monotone"
                    dataKey="REVENUE"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={false}
                  />
                  <XAxis
                    dataKey="DATE"
                    style={{ fontSize: "0.6rem" }}
                    tickFormatter={(date) => {
                      try {
                        return new Date(date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        });
                      } catch (error) {
                        console.error("Error formatting date:", error);
                        return "Invalid Date";
                      }
                    }}
                  />
                  <YAxis style={{ fontSize: "0.6rem" }} />
                  <Tooltip
                    formatter={(value: number) =>
                      new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(value)
                    }
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default CampaignSparkCharts;
