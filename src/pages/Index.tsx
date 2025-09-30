import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { DateRange } from "react-day-picker";
import FileUpload from "@/components/FileUpload";
import DateRangePicker from "@/components/DateRangePicker";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CampaignSparkCharts from "@/components/CampaignSparkCharts";
import { LayoutDashboard, ChartLine, FileText, Target, Plus, Activity, FileDown, Clock, TrendingUp, Bell, Trash2 } from "lucide-react";
import DashboardWrapper from "@/components/DashboardWrapper";
import { setToStartOfDay, setToEndOfDay, logDateDetails, parseDateString, formatDateSortable } from "@/lib/utils";
import { CampaignFilterProvider, useCampaignFilter } from "@/contexts/CampaignFilterContext";
import { useSupabase } from "@/contexts/SupabaseContext";
import { CampaignStatusToggle } from "@/components/CampaignStatusToggle";
import { ChartToggle } from "@/components/ChartToggle";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import GlobalFilters from "@/components/GlobalFilters";
import { AggregatedSparkCharts } from "@/components/charts/AggregatedSparkCharts";
import RawDataTableImproved from "@/components/RawDataTableImproved";
import PacingFileUpload from "@/components/PacingFileUpload";
import CampaignHealthTab from "@/components/CampaignHealthTab";
import { Pacing } from "@/components/Pacing";
import CustomReportBuilder from "@/components/CustomReportBuilder";
import StatusTab from "@/components/StatusTab";
import { ClearDatabaseDialog } from "@/components/ClearDatabaseDialog";
import { NotificationsTab } from "@/components/NotificationsTab";
import SidebarLayout from "@/components/SidebarLayout";
import UnifiedUploadModal from "@/components/UnifiedUploadModal";
import CampaignManager from "@/components/CampaignManager";

