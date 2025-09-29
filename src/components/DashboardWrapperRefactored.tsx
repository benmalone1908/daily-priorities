import { useMemo } from 'react';
import { CampaignDataRow } from '@/types/campaign';
import DashboardRefactored from './DashboardRefactored';

interface DashboardWrapperRefactoredProps {
  data: CampaignDataRow[];
  unfilteredData?: CampaignDataRow[];
  hideCharts?: string[];
  hideDashboardSparkCharts?: boolean;
  showDailyTotalsTable?: boolean;
  contractTermsData?: any[];
  customBarMetric?: string;
  customLineMetric?: string;
  onTabChange?: (tab: string) => void;
}

/**
 * Simplified Dashboard Wrapper - reduced from complex prop management
 * to a clean interface that works with our refactored Dashboard
 */
const DashboardWrapperRefactored = ({
  data,
  unfilteredData,
  hideCharts = [],
  hideDashboardSparkCharts = false,
  showDailyTotalsTable = true,
  contractTermsData = [],
  customBarMetric = "IMPRESSIONS",
  customLineMetric = "CLICKS",
  onTabChange
}: DashboardWrapperRefactoredProps) => {

  // Process data for dashboard consumption
  const processedData = useMemo(() => {
    // Filter out invalid rows
    return data.filter(row =>
      row &&
      row.DATE &&
      row['CAMPAIGN ORDER NAME'] &&
      !isNaN(Number(row.IMPRESSIONS))
    );
  }, [data]);

  // Check if we have valid data
  const hasValidData = processedData.length > 0;

  // Early return if no data
  if (!hasValidData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">No valid campaign data available</p>
          <p className="text-sm text-muted-foreground mt-2">
            Please check your data format and try again
          </p>
        </div>
      </div>
    );
  }

  return (
    <DashboardRefactored
      data={processedData}
      hideCharts={hideCharts}
      useGlobalFilters={true} // Assume using global filters
      showDailyTotalsTable={showDailyTotalsTable}
      hideDashboardSparkCharts={hideDashboardSparkCharts}
      customBarMetric={customBarMetric}
      customLineMetric={customLineMetric}
      initialTab="display"
      onTabChange={onTabChange}
      contractTermsData={contractTermsData}
    />
  );
};

export default DashboardWrapperRefactored;