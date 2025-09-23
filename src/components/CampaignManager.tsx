import { useState, useEffect, useMemo } from "react";
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardWrapper from "@/components/DashboardWrapper";
import CampaignSparkCharts from "@/components/CampaignSparkCharts";
import RawDataTableImproved from "@/components/RawDataTableImproved";
import { NotificationsTab } from "@/components/NotificationsTab";
import CustomReportBuilder from "@/components/CustomReportBuilder";
import CampaignSummaryTable from "@/components/CampaignSummaryTable";
import { CampaignPerformanceChart } from "@/components/CampaignPerformanceChart";
import { CampaignPacingCard } from "@/components/CampaignPacingCard";
import CampaignHealthCard from "@/components/CampaignHealthCard";
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
  const [allContractData, setAllContractData] = useState<any[]>([]);
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
        const allContractTerms = await getContractTerms();
        setAllContractData(allContractTerms);
        console.log('All contract data available:', allContractTerms);
        console.log('Looking for campaign:', selectedCampaign);

        // Check different possible field names for campaign matching
        const campaignContractTerms = allContractTerms.filter(row => {
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
        </div>
      </div>
    );
  }

  // Show campaign detail view
  return (
    <div className="space-y-6">
      {/* Header with campaign info and back button */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 truncate mb-2">
            {selectedCampaign}
          </h2>
          {/* Contract info as subtitle */}
          {campaignContractData.length > 0 && (
            <div className="space-y-1">
              {campaignContractData.map((contract, index) => (
                <div key={index} className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <span>{contract['Start Date'] || 'Start: Not specified'} → {contract['End Date'] || 'End: Not specified'}</span>
                  {contract.budget && (
                    <span><strong>Budget:</strong> {formatCurrency(parseFloat(contract.budget))}</span>
                  )}
                  {(contract.cpm || contract.CPM) && (
                    <span><strong>CPM:</strong> {formatCurrency(parseFloat(contract.cpm || contract.CPM))}</span>
                  )}
                  {contract.goal && (
                    <span>Goal: {contract.goal}</span>
                  )}
                  {contract.impression_goal && (
                    <span><strong>Impression Goal:</strong> {parseFloat(contract.impression_goal).toLocaleString()}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>


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

      {/* Pacing and Health Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <CampaignPacingCard
          campaignName={selectedCampaign}
          contractTermsData={campaignContractData}
          deliveryData={filteredCampaignData}
          unfilteredData={campaignData}
          dbContractTerms={allContractData}
          pacingData={campaignPacingData}
        />

        <CampaignHealthCard
          campaignName={selectedCampaign}
          deliveryData={filteredCampaignData}
          pacingData={campaignPacingData}
          contractTermsData={campaignContractData}
          unfilteredData={campaignData}
          dbContractTerms={allContractData}
        />
      </div>

      {/* Tabbed content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
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