const DashboardContent = ({
  data,
  pacingData,
  contractTermsData,
  dateRange,
  onDateRangeChange,
  onPacingDataLoaded,
  onDataLoaded,
  hasAllData,
  isLoadingAllData,
  loadAllDataInBackgroundWrapper,
  showClearDialog,
  setShowClearDialog,
  showUnifiedUpload,
  setShowUnifiedUpload
}: {
  data: any[];
  pacingData: any[];
  contractTermsData: any[];
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onPacingDataLoaded: (data: any[]) => void;
  onDataLoaded: (data: any[]) => void;
  hasAllData: boolean;
  isLoadingAllData: boolean;
  loadAllDataInBackgroundWrapper: () => void;
  showClearDialog: boolean;
  setShowClearDialog: (show: boolean) => void;
  showUnifiedUpload: boolean;
  setShowUnifiedUpload: (show: boolean) => void;
}) => {
  // Calculate available date range from data to constrain date picker
  const availableDateRange = useMemo(() => {
    if (!data || data.length === 0) {
      return { min: undefined, max: undefined };
    }
    
    const rawDates = data
      .map(row => row.DATE)
      .filter(date => date && date !== 'Totals');
    
    console.log('Raw dates from data:', rawDates.slice(0, 10));
    
    const dates = rawDates
      .map(dateStr => {
        const parsed = parseDateString(dateStr);
        if (!parsed) {
          console.log('Failed to parse date:', dateStr);
        }
        return parsed;
      })
      .filter(Boolean) as Date[];
      
    if (dates.length === 0) {
      console.log('No valid dates found after parsing');
      return { min: undefined, max: undefined };
    }
    
    dates.sort((a, b) => a.getTime() - b.getTime());
    const result = {
      min: dates[0],
      max: dates[dates.length - 1]
    };
    
    console.log('Date range calculated:', {
      min: result.min?.toDateString(),
      max: result.max?.toDateString(),
      totalDates: dates.length
    });
    
    return result;
  }, [data]);
  // Global filters state - used across all charts
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([]);
  const [selectedAdvertisers, setSelectedAdvertisers] = useState<string[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [isInCampaignDetailView, setIsInCampaignDetailView] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    // Initialize active tab from URL parameter or default to dashboard
    return searchParams.get('tab') || 'dashboard';
  });

  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const newSearchParams = new URLSearchParams(searchParams);
    if (tab === 'dashboard') {
      // Remove tab param for default dashboard tab to keep URL clean
      newSearchParams.delete('tab');
    } else {
      newSearchParams.set('tab', tab);
    }
    setSearchParams(newSearchParams, { replace: true });
  };
  const [isAttributionChart, setIsAttributionChart] = useState(false);
  
  const { showLiveOnly, extractAdvertiserName, isTestCampaign, extractAgencyInfo, showDebugInfo } = useCampaignFilter();

  // Updated getMostRecentDate function to accept filtered data as parameter
  const getMostRecentDate = (filteredData: any[]) => {
    if (!filteredData || filteredData.length === 0) return null;
    const dates = filteredData
      .map(row => row.DATE)
      .filter(date => date && date !== 'Totals')
      .sort((a, b) => {
        try {
          // Convert to Date objects for comparison
          const dateA = parseDateString(a);
          const dateB = parseDateString(b);
          if (!dateA || !dateB) return 0;
          return dateB.getTime() - dateA.getTime();
        } catch (e) {
          console.error("Error sorting dates:", e);
          return 0;
        }
      });
    
    return dates.length > 0 ? dates[0] : null;
  };

  const getFilteredData = () => {
    console.time('⏱️ getFilteredData');
    let filtered = data;
    
    if (!dateRange || !dateRange.from) {
      console.log("No date range specified, returning all data");
      console.timeEnd('⏱️ getFilteredData');
      return filtered;
    }

    const fromDate = setToStartOfDay(dateRange.from);
    const toDate = dateRange.to ? setToEndOfDay(dateRange.to) : setToEndOfDay(new Date());
    
    console.log("🔍 Filtering data - From:", fromDate.toLocaleDateString(), "To:", toDate.toLocaleDateString());
    console.log("🔍 Total data rows to filter:", data.length);
    
    filtered = data.filter(row => {
      try {
        if (!row.DATE) {
          console.warn(`Row missing DATE: ${JSON.stringify(row)}`);
          return false;
        }
        
        if (row.DATE === 'Totals') return true;
        
        const dateStr = String(row.DATE).trim();
        const rowDate = parseDateString(dateStr);
        if (!rowDate) {
          console.warn(`Could not parse date in row: ${dateStr}`);
          return false;
        }
        
        // Normalize row date to start of day for comparison
        const normalizedRowDate = setToStartOfDay(rowDate);
        const isAfterFrom = normalizedRowDate >= fromDate;
        const isBeforeTo = normalizedRowDate <= toDate;
        
        return isAfterFrom && isBeforeTo;
      } catch (error) {
        console.error(`Error filtering by date for row ${JSON.stringify(row)}:`, error);
        return false;
      }
    });

    console.log(`🔍 Filtered from ${data.length} rows to ${filtered.length} rows`);
    
    // Log sample of filtered data to verify it has the right content
    if (filtered.length > 0) {
      console.log("🔍 Sample filtered data:", filtered.slice(0, 3).map(row => ({
        DATE: row.DATE,
        CAMPAIGN: row["CAMPAIGN ORDER NAME"]?.substring(0, 50) + "...",
        IMPRESSIONS: row.IMPRESSIONS
      })));
      
      // Log full campaign names to debug parsing
      console.log("🔍 Full campaign names for debugging:", filtered.slice(0, 5).map(row => row["CAMPAIGN ORDER NAME"]));
    }
    
    // Additional check - if we get no data, log the date range issue
    if (filtered.length === 0 && data.length > 0) {
      console.warn("Date filtering resulted in empty dataset. Checking data dates...");
      const sampleDates = data.slice(0, 5).map(row => ({
        original: row.DATE,
        parsed: parseDateString(row.DATE)
      }));
      console.log("Sample dates from data:", sampleDates);
      console.log("Filter range:", { from: fromDate, to: toDate });
    }

    console.timeEnd('⏱️ getFilteredData');
    return filtered;
  };

  const filteredData = getFilteredData();
  
  const filteredDataByLiveStatus = useMemo(() => {
    console.time('⏱️ filteredDataByLiveStatus');
    console.log('🔍 filteredDataByLiveStatus - showLiveOnly:', showLiveOnly, 'filteredData length:', filteredData.length);
    
    if (!showLiveOnly) {
      console.log('🔍 Returning ALL filtered data (not just live campaigns)');
      console.timeEnd('⏱️ filteredDataByLiveStatus');
      return filteredData;
    }

    // Use the filtered data to get the most recent date, not the full dataset
    const mostRecentDate = getMostRecentDate(filteredData);
    if (!mostRecentDate) return filteredData;

    if (showDebugInfo) {
      console.log('Filtering for campaigns active on most recent date:', mostRecentDate);
    }
    
    // First get all the campaigns that have impressions on the most recent date
    const activeCampaignsOnMostRecentDate = new Set<string>();
    
    // Single pass to collect active campaigns
    console.time('⏱️ collecting active campaigns');
    for (const row of filteredData) {
      if (row.DATE === mostRecentDate && Number(row.IMPRESSIONS) > 0) {
        const campaignName = row["CAMPAIGN ORDER NAME"] || "";
        if (!isTestCampaign(campaignName)) {
          activeCampaignsOnMostRecentDate.add(campaignName);
        }
      }
    }
    console.timeEnd('⏱️ collecting active campaigns');
    
    if (showDebugInfo) {
      console.log(`Found ${activeCampaignsOnMostRecentDate.size} active campaigns on most recent date`);
    }
    
    // Single pass filter for live data
    const liveData = filteredData.filter(row => {
      if (row.DATE === 'Totals') return true;
      
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      if (isTestCampaign(campaignName)) return false;
      
      return activeCampaignsOnMostRecentDate.has(campaignName);
    });
    
    if (showDebugInfo) {
      console.log(`Filtered from ${filteredData.length} rows to ${liveData.length} live campaign rows`);
    }
    
    console.log('🔍 Live campaigns filtering completed:', liveData.length, 'rows');
    console.timeEnd('⏱️ filteredDataByLiveStatus');
    return liveData;
  }, [filteredData, showLiveOnly, isTestCampaign, showDebugInfo]);

  const getFilteredDataByGlobalFilters = useCallback(() => {
    // Early return if no filters are applied
    if (selectedAgencies.length === 0 && selectedAdvertisers.length === 0 && selectedCampaigns.length === 0) {
      return filteredDataByLiveStatus;
    }

    // Convert arrays to Sets for O(1) lookups
    const selectedAgencySet = new Set(selectedAgencies);
    const selectedAdvertiserSet = new Set(selectedAdvertisers);
    const selectedCampaignSet = new Set(selectedCampaigns);
    
    // Single pass filtering
    return filteredDataByLiveStatus.filter(row => {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      
      // Campaign filter (most specific, check first)
      if (selectedCampaigns.length > 0 && !selectedCampaignSet.has(campaignName)) {
        return false;
      }
      
      // Agency filter
      if (selectedAgencies.length > 0) {
        const { agency } = extractAgencyInfo(campaignName);
        if (!selectedAgencySet.has(agency)) {
          return false;
        }
      }
      
      // Advertiser filter
      if (selectedAdvertisers.length > 0) {
        const advertiser = extractAdvertiserName(campaignName);
        if (!selectedAdvertiserSet.has(advertiser)) {
          return false;
        }
      }
      
      return true;
    });
  }, [filteredDataByLiveStatus, selectedAgencies, selectedAdvertisers, selectedCampaigns, extractAgencyInfo, extractAdvertiserName]);

  const globalFilteredData = useMemo(() => getFilteredDataByGlobalFilters(), 
    [filteredDataByLiveStatus, selectedAgencies, selectedAdvertisers, selectedCampaigns, extractAdvertiserName, extractAgencyInfo]);

  // Filter contract terms data by global filters
  const filteredContractTermsData = useMemo(() => {
    console.log('🔍 Contract terms filtering - Original count:', contractTermsData.length);
    console.log('🔍 Current filters - Agencies:', selectedAgencies.length, 'Advertisers:', selectedAdvertisers.length, 'Campaigns:', selectedCampaigns.length);
    
    if (selectedAgencies.length === 0 && selectedAdvertisers.length === 0 && selectedCampaigns.length === 0) {
      console.log('🔍 No filters applied, returning all contract terms');
      return contractTermsData;
    }

    const selectedAgencySet = new Set(selectedAgencies);
    const selectedAdvertiserSet = new Set(selectedAdvertisers);
    const selectedCampaignSet = new Set(selectedCampaigns);

    const filtered = contractTermsData.filter(contract => {
      const campaignName = contract.Name;
      console.log('🔍 Checking contract:', campaignName);
      
      // Filter by specific campaigns first
      if (selectedCampaigns.length > 0 && !selectedCampaignSet.has(campaignName)) {
        console.log('🔍 Filtered out by campaign filter:', campaignName);
        return false;
      }
      
      // Filter by agencies
      if (selectedAgencies.length > 0) {
        const agencyInfo = extractAgencyInfo(campaignName);
        console.log('🔍 Agency info for', campaignName, ':', agencyInfo);
        if (!agencyInfo || !selectedAgencySet.has(agencyInfo.agency)) {
          console.log('🔍 Filtered out by agency filter:', campaignName, 'Agency:', agencyInfo?.agency);
          return false;
        }
      }
      
      // Filter by advertisers
      if (selectedAdvertisers.length > 0) {
        const advertiserName = extractAdvertiserName(campaignName);
        console.log('🔍 Advertiser for', campaignName, ':', advertiserName);
        if (!advertiserName || !selectedAdvertiserSet.has(advertiserName)) {
          console.log('🔍 Filtered out by advertiser filter:', campaignName, 'Advertiser:', advertiserName);
          return false;
        }
      }
      
      console.log('🔍 Contract passed all filters:', campaignName);
      return true;
    });
    
    console.log('🔍 Filtered contract terms count:', filtered.length);
    return filtered;
  }, [contractTermsData, selectedAgencies, selectedAdvertisers, selectedCampaigns, extractAgencyInfo, extractAdvertiserName]);

  const agencyOptions = useMemo(() => {
    console.time('⏱️ agencyOptions calculation');
    const agencies = new Set<string>();
    
    for (const row of filteredDataByLiveStatus) {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      if (!isTestCampaign(campaignName)) {
        const { agency } = extractAgencyInfo(campaignName);
        if (agency) agencies.add(agency);
      }
    }
    
    const result = Array.from(agencies)
      .sort()
      .map(agency => ({
        value: agency,
        label: agency
      }));
    
    console.timeEnd('⏱️ agencyOptions calculation');
    return result;
  }, [filteredDataByLiveStatus, extractAgencyInfo, isTestCampaign]);

  const advertiserOptions = useMemo(() => {
    const advertisers = new Set<string>();
    const selectedAgencySet = new Set(selectedAgencies);
    
    for (const row of filteredDataByLiveStatus) {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      if (!isTestCampaign(campaignName)) {
        // Apply agency filter if selected
        if (selectedAgencies.length > 0) {
          const { agency } = extractAgencyInfo(campaignName);
          if (!selectedAgencySet.has(agency)) continue;
        }
        
        const advertiser = extractAdvertiserName(campaignName);
        if (advertiser) advertisers.add(advertiser);
      }
    }
    
    return Array.from(advertisers)
      .sort()
      .map(advertiser => ({
        value: advertiser,
        label: advertiser
      }));
  }, [filteredDataByLiveStatus, selectedAgencies, extractAdvertiserName, extractAgencyInfo, isTestCampaign]);

  const campaignOptions = useMemo(() => {
    const campaigns = new Set<string>();
    const selectedAgencySet = new Set(selectedAgencies);
    const selectedAdvertiserSet = new Set(selectedAdvertisers);
    
    for (const row of filteredDataByLiveStatus) {
      const campaignName = row["CAMPAIGN ORDER NAME"] || "";
      if (!isTestCampaign(campaignName)) {
        // Apply agency filter if selected
        if (selectedAgencies.length > 0) {
          const { agency } = extractAgencyInfo(campaignName);
          if (!selectedAgencySet.has(agency)) continue;
        }
        
        // Apply advertiser filter if selected
        if (selectedAdvertisers.length > 0) {
          const advertiser = extractAdvertiserName(campaignName);
          if (!selectedAdvertiserSet.has(advertiser)) continue;
        }
        
        campaigns.add(campaignName);
      }
    }
    
    return Array.from(campaigns)
      .sort()
      .map(campaign => ({
        value: campaign,
        label: campaign
      }));
  }, [filteredDataByLiveStatus, selectedAgencies, selectedAdvertisers, extractAdvertiserName, extractAgencyInfo, isTestCampaign]);

  const handleAgenciesChange = (selected: string[]) => {
    setSelectedAgencies(selected);
    // Clear dependent filters when parent filter changes
    setSelectedAdvertisers([]);
    setSelectedCampaigns([]);
  };

  const handleAdvertisersChange = (selected: string[]) => {
    setSelectedAdvertisers(selected);
    // Clear campaigns when advertiser changes
    setSelectedCampaigns([]);
  };

  const handleCampaignsChange = (selected: string[]) => {
    setSelectedCampaigns(selected);
  };

  const headerContent = (
    <>
      {/* Title and Date Picker */}
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Display Campaign Monitor</h1>
        </div>

        <div className="flex items-center gap-2">
          {!(activeTab === 'campaigns' && isInCampaignDetailView) && <CampaignStatusToggle />}
          <DateRangePicker
            key={`date-picker-${data.length}`}
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
            displayDateRangeSummary={false}
            minDate={availableDateRange.min}
            maxDate={availableDateRange.max}
          />

          {!hasAllData && (
            <Button
              variant={isLoadingAllData ? "secondary" : "outline"}
              size="sm"
              onClick={loadAllDataInBackgroundWrapper}
              disabled={isLoadingAllData}
              className="whitespace-nowrap"
            >
              <TrendingUp className="mr-2" size={14} />
              {isLoadingAllData ? "Loading All..." : "Load All Data"}
            </Button>
          )}
        </div>
      </div>

      {/* Global filters section - hidden when viewing single campaign details */}
      {!(activeTab === 'campaigns' && isInCampaignDetailView) && (
        <div className="border-t border-gray-100">
          <GlobalFilters
            agencyOptions={agencyOptions}
            advertiserOptions={advertiserOptions}
            campaignOptions={campaignOptions}
            selectedAgencies={selectedAgencies}
            selectedAdvertisers={selectedAdvertisers}
            selectedCampaigns={selectedCampaigns}
            onAgenciesChange={handleAgenciesChange}
            onAdvertisersChange={handleAdvertisersChange}
            onCampaignsChange={handleCampaignsChange}
          />
        </div>
      )}
    </>
  );

  return (
    <>
      <SidebarLayout
        activeTab={activeTab}
        onTabChange={handleTabChange}
        pacingDataLength={pacingData.length}
        contractTermsDataLength={contractTermsData.length}
        dataLength={data.length}
        hasAllData={hasAllData}
        onClearDatabase={() => setShowClearDialog(true)}
        onUploadCSV={() => setShowUnifiedUpload(true)}
        header={headerContent}
        className="animate-fade-in"
      >
        <div className="px-4 lg:px-6 pb-4 lg:pb-6 pt-8">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsContent value="dashboard" className="mt-0">
          {/* Dashboard tab content */}
          <div id="dashboard-metrics-section">
            <AggregatedSparkCharts 
              data={globalFilteredData.filter(row => row.DATE !== 'Totals')}
            />
            
            {/* Chart section with toggle instead of tabs */}
            <div className="mt-6 mb-4" id="weekly-comparison-section">
              <DashboardWrapper 
                data={showLiveOnly ? filteredDataByLiveStatus : filteredData}
                metricsData={globalFilteredData}
                revenueData={globalFilteredData}
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
                hideCharts={isAttributionChart ? ["metricsChart"] : ["revenueChart"]}
                chartToggleComponent={
                  <ChartToggle
                    isAttributionChart={isAttributionChart}
                    setIsAttributionChart={setIsAttributionChart}
                  />
                }
                showDailyTotalsTable={false}
                hideDashboardSparkCharts={true}
              />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="sparks" className="mt-0">
          {/* Trends tab content */}
          <div id="spark-charts-section">
            <CampaignSparkCharts 
              data={globalFilteredData} 
              dateRange={dateRange}
              useGlobalFilters={true}
            />
          </div>
        </TabsContent>

        {data.length > 0 && (
          <TabsContent value="campaigns" className="mt-0">
            {/* Campaign Manager tab content */}
            <div className="mb-4 animate-fade-in" id="campaigns-section">
              <CampaignManager
                data={globalFilteredData}
                pacingData={pacingData}
                contractTermsData={contractTermsData}
                useGlobalFilters={true}
                globalDateRange={dateRange}
                onCampaignDetailViewChange={setIsInCampaignDetailView}
              />
            </div>
          </TabsContent>
        )}

        {(pacingData.length > 0 || contractTermsData.length > 0) && (
          <TabsContent value="health" className="mt-0">
            {/* Campaign Health tab content */}
            <div id="health-scatter-section">
              <CampaignHealthTab
                data={globalFilteredData}
                pacingData={pacingData}
                contractTermsData={contractTermsData}
                unfilteredData={data}
                dbContractTerms={[]}
              />
            </div>
          </TabsContent>
        )}
        
        <TabsContent value="pacing" className="mt-0">
          <div className="mb-4 animate-fade-in" id="pacing-section">
            <Pacing
              data={globalFilteredData}
              unfilteredData={data}
            />
          </div>
        </TabsContent>

        {data.length > 0 && (
          <TabsContent value="notifications" className="mt-0">
            {/* Notifications tab content */}
            <div className="mb-4 animate-fade-in" id="notifications-section">
              <NotificationsTab campaignData={globalFilteredData} />
            </div>
          </TabsContent>
        )}

        <TabsContent value="custom-report" className="mt-0">
          {/* Custom Report tab content */}
          <div className="mb-4 animate-fade-in" id="custom-report-section">
            <CustomReportBuilder 
              data={globalFilteredData}
              dateRange={dateRange}
              pacingData={pacingData}
              contractTermsData={contractTermsData}
            />
          </div>
        </TabsContent>
        
        {(contractTermsData.length > 0 || data.length > 0) && (
          <TabsContent value="status" className="mt-0">
            {/* Status tab content */}
            <div className="mb-4 animate-fade-in" id="status-section">
              <StatusTab 
                contractTermsData={filteredContractTermsData}
                deliveryData={globalFilteredData}
                globalMostRecentDate={
                  globalFilteredData.length > 0 
                    ? new Date(Math.max(...globalFilteredData.map(row => parseDateString(row.DATE)?.getTime() || 0).filter(Boolean)))
                    : new Date()
                }
              />
            </div>
          </TabsContent>
        )}
        
        
        <TabsContent value="raw-data" className="mt-0">
          {/* Raw Data tab content */}
          <div className="mb-4 animate-fade-in" id="raw-data-table-section">
            <h3 className="text-lg font-semibold mb-4">Campaign Data</h3>
            <RawDataTableImproved 
              data={globalFilteredData}
              useGlobalFilters={true}
            />
          </div>
        </TabsContent>
          </Tabs>
        </div>
      </SidebarLayout>


      {/* Clear database dialog */}
      <ClearDatabaseDialog
        isOpen={showClearDialog}
        onClose={() => setShowClearDialog(false)}
        onSuccess={() => {
          // Refresh the page data after clearing
          setData([]);
          setContractTermsData([]);
          setPacingData([]);
          setShowDashboard(false);
          toast.success("Database cleared successfully");
        }}
      />
    </>
  );
};


const Index = () => {
  const { upsertCampaignData, getCampaignData, loadAllDataInBackground, getContractTerms } = useSupabase();
  const [data, setData] = useState<any[]>([]);
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

  // Load all data at startup
  useEffect(() => {
    const loadAllDataFromSupabase = async () => {
      try {
        setLoadingProgress('Loading all campaign data...');

        // Load all data at startup
        const campaignData = await getCampaignData(undefined, undefined, setLoadingProgress, false);

        if (campaignData.length > 0) {
          setLoadingProgress('Processing all data...');
          const transformedData = transformDataFormat(campaignData);

          setData(transformedData);
          setDateRange(undefined);
          setShowDashboard(true);
          setHasAllData(true); // Mark that we have all data
          console.log(`✅ All data loaded: ${transformedData.length} total rows loaded`);
        }

        // Load contract terms from Supabase
        setLoadingProgress('Loading contract terms...');
        try {
          const contractTerms = await getContractTerms();
          if (contractTerms.length > 0) {
            // Transform database format to StatusTab expected format
            const transformedContractTerms = contractTerms.map(term => {
              // Convert YYYY-MM-DD database dates to MM/DD/YYYY format expected by StatusTab
              const formatDbDate = (dateString: string) => {
                const date = new Date(dateString);
                const month = date.getMonth() + 1;
                const day = date.getDate();
                const year = date.getFullYear();
                return `${month}/${day}/${year}`;
              };

              return {
                'Name': term.campaign_name,
                'Start Date': formatDbDate(term.start_date),
                'End Date': formatDbDate(term.end_date),
                'Budget': term.budget.toString(),
                'CPM': term.cpm.toString(),
                'Impressions Goal': term.impressions_goal.toString()
              };
            });
            setContractTermsData(transformedContractTerms);
            console.log(`✅ Contract terms loaded: ${contractTerms.length} contracts`);
          }
        } catch (contractError) {
          console.error("Failed to load contract terms:", contractError);
          // Don't fail the entire load if contract terms fail
        }

      } catch (error) {
        console.error("Failed to load all data from Supabase:", error);
        setLoadingProgress('Error loading data');
      } finally {
        setIsLoadingFromSupabase(false);
        setLoadingProgress('');
      }
    };

    loadAllDataFromSupabase();
  }, [getCampaignData, getContractTerms]);

  // Background loading of all historical data
  const loadAllDataInBackgroundWrapper = useCallback(async () => {
    if (hasAllData || isLoadingAllData) return;

    try {
      setIsLoadingAllData(true);
      console.log('🔄 Loading all historical data in background...');

      const allData = await loadAllDataInBackground((progress) => {
        console.log(`Background loading: ${progress}`);
      });

      if (allData.length > data.length) {
        const transformedData = transformDataFormat(allData);
        setData(transformedData);
        setHasAllData(true);
        console.log(`✅ Background load complete: ${transformedData.length} total rows`);
        toast.success(`Loaded complete dataset: ${transformedData.length.toLocaleString()} records`);
      }
    } catch (error) {
      console.error("Background data loading failed:", error);
    } finally {
      setIsLoadingAllData(false);
    }
  }, [data.length, hasAllData, isLoadingAllData]);

  // Helper function to transform data format
  const transformDataFormat = (campaignData: any[]) => {
    return campaignData.map(row => {
      let formattedDate = row.date;
      try {
        if (row.date && typeof row.date === 'string') {
          const date = new Date(row.date + 'T00:00:00');
          if (!isNaN(date.getTime())) {
            formattedDate = formatDateSortable(date);
          }
        }
      } catch (e) {
        console.error("Error formatting date:", e, row.date);
      }

      return {
        DATE: formattedDate,
        "CAMPAIGN ORDER NAME": row.campaign_order_name,
        IMPRESSIONS: row.impressions,
        CLICKS: row.clicks,
        REVENUE: row.revenue,
        SPEND: row.spend,
        TRANSACTIONS: row.transactions
      };
    });
  };

  // Debug effect to track data changes
  useEffect(() => {
    console.log(`🔍 Data changed: ${data.length} rows, current dateRange:`, dateRange);
    if (data.length > 0) {
      console.log(`🔍 First 3 dates in data:`, data.slice(0, 3).map(row => row.DATE));
    }
  }, [data.length, dateRange]);

  useEffect(() => {
    if (data.length > 0) {
      // First parse all dates and sort them chronologically, not alphabetically
      const allDates = Array.from(new Set(data.map(row => row.DATE)))
        .filter(date => date !== 'Totals')
        .map(dateStr => ({
          original: dateStr,
          parsed: parseDateString(dateStr)
        }))
        .filter(item => item.parsed !== null)
        .sort((a, b) => a.parsed!.getTime() - b.parsed!.getTime());

      const uniqueDates = allDates.map(item => item.original);
      console.log(`Dataset has ${uniqueDates.length} unique dates (chronologically sorted):`, uniqueDates);

      if (uniqueDates.length > 0) {
        const firstDate = allDates[0].original;
        const lastDate = allDates[allDates.length - 1].original;
        console.log(`Date range in dataset: ${firstDate} to ${lastDate}`);

        const dateCounts: Record<string, number> = {};
        data.forEach(row => {
          dateCounts[row.DATE] = (dateCounts[row.DATE] || 0) + 1;
        });
        console.log("Rows per date:", dateCounts);

        console.log(`🔍 Current dateRange state:`, dateRange);

        // Force recalculation every time data loads to ensure we use the most recent 30 days
        // Always recalculate to use the most recent 30 days from actual data
        console.log(`🔍 Force recalculating date range based on loaded data...`);
        try {
            // Use the already parsed and sorted dates
            const parsedDates = allDates.map(item => item.parsed!);

            if (parsedDates.length > 0) {
              const minDate = parsedDates[0];
              const maxDate = parsedDates[parsedDates.length - 1];
              
              if (!isNaN(minDate.getTime()) && !isNaN(maxDate.getTime())) {
                // Check if the dataset spans more than 90 days
                const daysDifference = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
                
                let fromDate = minDate;
                let toDate = maxDate;
                
                console.log(`🔍 Dataset analysis:`);
                console.log(`🔍 - Min date: ${minDate.toLocaleDateString()} (${minDate.toISOString()})`);
                console.log(`🔍 - Max date: ${maxDate.toLocaleDateString()} (${maxDate.toISOString()})`);
                console.log(`🔍 - Spans: ${Math.round(daysDifference)} days`);

                // If dataset spans more than 90 days, default to last 30 days of data
                if (daysDifference > 90) {
                  // Set to last 30 days of available data using proper date arithmetic
                  fromDate = new Date(maxDate.getTime() - (30 * 24 * 60 * 60 * 1000));

                  // Make sure fromDate doesn't go before the actual data start
                  if (fromDate < minDate) {
                    fromDate = minDate;
                  }

                  console.log(`🔍 Using last 30 days: ${fromDate.toLocaleDateString()} to ${maxDate.toLocaleDateString()}`);
                  console.log(`🔍 Latest 5 dates in data:`, uniqueDates.slice(-5));
                } else {
                  console.log(`🔍 Using full range: ${minDate.toLocaleDateString()} to ${maxDate.toLocaleDateString()}`);
                }
                
                console.log(`🔍 Setting dateRange to:`, { from: fromDate, to: toDate });
                setDateRange({ from: fromDate, to: toDate });
              }
            }
        } catch (e) {
          console.error("Error auto-setting date range:", e);
        }
      }
    }
  }, [data]);

  const handleDataLoaded = (uploadedData: any[]) => {
    try {
      if (!Array.isArray(uploadedData) || uploadedData.length === 0) {
        toast.error("Invalid data format received");
        return;
      }
      
      console.log(`Loaded ${uploadedData.length} rows of data`);
      
      const requiredFields = ["DATE", "CAMPAIGN ORDER NAME", "IMPRESSIONS", "CLICKS", "REVENUE", "SPEND"];
      
      if (uploadedData[0]) {
        const missingFields = requiredFields.filter(field => 
          !Object.keys(uploadedData[0]).some(key => key.toUpperCase() === field)
        );
        
        if (missingFields.length > 0) {
          toast.error(`Missing required fields: ${missingFields.join(", ")}`);
          return;
        }
      }
      
      const processedData = uploadedData.map(row => {
        const newRow = { ...row };

        // Sanitize date field
        if (newRow.DATE) {
          try {
            const date = parseDateString(newRow.DATE);
            if (date) {
              newRow.DATE = formatDateSortable(date);
              if (newRow.DATE.includes('04/09/') || newRow.DATE.includes('04/08/')) {
                logDateDetails(`Processed date for row:`, date, `-> ${newRow.DATE} (original: ${row.DATE})`);
              }
            } else {
              console.error(`Invalid date format: ${newRow.DATE}`);
              newRow.DATE = null; // Mark for filtering out
            }
          } catch (e) {
            console.error("Error parsing date:", e);
            newRow.DATE = null; // Mark for filtering out
          }
        }

        // Sanitize campaign name field - remove any potential invalid characters
        const campaignFields = ["CAMPAIGN ORDER NAME", "Campaign Order Name", "CAMPAIGN_ORDER_NAME"];
        for (const field of campaignFields) {
          if (newRow[field]) {
            // Remove null bytes, control characters, and trim whitespace
            newRow[field] = String(newRow[field])
              .replace(/\u0000/g, '') // Remove null bytes
              .replace(/[\u0000-\u001F\u007F]/g, '') // Remove control characters
              .trim();
            break;
          }
        }

        // Sanitize numeric fields
        ["IMPRESSIONS", "CLICKS", "TRANSACTIONS", "REVENUE", "SPEND"].forEach(field => {
          const normalizedField = Object.keys(newRow).find(key => key.toUpperCase() === field);
          if (normalizedField) {
            const value = Number(newRow[normalizedField]);
            newRow[normalizedField] = isNaN(value) ? 0 : value;
          }
        });

        return newRow;
      }).filter(row => row.DATE && row.DATE !== null); // Filter out rows with invalid dates
      
      // Don't replace existing data immediately - let Supabase upsert handle the merge
      // setData(processedData);  // This was causing the bug!

      const dates = processedData.map(row => row.DATE).filter(date => date && date !== 'Totals').sort();
      if (dates.length > 0) {
        console.log(`Data date range: ${dates[0]} to ${dates[dates.length-1]}`);
        console.log(`Total unique dates: ${new Set(dates).size}`);

        const dateCounts: Record<string, number> = {};
        processedData.forEach(row => {
          dateCounts[row.DATE] = (dateCounts[row.DATE] || 0) + 1;
        });
        console.log("Rows per date:", dateCounts);
      }

      toast.success(`Successfully uploaded ${processedData.length} rows of data. Refreshing with complete dataset...`);

      // Upsert data to Supabase in the background
      try {
        const supabaseData = processedData.map(row => {
          // Sanitize date field
          const cleanDate = row.DATE;
          if (typeof cleanDate !== 'string' || !cleanDate || cleanDate === 'Totals') {
            return null; // Skip invalid rows
          }

          // Sanitize campaign name field
          let campaignName = row["CAMPAIGN ORDER NAME"] || row["Campaign Order Name"] || row.CAMPAIGN_ORDER_NAME;
          if (typeof campaignName !== 'string' || !campaignName.trim()) {
            return null; // Skip rows without valid campaign names
          }
          campaignName = campaignName.trim();

          // Sanitize numeric fields
          const impressions = Number(row.IMPRESSIONS) || 0;
          const clicks = Number(row.CLICKS) || 0;
          const revenue = Number(row.REVENUE) || 0;
          const spend = Number(row.SPEND) || 0;
          const transactions = row.TRANSACTIONS ? Number(row.TRANSACTIONS) || 0 : 0;

          return {
            date: cleanDate,
            campaign_order_name: campaignName,
            impressions: impressions,
            clicks: clicks,
            revenue: revenue,
            spend: spend,
            transactions: transactions
          };
        }).filter(row => row !== null); // Filter out null/invalid rows

        if (supabaseData.length > 0) {
          upsertCampaignData(supabaseData, (progress) => {
            console.log(`Upload progress: ${progress}`);
            setLoadingProgress(progress);
          }).then(async () => {
            console.log(`Successfully synced ${supabaseData.length} records to Supabase`);
            // Reload all data from Supabase to get the complete dataset
            try {
              const allCampaignData = await getCampaignData();
              if (allCampaignData.length > 0) {
                const refreshedData = allCampaignData.map(row => {
                  // Convert YYYY-MM-DD date format to MM/DD/YY format
                  let formattedDate = row.date;
                  try {
                    if (row.date && typeof row.date === 'string') {
                      const date = new Date(row.date + 'T00:00:00'); // Add time to avoid timezone issues
                      if (!isNaN(date.getTime())) {
                        formattedDate = formatDateSortable(date);
                      }
                    }
                  } catch (e) {
                    console.error("Error formatting date:", e, row.date);
                  }

                  return {
                    DATE: formattedDate,
                    "CAMPAIGN ORDER NAME": row.campaign_order_name,
                    IMPRESSIONS: row.impressions,
                    CLICKS: row.clicks,
                    REVENUE: row.revenue,
                    SPEND: row.spend,
                    TRANSACTIONS: row.transactions
                  };
                });
                setData(refreshedData);
                console.log(`Refreshed with ${refreshedData.length} total records from Supabase`);
              }
            } catch (error) {
              console.error("Failed to refresh data from Supabase:", error);
            }
          }).catch((error) => {
            console.error("Failed to sync data to Supabase:", error);
            // Don't show error toast to user since this is background operation
          });
        }
      } catch (error) {
        console.error("Error preparing data for Supabase:", error);
      }
    } catch (error) {
      console.error("Error processing uploaded data:", error);
      toast.error("Failed to process the uploaded data");
    }
  };

  const handlePacingDataLoaded = (uploadedPacingData: any[]) => {
    try {
      if (!Array.isArray(uploadedPacingData) || uploadedPacingData.length === 0) {
        toast.error("Invalid pacing data format received");
        return;
      }

      console.log(`Loaded ${uploadedPacingData.length} rows of pacing data`);
      setPacingData(uploadedPacingData);
      toast.success(`Successfully loaded ${uploadedPacingData.length} campaigns of pacing data`);
    } catch (error) {
      console.error("Error processing pacing data:", error);
      toast.error("Failed to process the pacing data");
    }
  };

  const handleContractTermsLoaded = (uploadedContractTermsData: any[]) => {
    try {
      if (!Array.isArray(uploadedContractTermsData) || uploadedContractTermsData.length === 0) {
        toast.error("Invalid contract terms data format received");
        return;
      }

      console.log(`Loaded ${uploadedContractTermsData.length} rows of contract terms data`);
      setContractTermsData(uploadedContractTermsData);
      toast.success(`Successfully loaded ${uploadedContractTermsData.length} contract terms`);
    } catch (error) {
      console.error("Error processing contract terms data:", error);
      toast.error("Failed to process the contract terms data");
    }
  };

  const handleProcessFiles = () => {
    if (data.length === 0) {
      toast.error("Please upload campaign data first");
      return;
    }
    setShowDashboard(true);
  };

  return (
    <CampaignFilterProvider>
      <div className="container py-8">
        {isLoadingFromSupabase ? (
          <div className="space-y-2 text-center animate-fade-in">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              Display Campaign Monitor
            </h1>
            <p className="text-muted-foreground">
              Loading your campaign data...
            </p>
            {loadingProgress && (
              <p className="text-sm text-muted-foreground">
                {loadingProgress}
              </p>
            )}
          </div>
        ) : !showDashboard ? (
          <>
            <div className="space-y-2 text-center animate-fade-in">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                Display Campaign Monitor
              </h1>
              <p className="text-muted-foreground">
                Upload your campaign data to identify potential anomalies and trends
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <FileUpload
                onDataLoaded={handleDataLoaded}
                onPacingDataLoaded={handlePacingDataLoaded}
                onContractTermsLoaded={handleContractTermsLoaded}
                onProcessFiles={handleProcessFiles}
              />
            </div>
          </>
        ) : (
          <DashboardContent
            data={data}
            pacingData={pacingData}
            contractTermsData={contractTermsData}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onPacingDataLoaded={handlePacingDataLoaded}
            onDataLoaded={handleDataLoaded}
            hasAllData={hasAllData}
            isLoadingAllData={isLoadingAllData}
            loadAllDataInBackgroundWrapper={loadAllDataInBackgroundWrapper}
            showClearDialog={showClearDialog}
            setShowClearDialog={setShowClearDialog}
            showUnifiedUpload={showUnifiedUpload}
            setShowUnifiedUpload={setShowUnifiedUpload}
          />
        )}

        {/* Unified Upload Modal - moved here to be available in all states */}
        <UnifiedUploadModal
          isOpen={showUnifiedUpload}
          onClose={() => setShowUnifiedUpload(false)}
          onDeliveryDataLoaded={handleDataLoaded}
          onContractTermsLoaded={handleContractTermsLoaded}
        />
      </div>
    </CampaignFilterProvider>
  );
};

export default Index;
