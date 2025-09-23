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
import { processCampaigns } from "@/lib/pacingCalculations";
import { calculateCampaignHealth } from "@/utils/campaignHealthScoring";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [pacingModalOpen, setPacingModalOpen] = useState(false);
  const [healthModalOpen, setHealthModalOpen] = useState(false);

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

  // Calculate pacing information using the same logic as CampaignPacingCard
  const pacingInfo = useMemo(() => {
    if (!selectedCampaign) {
      return { percentage: 0, status: 'No data' };
    }

    try {
      // Use the exact same logic as CampaignPacingCard
      let contractTerms: any[] = [];

      if (allContractData.length > 0) {
        // Convert database contract terms to the expected format (same as CampaignPacingCard)
        contractTerms = allContractData.map((row: any) => ({
          Name: row.campaign_name,
          'Start Date': row.start_date,
          'End Date': row.end_date,
          Budget: row.budget.toString(),
          CPM: row.cpm.toString(),
          'Impressions Goal': row.impressions_goal.toString()
        }));
      } else if (campaignContractData.length > 0) {
        // Fallback to uploaded contract terms data (same as CampaignPacingCard)
        contractTerms = campaignContractData.map((row: any) => ({
          Name: row.Name || row['Campaign Name'] || row.CAMPAIGN_ORDER_NAME || row['CAMPAIGN ORDER NAME'] || '',
          'Start Date': row['Start Date'] || row.START_DATE || '',
          'End Date': row['End Date'] || row.END_DATE || '',
          Budget: row.Budget || row.BUDGET || '',
          CPM: row.CPM || row.cpm || '',
          'Impressions Goal': row['Impressions Goal'] || row.IMPRESSIONS_GOAL || row['GOAL IMPRESSIONS'] || ''
        }));
      } else {
        // Derive contract terms from campaign data like the card does
        const campaignRows = filteredCampaignData.filter(row => row['CAMPAIGN ORDER NAME'] === selectedCampaign);

        if (campaignRows.length === 0) {
          return { percentage: 0, status: 'No data' };
        }

        const dates = campaignRows
          .map(row => parseDateString(row.DATE))
          .filter(Boolean) as Date[];
        dates.sort((a, b) => a.getTime() - b.getTime());
        const startDate = dates[0];
        const endDate = dates[dates.length - 1];

        const totalImpressions = campaignRows.reduce((sum, row) => sum + (parseInt(row.IMPRESSIONS?.toString().replace(/,/g, '') || '0') || 0), 0);
        const totalSpend = campaignRows.reduce((sum, row) => sum + (parseFloat(row.SPEND?.toString().replace(/[$,]/g, '') || '0') || 0), 0);
        const estimatedCPM = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;

        contractTerms = [{
          Name: selectedCampaign,
          'Start Date': startDate ? startDate.toISOString().split('T')[0] : '',
          'End Date': endDate ? endDate.toISOString().split('T')[0] : '',
          Budget: totalSpend.toString(),
          CPM: estimatedCPM.toFixed(2),
          'Impressions Goal': Math.round(totalImpressions * 1.1).toString()
        }];
      }

      // Transform delivery data to the expected format
      const formattedDeliveryData = filteredCampaignData.map((row: any) => ({
        DATE: row.DATE || '',
        'CAMPAIGN ORDER NAME': row['CAMPAIGN ORDER NAME'] || '',
        IMPRESSIONS: row.IMPRESSIONS?.toString() || '0',
        SPEND: row.SPEND?.toString() || '0'
      }));

      const unfilteredDeliveryData = campaignData.map((row: any) => ({
        DATE: row.DATE || '',
        'CAMPAIGN ORDER NAME': row['CAMPAIGN ORDER NAME'] || '',
        IMPRESSIONS: row.IMPRESSIONS?.toString() || '0',
        SPEND: row.SPEND?.toString() || '0'
      }));

      const processedCampaigns = processCampaigns(contractTerms, formattedDeliveryData, unfilteredDeliveryData);
      const campaign = processedCampaigns.find(c => c.name === selectedCampaign);

      if (campaign && campaign.metrics) {
        const percentage = parseFloat((campaign.metrics.currentPacing * 100).toFixed(1));
        return {
          percentage,
          status: percentage >= 95 && percentage <= 105 ? 'On Target' :
                  (percentage >= 85 && percentage < 95) || (percentage > 105 && percentage <= 115) ? 'Minor Deviation' :
                  (percentage >= 70 && percentage < 85) || (percentage > 115 && percentage <= 130) ? 'Moderate Deviation' : 'Major Deviation'
        };
      }
    } catch (error) {
      console.error('Error calculating pacing:', error);
    }

    return { percentage: 0, status: 'No data' };
  }, [selectedCampaign, allContractData, campaignContractData, filteredCampaignData, campaignData]);

  // Calculate health status
  const healthInfo = useMemo(() => {
    if (!selectedCampaign || !filteredCampaignData.length) {
      return { status: 'Unknown', level: 'warning' };
    }

    try {
      // Get real pacing metrics using the same logic as CampaignHealthCard
      let realPacingMetrics = null;

      try {
        // Use the same contract terms processing logic as the CampaignHealthCard
        let contractTerms: any[] = [];

        if (allContractData.length > 0) {
          // Convert database contract terms to the expected format
          contractTerms = allContractData.map((row: any) => ({
            Name: row.campaign_name,
            'Start Date': row.start_date,
            'End Date': row.end_date,
            Budget: row.budget.toString(),
            CPM: row.cpm.toString(),
            'Impressions Goal': row.impressions_goal.toString()
          }));
        } else if (campaignContractData.length > 0) {
          // Fallback to uploaded contract terms data
          contractTerms = campaignContractData.map((row: any) => ({
            Name: row.Name || row['Campaign Name'] || row.CAMPAIGN_ORDER_NAME || row['CAMPAIGN ORDER NAME'] || '',
            'Start Date': row['Start Date'] || row.START_DATE || '',
            'End Date': row['End Date'] || row.END_DATE || '',
            Budget: row.Budget || row.BUDGET || '',
            CPM: row.CPM || row.cpm || '',
            'Impressions Goal': row['Impressions Goal'] || row.IMPRESSIONS_GOAL || row['GOAL IMPRESSIONS'] || ''
          }));
        }

        if (contractTerms.length > 0) {
          // Transform delivery data to the expected format
          const formattedDeliveryData = filteredCampaignData.map((row: any) => ({
            DATE: row.DATE || '',
            'CAMPAIGN ORDER NAME': row['CAMPAIGN ORDER NAME'] || '',
            IMPRESSIONS: row.IMPRESSIONS?.toString() || '0',
            SPEND: row.SPEND?.toString() || '0'
          }));

          // Transform unfiltered data for global date calculation
          const unfilteredDeliveryData = campaignData.map((row: any) => ({
            DATE: row.DATE || '',
            'CAMPAIGN ORDER NAME': row['CAMPAIGN ORDER NAME'] || '',
            IMPRESSIONS: row.IMPRESSIONS?.toString() || '0',
            SPEND: row.SPEND?.toString() || '0'
          }));

          // Use processCampaigns to get the processed campaign data
          const processedCampaigns = processCampaigns(contractTerms, formattedDeliveryData, unfilteredDeliveryData);

          // Find the specific campaign we're looking for
          const campaign = processedCampaigns.find(c => c.name === selectedCampaign);
          if (campaign) {
            realPacingMetrics = campaign.metrics;
          }
        }
      } catch (error) {
        console.error('Error calculating real pacing metrics for health:', error);
      }

      const healthData = calculateCampaignHealth(
        filteredCampaignData,
        selectedCampaign,
        campaignPacingData,
        campaignContractData,
        realPacingMetrics
      );

      if (!healthData || healthData.healthScore === 0) {
        return { status: 'Unknown', level: 'warning' };
      }

      // Convert health score to status level (same logic as CampaignHealthCard)
      const score = healthData.healthScore;
      const level = score >= 7 ? 'healthy' : score >= 4 ? 'warning' : 'critical';
      const status = level === 'healthy' ? 'Healthy' : level === 'warning' ? 'Warning' : 'Critical';

      return { status, level };
    } catch (error) {
      console.error('Error calculating health:', error);
      return { status: 'Unknown', level: 'warning' };
    }
  }, [selectedCampaign, allContractData, campaignContractData, filteredCampaignData, campaignData, campaignPacingData]);

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
      <div className="grid grid-cols-12 gap-4 mb-4">
        {/* Left side - Campaign name */}
        <div className="col-span-7">
          <h2 className="text-2xl font-bold text-gray-900 truncate">
            {selectedCampaign}
          </h2>

          {/* Pacing and Health Status */}
          <div className="flex items-center gap-4 mt-2">
            {/* Pacing Percentage */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Pacing:</span>
              <button
                className={`px-2 py-1 text-sm rounded hover:opacity-80 transition-colors ${
                  pacingInfo.percentage >= 95 && pacingInfo.percentage <= 105
                    ? 'bg-green-100 text-green-800'
                    : pacingInfo.percentage < 85 || pacingInfo.percentage > 115
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
                onClick={() => setPacingModalOpen(true)}
              >
                {pacingInfo.percentage > 0 ? `${pacingInfo.percentage}%` : 'No data'}
              </button>
            </div>

            {/* Health Status */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Health:</span>
              <button
                className={`px-2 py-1 text-sm rounded hover:opacity-80 transition-colors ${
                  healthInfo.level === 'healthy'
                    ? 'bg-green-100 text-green-800'
                    : healthInfo.level === 'warning'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}
                onClick={() => setHealthModalOpen(true)}
              >
                {healthInfo.status}
              </button>
            </div>
          </div>
        </div>

        {/* Right side - Flight dates and contract details */}
        <div className="col-span-5 flex justify-end">
          <div className="bg-gray-50 p-4 rounded-lg -mt-3 w-auto text-right">
            {/* Flight dates */}
            <div className="mb-1">
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">Flight Dates:</span> {campaignSummary.dateRange}
              </div>
            </div>

            {/* Contract info */}
            {campaignContractData.length > 0 && (
              <div>
                {campaignContractData.map((contract, index) => (
                  <div key={index} className="text-sm text-gray-600">
                    {/* Budget, CPM, and Impression Goal in one row */}
                    <div className="flex flex-wrap items-center justify-end gap-4 mb-1">
                      {contract.budget && (
                        <span><strong>Budget:</strong> {formatCurrency(parseFloat(contract.budget))}</span>
                      )}
                      {(contract.cpm || contract.CPM) && (
                        <span><strong>CPM:</strong> {formatCurrency(parseFloat(contract.cpm || contract.CPM))}</span>
                      )}
                      {contract.impression_goal && (
                        <span><strong>Impression Goal:</strong> {parseFloat(contract.impression_goal).toLocaleString()}</span>
                      )}
                    </div>
                    {/* Goal on separate line if it exists */}
                    {contract.goal && (
                      <div><strong>Goal:</strong> {contract.goal}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{formatNumber(campaignSummary.transactions)}</div>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">ROAS</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{campaignSummary.roas.toFixed(2)}x</div>
          </CardContent>
        </Card>
      </div>


      {/* Tabbed content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
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

        <TabsContent value="raw-data" className="mt-6">
          <RawDataTableImproved
            data={filteredCampaignData}
            useGlobalFilters={false}
          />
        </TabsContent>
      </Tabs>

      {/* Pacing Modal */}
      <Dialog open={pacingModalOpen} onOpenChange={setPacingModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Campaign Pacing Details</DialogTitle>
          </DialogHeader>
          {selectedCampaign && (
            <CampaignPacingCard
              campaignName={selectedCampaign}
              contractTermsData={campaignContractData}
              deliveryData={filteredCampaignData}
              unfilteredData={campaignData}
              dbContractTerms={allContractData}
              pacingData={campaignPacingData}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Health Modal */}
      <Dialog open={healthModalOpen} onOpenChange={setHealthModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Campaign Health Details</DialogTitle>
          </DialogHeader>
          {selectedCampaign && (
            <CampaignHealthCard
              campaignName={selectedCampaign}
              deliveryData={filteredCampaignData}
              pacingData={campaignPacingData}
              contractTermsData={campaignContractData}
              unfilteredData={campaignData}
              dbContractTerms={allContractData}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignManager;