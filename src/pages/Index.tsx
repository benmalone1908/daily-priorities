import { useState, useEffect } from "react";
import { useSupabase } from "@/contexts/use-supabase";
import { getLastCampaignUpload, getLastContractUpload } from "@/lib/supabase";
import DailyPrioritiesContent from "@/components/DailyPrioritiesContent";
import { CampaignDataRow } from "@/types/campaign";
import { CampaignFilterProvider } from "@/contexts/CampaignFilterContext";

const Index = () => {
  const { getCampaignData } = useSupabase();
  const [data, setData] = useState<CampaignDataRow[]>([]);
  const [isLoadingFromSupabase, setIsLoadingFromSupabase] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState<string>('');
  const [lastCampaignUpload, setLastCampaignUpload] = useState<Date | null>(null);
  const [lastContractUpload, setLastContractUpload] = useState<Date | null>(null);
  const [screenshotMode, setScreenshotMode] = useState(false);

  // Load campaign data for auto-generated alerts
  useEffect(() => {
    const loadDataFromSupabase = async () => {
      try {
        setLoadingProgress('Loading campaign data for alerts...');

        // Load campaign data for auto-generated priorities
        const campaignData = await getCampaignData(undefined, undefined, setLoadingProgress, false);

        if (campaignData.length > 0) {
          setLoadingProgress('Processing data...');
          const transformedData = campaignData.map(row => ({
            DATE: row.date,
            "CAMPAIGN ORDER NAME": row.campaign_order_name,
            IMPRESSIONS: row.impressions,
            CLICKS: row.clicks,
            REVENUE: row.revenue,
            SPEND: row.spend,
            TRANSACTIONS: row.transactions
          }));
          setData(transformedData);
          console.log(`✅ Campaign data loaded: ${transformedData.length} rows`);
        }

        // Load last upload timestamps
        setLoadingProgress('Loading upload timestamps...');
        try {
          const [campaignTimestamp, contractTimestamp] = await Promise.all([
            getLastCampaignUpload(),
            getLastContractUpload()
          ]);
          setLastCampaignUpload(campaignTimestamp);
          setLastContractUpload(contractTimestamp);
        } catch (timestampError) {
          console.error("Failed to load upload timestamps:", timestampError);
        }

      } catch (error) {
        console.error("Failed to load data from Supabase:", error);
        setLoadingProgress('Error loading data');
      } finally {
        setIsLoadingFromSupabase(false);
        setLoadingProgress('');
      }
    };

    loadDataFromSupabase();
  }, [getCampaignData]);

  return (
    <CampaignFilterProvider>
      <div className="min-h-screen bg-gray-50">
        {isLoadingFromSupabase ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="space-y-2 text-center animate-fade-in">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                Daily Priorities
              </h1>
              <p className="text-muted-foreground">
                Loading your priorities...
              </p>
              {loadingProgress && (
                <p className="text-sm text-muted-foreground">
                  {loadingProgress}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className={screenshotMode ? "min-h-screen" : "h-screen overflow-auto"}>
            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 lg:px-6 pb-4 lg:pb-6 pt-6">
              <DailyPrioritiesContent
                dateRange={undefined}
                campaignData={data}
                screenshotMode={screenshotMode}
                onScreenshotModeChange={setScreenshotMode}
                lastCampaignUpload={lastCampaignUpload}
                lastContractUpload={lastContractUpload}
              />
            </div>
          </div>
        )}
      </div>
    </CampaignFilterProvider>
  );
};

export default Index;
