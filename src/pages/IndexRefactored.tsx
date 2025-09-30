import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, ChartLine, FileText, Target, Activity, Bell, Trash2 } from "lucide-react";

// Refactored components and hooks
import { CampaignDataRow } from "@/types/campaign";
import { useCampaignData } from "@/hooks/useCampaignData";
import { useModalState } from "@/hooks/useModalState";
import { AggregatedSparkCharts } from "@/components/charts/AggregatedSparkCharts";

// Existing components (to be refactored later)
import FileUpload from "@/components/FileUpload";
import DateRangePicker from "@/components/DateRangePicker";
import CampaignSparkCharts from "@/components/CampaignSparkCharts";
import DashboardWrapper from "@/components/DashboardWrapper";
import { CampaignFilterProvider } from "@/contexts/CampaignFilterContext";
import { useSupabase } from "@/contexts/SupabaseContext";
import { CampaignStatusToggle } from "@/components/CampaignStatusToggle";
import { ChartToggle } from "@/components/ChartToggle";
import GlobalFilters from "@/components/GlobalFilters";
import RawDataTableImproved from "@/components/RawDataTableImproved";
import PacingFileUpload from "@/components/PacingFileUpload";
import CampaignHealthTab from "@/components/CampaignHealthTab";
import { PacingRefactored as Pacing } from "@/components/PacingRefactored";
import CustomReportBuilder from "@/components/CustomReportBuilderRefactored";
import StatusTab from "@/components/StatusTab";
import { ClearDatabaseDialog } from "@/components/ClearDatabaseDialog";
import { NotificationsTab } from "@/components/NotificationsTab";
import SidebarLayout from "@/components/SidebarLayout";
import UnifiedUploadModal from "@/components/UnifiedUploadModal";
import CampaignManager from "@/components/CampaignManager";

// Utilities
import { setToStartOfDay, setToEndOfDay, parseDateString } from "@/lib/utils";

/**
 * Refactored Index component - significantly reduced from 1,699 lines
 * Uses extracted hooks and components for better maintainability
 */
const IndexRefactored = () => {
  const { upsertCampaignData, getCampaignData, loadAllDataInBackground, getContractTerms } = useSupabase();

  // State management
  const [data, setData] = useState<CampaignDataRow[]>([]);
  const [pacingData, setPacingData] = useState<any[]>([]);
  const [contractTermsData, setContractTermsData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [showDashboard, setShowDashboard] = useState(false);
  const [isLoadingFromSupabase, setIsLoadingFromSupabase] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState<string>('');
  const [isLoadingAllData, setIsLoadingAllData] = useState(false);
  const [hasAllData, setHasAllData] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showUnifiedUpload, setShowUnifiedUpload] = useState(false);

  // Use our new hooks for data processing
  const { timeSeriesData, totals, trends, isLoading } = useCampaignData({ data });
  const modalState = useModalState();

  // Transform data format for compatibility with existing components
  const transformDataFormat = (supabaseData: any[]): CampaignDataRow[] => {
    return supabaseData.map(row => ({
      DATE: row.date,
      'CAMPAIGN ORDER NAME': row.campaign_name,
      IMPRESSIONS: Number(row.impressions) || 0,
      CLICKS: Number(row.clicks) || 0,
      REVENUE: Number(row.revenue) || 0,
      SPEND: Number(row.spend) || 0,
      TRANSACTIONS: Number(row.transactions) || 0
    }));
  };

  // Load all data at startup
  useEffect(() => {
    const loadAllDataFromSupabase = async () => {
      try {
        setLoadingProgress('Loading all campaign data...');
        const campaignData = await getCampaignData(undefined, undefined, setLoadingProgress, false);

        if (campaignData.length > 0) {
          setLoadingProgress('Processing all data...');
          const transformedData = transformDataFormat(campaignData);

          setData(transformedData);
          setDateRange(undefined);
          setShowDashboard(true);
          setHasAllData(true);
          console.log(`✅ All data loaded: ${transformedData.length} total rows loaded`);
        }

        // Load contract terms from Supabase
        setLoadingProgress('Loading contract terms...');
        try {
          const contractTerms = await getContractTerms();
          if (contractTerms.length > 0) {
            const transformedContractTerms = contractTerms.map(term => {
              const formatDbDate = (dateString: string) => {
                const date = new Date(dateString);
                const month = date.getMonth() + 1;
                const day = date.getDate();
                const year = date.getFullYear();
                return `${month}/${day}/${year}`;
              };

              return {
                'Campaign': term.campaign_name || '',
                'Start Date': term.start_date ? formatDbDate(term.start_date) : '',
                'End Date': term.end_date ? formatDbDate(term.end_date) : '',
                'Budget': term.total_budget || 0,
                'Deal ID': term.deal_id || '',
                'IO/Deal Name': term.io_name || '',
                'Flight Dates': term.flight_dates || '',
                'Guaranteed Impressions': term.guaranteed_impressions || 0,
                'Price': term.price || 0,
                'Revenue Share': term.revenue_share || 0,
                'Tracking': term.tracking_pixels || ''
              };
            });
            setContractTermsData(transformedContractTerms);
            console.log('✅ Contract terms loaded:', transformedContractTerms.length, 'records');
          }
        } catch (contractError) {
          console.log('Contract terms not available:', contractError);
        }

      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load data from database');
      } finally {
        setIsLoadingFromSupabase(false);
        setLoadingProgress('');
      }
    };

    loadAllDataFromSupabase();
  }, [getCampaignData, getContractTerms]);

  // Handle file upload
  const handleFileUpload = async (uploadedData: CampaignDataRow[], filename: string) => {
    try {
      console.log('📁 File uploaded:', filename, uploadedData.length, 'rows');

      // Process and save to Supabase
      const processedData = uploadedData.map(row => ({
        date: row.DATE,
        campaign_name: row['CAMPAIGN ORDER NAME'],
        impressions: row.IMPRESSIONS,
        clicks: row.CLICKS,
        revenue: row.REVENUE,
        spend: row.SPEND,
        transactions: row.TRANSACTIONS || 0
      }));

      await upsertCampaignData(processedData);

      setData(uploadedData);
      setShowDashboard(true);
      toast.success(`Successfully uploaded ${uploadedData.length} rows from ${filename}`);
    } catch (error) {
      console.error('Error processing upload:', error);
      toast.error('Failed to process uploaded file');
    }
  };

  // Handle pacing file upload
  const handlePacingFileUpload = (uploadedData: any[]) => {
    setPacingData(uploadedData);
    toast.success(`Pacing data uploaded: ${uploadedData.length} campaigns`);
  };

  // Filtered data for dashboard
  const filteredData = useMemo(() => {
    if (!dateRange?.from && !dateRange?.to) return data;

    return data.filter(row => {
      const rowDate = parseDateString(row.DATE);
      if (!rowDate) return false;

      const startDate = dateRange.from ? setToStartOfDay(new Date(dateRange.from)) : null;
      const endDate = dateRange.to ? setToEndOfDay(new Date(dateRange.to)) : null;

      if (startDate && rowDate < startDate) return false;
      if (endDate && rowDate > endDate) return false;

      return true;
    });
  }, [data, dateRange]);

  // Loading state
  if (isLoadingFromSupabase) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">{loadingProgress || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <CampaignFilterProvider>
      <div className="container mx-auto p-4">
        <SidebarLayout>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Campaign Trends Monitor</h1>
              <p className="text-sm text-gray-600">Analyze campaign performance and track pacing metrics</p>
            </div>

            <div className="flex items-center gap-2">
              <CampaignStatusToggle />
              <ChartToggle />
            </div>
          </div>

          {/* File Upload Section */}
          {!showDashboard && (
            <div className="mb-8">
              <FileUpload onFileUpload={handleFileUpload} />
            </div>
          )}

          {/* Dashboard */}
          {showDashboard && (
            <>
              {/* Date Range Picker */}
              <div className="mb-6">
                <DateRangePicker
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                />
              </div>

              {/* Global Filters */}
              <div className="mb-6">
                <GlobalFilters unfilteredData={data} />
              </div>

              {/* Main Tabs */}
              <Tabs defaultValue="dashboard" className="space-y-6">
                <TabsList className="grid w-full grid-cols-8">
                  <TabsTrigger value="dashboard" className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </TabsTrigger>
                  <TabsTrigger value="trends" className="flex items-center gap-2">
                    <ChartLine className="h-4 w-4" />
                    Trends
                  </TabsTrigger>
                  <TabsTrigger value="pacing" className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Pacing
                  </TabsTrigger>
                  <TabsTrigger value="health" className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Health
                  </TabsTrigger>
                  <TabsTrigger value="status" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Status
                  </TabsTrigger>
                  <TabsTrigger value="notifications" className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Alerts
                  </TabsTrigger>
                  <TabsTrigger value="data" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Raw Data
                  </TabsTrigger>
                  <TabsTrigger value="reports" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Reports
                  </TabsTrigger>
                </TabsList>

                {/* Dashboard Tab */}
                <TabsContent value="dashboard" className="space-y-6">
                  <AggregatedSparkCharts data={filteredData} />
                  <DashboardWrapper
                    data={filteredData}
                    unfilteredData={data}
                    hideCharts={[]}
                    hideDashboardSparkCharts={false}
                  />
                </TabsContent>

                {/* Trends Tab */}
                <TabsContent value="trends" className="space-y-6">
                  <CampaignSparkCharts data={filteredData} />
                </TabsContent>

                {/* Pacing Tab */}
                <TabsContent value="pacing" className="space-y-6">
                  <div className="mb-4">
                    <PacingFileUpload onFileUpload={handlePacingFileUpload} />
                  </div>
                  <Pacing data={filteredData} unfilteredData={data} />
                </TabsContent>

                {/* Health Tab */}
                <TabsContent value="health" className="space-y-6">
                  <CampaignHealthTab
                    data={filteredData}
                    unfilteredData={data}
                    pacingData={pacingData}
                  />
                </TabsContent>

                {/* Status Tab */}
                <TabsContent value="status" className="space-y-6">
                  <StatusTab
                    data={filteredData}
                    contractTermsData={contractTermsData}
                  />
                </TabsContent>

                {/* Notifications Tab */}
                <TabsContent value="notifications" className="space-y-6">
                  <NotificationsTab data={filteredData} />
                </TabsContent>

                {/* Raw Data Tab */}
                <TabsContent value="data" className="space-y-6">
                  <RawDataTableImproved data={filteredData} />
                </TabsContent>

                {/* Reports Tab */}
                <TabsContent value="reports" className="space-y-6">
                  <CustomReportBuilder data={filteredData} />
                </TabsContent>
              </Tabs>
            </>
          )}

          {/* Campaign Manager */}
          <CampaignManager />

          {/* Modals and Dialogs */}
          <UnifiedUploadModal
            isOpen={showUnifiedUpload}
            onClose={() => setShowUnifiedUpload(false)}
          />

          <ClearDatabaseDialog
            isOpen={showClearDialog}
            onClose={() => setShowClearDialog(false)}
            onConfirm={() => {
              // Handle clear database
              setData([]);
              setPacingData([]);
              setContractTermsData([]);
              setShowDashboard(false);
              setShowClearDialog(false);
              toast.success('Database cleared successfully');
            }}
          />
        </SidebarLayout>
      </div>
    </CampaignFilterProvider>
  );
};

export default IndexRefactored;