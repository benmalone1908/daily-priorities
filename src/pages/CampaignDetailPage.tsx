import { CampaignDataRow } from '@/types/campaign';
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DateRange } from "react-day-picker";
import DateRangePicker from "@/components/DateRangePicker";
import { setToStartOfDay, setToEndOfDay, parseDateString } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardWrapper from "@/components/DashboardWrapper";
import RawDataTableImproved from "@/components/RawDataTableImproved";
import SidebarLayout from "@/components/SidebarLayout";
import { useSupabase } from "@/contexts/use-supabase";
import { CampaignFilterProvider } from "@/contexts/CampaignFilterContext";
import { useCampaignFilter } from "@/contexts/use-campaign-filter";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const CampaignDetailPageContent = () => {
  const { campaignName } = useParams<{ campaignName: string }>();
  const decodedCampaignName = campaignName ? decodeURIComponent(campaignName) : "";

  const [data, setData] = useState<CampaignDataRow[]>([]);
  const [pacingData, setPacingData] = useState<CampaignDataRow[]>([]);
  const [contractTermsData, setContractTermsData] = useState<CampaignDataRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const { getCampaignData, getContractTerms } = useSupabase();
  const { extractAdvertiserName, extractAgencyInfo, isTestCampaign } = useCampaignFilter();
  const navigate = useNavigate();

  // Handle navigation to main dashboard with specific tab
  const handleTabChange = (tab: string) => {
    // Navigate to the main dashboard with the selected tab as a URL parameter
    navigate(`/?tab=${tab}`);
  };

  // Load data for the specific campaign
  useEffect(() => {
    const loadCampaignData = async () => {
      if (!decodedCampaignName) return;

      setIsLoading(true);
      try {
        // Load delivery data - get all data and filter client-side
        const allData = await getCampaignData();
        const campaignData = allData.filter(row => row.campaign_order_name === decodedCampaignName);

        // Convert the data format to match what the components expect
        const formattedData = campaignData.map(row => ({
          DATE: row.date,
          'CAMPAIGN ORDER NAME': row.campaign_order_name,
          IMPRESSIONS: row.impressions?.toString() || '0',
          CLICKS: row.clicks?.toString() || '0',
          REVENUE: row.revenue?.toString() || '0',
          TRANSACTIONS: row.transactions?.toString() || '0',
          SPEND: row.spend?.toString() || '0'
        }));

        setData(formattedData);

        // Load pacing data
        const { data: pacingDataResult, error: pacingError } = await supabase
          .from('pacing_data')
          .select('*')
          .eq('Campaign', decodedCampaignName);

        if (pacingError) {
          console.error('Error loading pacing data:', pacingError);
        } else {
          setPacingData(pacingDataResult || []);
        }

        // Load contract terms data
        const allContractData = await getContractTerms();
        const campaignContractData = allContractData.filter(row =>
          row.campaign_order_name === decodedCampaignName
        );

        // Convert the data format to match what the components expect
        const formattedContractData = campaignContractData.map(row => ({
          'CAMPAIGN ORDER NAME': row.campaign_order_name,
          'Start Date': row.start_date,
          'End Date': row.end_date,
          // Add other contract terms fields as needed
          ...row
        }));

        setContractTermsData(formattedContractData);

      } catch (error) {
        console.error('Error loading campaign data:', error);
        toast.error('Failed to load campaign data');
      } finally {
        setIsLoading(false);
      }
    };

    loadCampaignData();
  }, [decodedCampaignName, getCampaignData, getContractTerms]);

  // Calculate available date range for the date picker
  const availableDateRange = useMemo(() => {
    if (!data || data.length === 0) {
      return { min: undefined, max: undefined };
    }

    const dates = data
      .map(row => parseDateString(row.DATE))
      .filter(Boolean) as Date[];

    if (dates.length === 0) {
      return { min: undefined, max: undefined };
    }

    dates.sort((a, b) => a.getTime() - b.getTime());
    return {
      min: dates[0],
      max: dates[dates.length - 1]
    };
  }, [data]);

  // Set initial date range when data loads - from first data date to today
  // This ensures charts show zeros from last data date to today if there's a delivery gap
  useEffect(() => {
    if (availableDateRange.min) {
      const today = new Date();
      const newRange = {
        from: availableDateRange.min,
        to: today // Extend to today to show delivery gaps
      };
      console.log('[CampaignDetailPage] Setting dateRange to:', {
        from: newRange.from.toISOString(),
        to: newRange.to.toISOString(),
        dataMax: availableDateRange.max?.toISOString()
      });
      setDateRange(newRange);
    }
  }, [availableDateRange.min]); // Only depend on availableDateRange.min to reset when campaign changes

  // Log whenever dateRange changes
  useEffect(() => {
    console.log('[CampaignDetailPage] Current dateRange:', dateRange);
  }, [dateRange]);

  // Filter out test campaigns and process data
  const filteredData = useMemo(() => {
    let filtered = data.filter(row =>
      row &&
      row.DATE !== 'Totals' &&
      !isTestCampaign(row["CAMPAIGN ORDER NAME"] || "")
    );

    // Apply date range filter if set
    if (dateRange?.from || dateRange?.to) {
      filtered = filtered.filter(row => {
        const rowDate = parseDateString(row.DATE);
        if (!rowDate) return false;

        const startDate = dateRange.from ? setToStartOfDay(new Date(dateRange.from)) : null;
        const endDate = dateRange.to ? setToEndOfDay(new Date(dateRange.to)) : null;

        if (startDate && rowDate < startDate) return false;
        if (endDate && rowDate > endDate) return false;
        return true;
      });
    }

    return filtered;
  }, [data, isTestCampaign, dateRange]);

  // Calculate campaign summary metrics
  const campaignSummary = useMemo(() => {
    if (!filteredData.length) return null;

    const totals = filteredData.reduce((acc, row) => ({
      impressions: acc.impressions + (parseFloat(row.IMPRESSIONS) || 0),
      clicks: acc.clicks + (parseFloat(row.CLICKS) || 0),
      revenue: acc.revenue + (parseFloat(row.REVENUE) || 0),
      transactions: acc.transactions + (parseFloat(row.TRANSACTIONS) || 0),
      spend: acc.spend + (parseFloat(row.SPEND) || 0),
    }), { impressions: 0, clicks: 0, revenue: 0, transactions: 0, spend: 0 });

    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const roas = totals.spend > 0 ? totals.revenue / totals.spend : 0;

    // Date range
    const dates = filteredData
      .map(row => row.DATE)
      .filter(Boolean)
      .sort();
    const dateRange = dates.length > 1
      ? `${dates[0]} - ${dates[dates.length - 1]}`
      : dates[0] || '';

    // Agency and advertiser info
    const agencyInfo = extractAgencyInfo(decodedCampaignName);
    const advertiserName = extractAdvertiserName(decodedCampaignName);

    return {
      ...totals,
      ctr,
      roas,
      dateRange,
      rowCount: filteredData.length,
      agency: agencyInfo?.agency || 'Unknown',
      advertiser: advertiserName || 'Unknown'
    };
  }, [filteredData, decodedCampaignName, extractAgencyInfo, extractAdvertiserName]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading campaign data...</p>
        </div>
      </div>
    );
  }

  if (!campaignSummary) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Campaign Not Found</h1>
          <p className="text-muted-foreground mb-6">
            No data found for campaign: {decodedCampaignName}
          </p>
        </div>
      </div>
    );
  }

  const headerContent = (
    <div className="py-4">
      {/* Back button and campaign name */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => navigate('/?tab=campaigns')}
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Campaigns
        </button>
        <h2 className="text-xl font-semibold text-gray-900 truncate">
          {decodedCampaignName}
        </h2>
      </div>

      {/* Campaign summary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
    </div>
  );

  return (
    <SidebarLayout
      activeTab="campaigns"
      onTabChange={handleTabChange}
      pacingDataLength={pacingData.length}
      contractTermsDataLength={contractTermsData.length}
      dataLength={data.length}
      hasAllData={true}
      header={headerContent}
      className="animate-fade-in"
    >
      <div className="px-4 lg:px-6 pb-4 lg:pb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="raw-data">Raw Data</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <div className="space-y-6">
              <DashboardWrapper
                data={filteredData}
                metricsData={filteredData}
                revenueData={filteredData}
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
                useGlobalFilters={false}
                dateRange={dateRange}
              />
            </div>
          </TabsContent>



          <TabsContent value="raw-data" className="mt-6">
            <RawDataTableImproved
              data={filteredData}
              useGlobalFilters={false}
            />
          </TabsContent>
        </Tabs>
      </div>
    </SidebarLayout>
  );
};

const CampaignDetailPage = () => {
  return (
    <CampaignFilterProvider>
      <CampaignDetailPageContent />
    </CampaignFilterProvider>
  );
};

export default CampaignDetailPage;