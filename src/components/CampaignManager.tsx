import { useState, useEffect, useMemo } from "react";
import { DateRange } from "react-day-picker";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardWrapper from "@/components/DashboardWrapper";
import CampaignSparkCharts from "@/components/CampaignSparkCharts";
import RawDataTableImproved from "@/components/RawDataTableImproved";
import CampaignHealthTab from "@/components/CampaignHealthTab";
import { Pacing } from "@/components/Pacing";
import StatusTab from "@/components/StatusTab";
import { NotificationsTab } from "@/components/NotificationsTab";
import CustomReportBuilder from "@/components/CustomReportBuilder";
import CampaignSummaryTable from "@/components/CampaignSummaryTable";
import { useSupabase } from "@/contexts/SupabaseContext";
import { useCampaignFilter } from "@/contexts/CampaignFilterContext";
import { setToStartOfDay, setToEndOfDay, parseDateString } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface CampaignManagerProps {
  data: any[];
  pacingData: any[];
  contractTermsData: any[];
  useGlobalFilters?: boolean;
  globalDateRange?: DateRange | undefined;
  onCampaignDetailViewChange?: (isInDetailView: boolean) => void;
}

const CampaignManager = ({
  data,
  pacingData,
  contractTermsData,
  useGlobalFilters = false,
  globalDateRange,
  onCampaignDetailViewChange
}: CampaignManagerProps) => {
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [campaignData, setCampaignData] = useState<any[]>([]);
  const [campaignPacingData, setCampaignPacingData] = useState<any[]>([]);
  const [campaignContractData, setCampaignContractData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  const { getCampaignData, getContractTerms } = useSupabase();
  const { extractAdvertiserName, extractAgencyInfo, isTestCampaign } = useCampaignFilter();

  // Notify parent when detail view state changes
  useEffect(() => {
    onCampaignDetailViewChange?.(!!selectedCampaign);
  }, [selectedCampaign, onCampaignDetailViewChange]);

  // Load campaign-specific data when a campaign is selected
  useEffect(() => {
    const loadCampaignData = async () => {
      if (!selectedCampaign) return;

      setIsLoading(true);
      try {
        // Load delivery data
        const allData = await getCampaignData();
        const campaignDeliveryData = allData.filter(row => row.campaign_order_name === selectedCampaign);

        // Convert the data format to match what the components expect
        const formattedData = campaignDeliveryData.map(row => ({
          DATE: row.date,
          'CAMPAIGN ORDER NAME': row.campaign_order_name,
          IMPRESSIONS: row.impressions?.toString() || '0',
          CLICKS: row.clicks?.toString() || '0',
          REVENUE: row.revenue?.toString() || '0',
          TRANSACTIONS: row.transactions?.toString() || '0',
          SPEND: row.spend?.toString() || '0'
        }));

        setCampaignData(formattedData);

        // Load contract terms data
        const allContractData = await getContractTerms();
        console.log('All contract data available:', allContractData);
        console.log('Looking for campaign:', selectedCampaign);

        // Check different possible field names for campaign matching
        const campaignContractTerms = allContractData.filter(row => {
          const matches = [
            row.campaign_order_name === selectedCampaign,
            row['CAMPAIGN ORDER NAME'] === selectedCampaign,
            row.campaign_name === selectedCampaign,
            row.Campaign === selectedCampaign
          ];
          console.log('Checking row:', row, 'matches:', matches);
          return matches.some(Boolean);
        });

        console.log('Filtered contract terms:', campaignContractTerms);

        // Convert the data format to match what the components expect
        const formattedContractData = campaignContractTerms.map(row => ({
          'CAMPAIGN ORDER NAME': row.campaign_order_name || row['CAMPAIGN ORDER NAME'] || row.campaign_name || row.Campaign,
          'Start Date': row.start_date || row['Start Date'],
          'End Date': row.end_date || row['End Date'],
          budget: row.budget || row.Budget,
          goal: row.goal || row.Goal,
          cpm: row.cpm || row.CPM || row.Cpm,
          impression_goal: row.impression_goal || row['Impression Goal'] || row.impressions_goal,
          ...row
        }));

        setCampaignContractData(formattedContractData);
        console.log('Contract data loaded for campaign:', selectedCampaign, formattedContractData);

        // Load pacing data (skip if table doesn't exist)
        try {
          const { data: pacingDataResult, error: pacingError } = await supabase
            .from('pacing_data')
            .select('*')
            .eq('Campaign', selectedCampaign);

          if (pacingError) {
            console.log('Pacing data table not available:', pacingError.message);
            setCampaignPacingData([]);
          } else {
            setCampaignPacingData(pacingDataResult || []);
          }
        } catch (error) {
          console.log('Pacing data not available');
          setCampaignPacingData([]);
        }

      } catch (error) {
        console.error('Error loading campaign data:', error);
        toast.error('Failed to load campaign data');
      } finally {
        setIsLoading(false);
      }
    };

    loadCampaignData();
  }, [selectedCampaign, getCampaignData, getContractTerms]);


  // Filter campaign data based on date range and test campaigns
  const filteredCampaignData = useMemo(() => {
    let filtered = campaignData.filter(row =>
      row &&
      row.DATE !== 'Totals' &&
      !isTestCampaign(row["CAMPAIGN ORDER NAME"] || "")
    );

    // Apply global date range filter if set
    if (globalDateRange?.from || globalDateRange?.to) {
      filtered = filtered.filter(row => {
        const rowDate = parseDateString(row.DATE);
        if (!rowDate) return false;

        const startDate = globalDateRange.from ? setToStartOfDay(new Date(globalDateRange.from)) : null;
        const endDate = globalDateRange.to ? setToEndOfDay(new Date(globalDateRange.to)) : null;

        if (startDate && rowDate < startDate) return false;
        if (endDate && rowDate > endDate) return false;
        return true;
      });
    }

    return filtered;
  }, [campaignData, isTestCampaign, globalDateRange]);

  // Calculate campaign summary metrics
  const campaignSummary = useMemo(() => {
    if (!filteredCampaignData.length) return null;

    const totals = filteredCampaignData.reduce((acc, row) => ({
      impressions: acc.impressions + (parseFloat(row.IMPRESSIONS) || 0),
      clicks: acc.clicks + (parseFloat(row.CLICKS) || 0),
      revenue: acc.revenue + (parseFloat(row.REVENUE) || 0),
      transactions: acc.transactions + (parseFloat(row.TRANSACTIONS) || 0),
      spend: acc.spend + (parseFloat(row.SPEND) || 0),
    }), { impressions: 0, clicks: 0, revenue: 0, transactions: 0, spend: 0 });

    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const roas = totals.spend > 0 ? totals.revenue / totals.spend : 0;

    // Date range
    const dates = filteredCampaignData
      .map(row => row.DATE)
      .filter(Boolean)
      .sort();
    const dateRangeStr = dates.length > 1
      ? `${dates[0]} - ${dates[dates.length - 1]}`
      : dates[0] || '';

    // Agency and advertiser info
    const agencyInfo = extractAgencyInfo(selectedCampaign || '');
    const advertiserName = extractAdvertiserName(selectedCampaign || '');

    return {
      ...totals,
      ctr,
      roas,
      dateRange: dateRangeStr,
      rowCount: filteredCampaignData.length,
      agency: agencyInfo?.agency || 'Unknown',
      advertiser: advertiserName || 'Unknown'
    };
  }, [filteredCampaignData, selectedCampaign, extractAgencyInfo, extractAdvertiserName]);

  // Format numbers
  const formatNumber = (value: number) => {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    return value.toFixed(0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Handle campaign selection
  const handleCampaignSelect = (campaignName: string) => {
    setSelectedCampaign(campaignName);
    setActiveTab("dashboard");
  };

  // Handle back to campaign list
  const handleBackToCampaigns = () => {
    setSelectedCampaign(null);
    setCampaignData([]);
    setCampaignPacingData([]);
    setCampaignContractData([]);
  };

  // Show campaign list
  if (!selectedCampaign) {
    return (
      <CampaignSummaryTable
        data={data}
        useGlobalFilters={useGlobalFilters}
        onCampaignSelect={handleCampaignSelect}
      />
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading campaign data...</p>
        </div>
      </div>
    );
  }

  // Show campaign not found
  if (!campaignSummary) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Campaign Not Found</h2>
          <p className="text-muted-foreground mb-6">
            No data found for campaign: {selectedCampaign}
          </p>
          <Button onClick={handleBackToCampaigns}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Campaigns
          </Button>
        </div>
      </div>
    );
  }

  // Show campaign detail view
  return (
    <div className="space-y-6">
      {/* Header with campaign info and back button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 truncate">
            {selectedCampaign}
          </h2>
          <div className="flex items-center gap-4 mt-2">
            <Badge variant="secondary">
              {campaignSummary.agency}
            </Badge>
            <Badge variant="outline">
              {campaignSummary.advertiser}
            </Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleBackToCampaigns}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Campaigns
        </Button>
      </div>

      {/* Contract Terms Section */}
      {campaignContractData.length > 0 && (
        <div className="mb-6">
          {campaignContractData.map((contract, index) => (
            <Card key={index} className="mb-4">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Start Date</span>
                    <div className="text-sm font-medium">{contract['Start Date'] || 'Not specified'}</div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">End Date</span>
                    <div className="text-sm font-medium">{contract['End Date'] || 'Not specified'}</div>
                  </div>
                  {contract.budget && (
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">Budget</span>
                      <div className="text-sm font-medium">{formatCurrency(parseFloat(contract.budget))}</div>
                    </div>
                  )}
                  {(contract.cpm || contract.CPM) && (
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">CPM</span>
                      <div className="text-sm font-medium">{formatCurrency(parseFloat(contract.cpm || contract.CPM))}</div>
                    </div>
                  )}
                  {contract.goal && (
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">Goal</span>
                      <div className="text-sm font-medium">{contract.goal}</div>
                    </div>
                  )}
                  {contract.impression_goal && (
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">Impression Goal</span>
                      <div className="text-sm font-medium">{parseFloat(contract.impression_goal).toLocaleString()}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Campaign summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Impressions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{formatNumber(campaignSummary.impressions)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clicks</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{formatNumber(campaignSummary.clicks)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">CTR</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{campaignSummary.ctr.toFixed(2)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{formatCurrency(campaignSummary.revenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{formatNumber(campaignSummary.transactions)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ROAS</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{campaignSummary.roas.toFixed(2)}x</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          {(campaignPacingData.length > 0 || campaignContractData.length > 0) && (
            <TabsTrigger value="health">Health</TabsTrigger>
          )}
          <TabsTrigger value="pacing">Pacing</TabsTrigger>
          {campaignContractData.length > 0 && (
            <TabsTrigger value="status">Status</TabsTrigger>
          )}
          <TabsTrigger value="raw-data">Raw Data</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <div className="space-y-6">
            <DashboardWrapper
              data={filteredCampaignData}
              metricsData={filteredCampaignData}
              revenueData={filteredCampaignData}
              selectedMetricsCampaigns={[]}
              selectedRevenueCampaigns={[]}
              selectedRevenueAdvertisers={[]}
              selectedRevenueAgencies={[]}
              onMetricsCampaignsChange={() => {}}
              onRevenueCampaignsChange={() => {}}
              onRevenueAdvertisersChange={() => {}}
              onRevenueAgenciesChange={() => {}}
              selectedWeeklyCampaigns={[]}
              onWeeklyCampaignsChange={() => {}}
              selectedMetricsAdvertisers={[]}
              selectedMetricsAgencies={[]}
              onMetricsAdvertisersChange={() => {}}
              onMetricsAgenciesChange={() => {}}
              useGlobalFilters={true}
            />
          </div>
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <CampaignSparkCharts
            data={filteredCampaignData}
            useGlobalFilters={false}
          />
        </TabsContent>

        {(campaignPacingData.length > 0 || campaignContractData.length > 0) && (
          <TabsContent value="health" className="mt-6">
            <CampaignHealthTab
              data={filteredCampaignData}
              pacingData={campaignPacingData}
              contractTermsData={campaignContractData}
            />
          </TabsContent>
        )}

        <TabsContent value="pacing" className="mt-6">
          <Pacing
            data={filteredCampaignData}
            unfilteredData={filteredCampaignData}
            pacingData={campaignPacingData}
            contractTermsData={campaignContractData}
          />
        </TabsContent>

        {campaignContractData.length > 0 && (
          <TabsContent value="status" className="mt-6">
            <StatusTab
              contractTermsData={campaignContractData}
              deliveryData={filteredCampaignData}
              globalMostRecentDate={
                filteredCampaignData.length > 0
                  ? new Date(Math.max(...filteredCampaignData.map(row => parseDateString(row.DATE)?.getTime() || 0).filter(Boolean)))
                  : new Date()
              }
            />
          </TabsContent>
        )}

        <TabsContent value="raw-data" className="mt-6">
          <RawDataTableImproved
            data={filteredCampaignData}
            useGlobalFilters={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CampaignManager;