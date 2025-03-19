import React, { useState, useMemo } from "react";
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface CampaignSparkChartsProps {
  data: any[];
  dateRange: DateRange | undefined;
}

interface DataPoint {
  date: string;
  value: number;
}

const CampaignSparkCharts = ({ data, dateRange }: CampaignSparkChartsProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"campaign" | "advertiser">("campaign");

  const filteredData = useMemo(() => {
    if (!dateRange?.from) return data;

    return data.filter((row) => {
      const rowDate = new Date(row.DATE);
      if (isNaN(rowDate.getTime())) return false;

      if (dateRange.from && !dateRange.to) {
        const fromDate = new Date(dateRange.from);
        return rowDate >= fromDate;
      }

      if (dateRange.from && dateRange.to) {
        const fromDate = new Date(dateRange.from);
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        return rowDate >= fromDate && rowDate <= toDate;
      }

      return true;
    });
  }, [data, dateRange]);

  const getUniqueCampaigns = (data: any[]) => {
    return [...new Set(data.map((item) => item["CAMPAIGN ORDER NAME"]))];
  };

  const campaigns = useMemo(() => getUniqueCampaigns(filteredData), [filteredData]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) =>
      campaign.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [campaigns, searchTerm]);

  // Function to determine unique advertisers from campaign names
  const getAdvertiserFromCampaign = (campaign: string) => {
    const match = campaign.match(/SM:\s+([^-]+)/);
    return match ? match[1].trim() : "Unknown";
  };

  // Group data by advertiser when in advertiser view mode
  const advertiserData = useMemo(() => {
    if (viewMode !== "advertiser") return [];

    const groupedByAdvertiser = filteredCampaigns.reduce((acc, campaign) => {
      const advertiser = getAdvertiserFromCampaign(campaign);
      if (!acc[advertiser]) {
        acc[advertiser] = [];
      }
      
      // Add any rows with this campaign to the advertiser group
      data.forEach(row => {
        if (row["CAMPAIGN ORDER NAME"] === campaign) {
          acc[advertiser].push(row);
        }
      });
      
      return acc;
    }, {} as Record<string, any[]>);

    return Object.entries(groupedByAdvertiser).map(([advertiser, rows]) => ({
      name: advertiser,
      data: rows
    }));
  }, [data, filteredCampaigns, viewMode]);

  // Choose which data to display based on viewMode
  const displayData = viewMode === "campaign" 
    ? filteredCampaigns.map(campaign => ({
        name: campaign,
        data: data.filter(row => row["CAMPAIGN ORDER NAME"] === campaign)
      }))
    : advertiserData;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "campaign" | "advertiser")}>
            <ToggleGroupItem value="campaign">By Campaign</ToggleGroupItem>
            <ToggleGroupItem value="advertiser">By Advertiser</ToggleGroupItem>
          </ToggleGroup>
        </div>
        
        <div className="w-full md:w-auto">
          <input
            type="text"
            placeholder="Search campaigns..."
            className="w-full md:w-64 px-3 py-2 border rounded-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {dateRange?.from && (
        <p className="text-sm text-muted-foreground">
          Showing data from {format(dateRange.from, "PP")} to{" "}
          {dateRange.to ? format(dateRange.to, "PP") : format(dateRange.from, "PP")}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayData.map(({ name, data: campaignData }) => (
          <Card key={name}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex justify-between items-center">
                <span className="truncate" title={name}>{name}</span>
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={60}>
                <AreaChart
                  data={campaignData.map((item) => ({
                    date: item.DATE,
                    value: item.REVENUE,
                  }))}
                  margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                >
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Tooltip
                    formatter={(value: number) => new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(value)}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#8884d8"
                    fill="#8884d8"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CampaignSparkCharts;
