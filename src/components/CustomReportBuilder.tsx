import React from 'react';
import { DateRange } from 'react-day-picker';

// Import our custom hook and components
import { useCustomReportBuilder, CustomReportBuilderProps } from '@/hooks/useCustomReportBuilder';
import { ReportBuilderHeader } from '@/components/reports/ReportBuilderHeader';
import { ReportBuilderPanel } from '@/components/reports/ReportBuilderPanel';
import { ReportPreview } from '@/components/reports/ReportPreview';

/**
 * Refactored CustomReportBuilder component - reduced from 538 lines
 * Uses extracted custom hook and modular components for better maintainability
 */
const CustomReportBuilder: React.FC<CustomReportBuilderProps> = ({
  data,
  dateRange,
  pacingData,
  contractTermsData
}) => {
  // Use our custom hook for all state management and business logic
  const { state, actions, data: hookData } = useCustomReportBuilder({
    data,
    dateRange,
    pacingData,
    contractTermsData
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <ReportBuilderHeader
        state={state}
        actions={actions}
      />

      <div className={`grid gap-6 relative ${state.isLeftPanelCollapsed ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
        {/* Chart Builder Panel */}
        <div className={`transition-all duration-300 space-y-4 ${state.isLeftPanelCollapsed ? 'hidden' : 'lg:col-span-1'}`}>
          <ReportBuilderPanel
            state={state}
            actions={actions}
            availableDateRange={hookData.availableDateRange}
            dateRange={dateRange}
          />
        </div>

        {/* Report Preview */}
        <div className={state.isLeftPanelCollapsed ? 'col-span-1' : 'lg:col-span-2'}>
          <ReportPreview
            state={state}
            groupedCharts={hookData.groupedCharts}
            data={data}
            onTogglePanel={() => actions.setIsLeftPanelCollapsed(!state.isLeftPanelCollapsed)}
          />
        </div>
      </div>
    </div>
  );
};

export default CustomReportBuilder;