import { CampaignHealthData } from "@/utils/campaignHealthScoring";
import QuadrantZoomModal from "./QuadrantZoomModal";

// Import our custom hook and components
import { useHealthScatterPlot } from "@/hooks/useHealthScatterPlot";
import { HealthScatterChart } from "@/components/charts/HealthScatterChart";
import { HealthScatterControls } from "@/components/charts/HealthScatterControls";
import { HealthScatterTooltip } from "@/components/charts/HealthScatterTooltip";

interface CampaignHealthScatterPlotProps {
  healthData: CampaignHealthData[];
}

/**
 * Refactored CampaignHealthScatterPlot component - reduced from 572 lines
 * Uses extracted custom hook and modular components for better maintainability
 */
const CampaignHealthScatterPlot = ({ healthData }: CampaignHealthScatterPlotProps) => {
  // Use our custom hook for all data processing and state management
  const { state, actions, data, chartContainerRef } = useHealthScatterPlot({ healthData });

  if (healthData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No campaign health data available for plotting
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Zoom Controls */}
      <HealthScatterControls
        zoomState={state.zoomState}
        onZoomOut={actions.handleZoomOut}
        onReset={actions.handleReset}
      />

      <div className="w-full border border-gray-200 rounded-lg p-4" ref={chartContainerRef}>
        <HealthScatterChart
          chartData={data.chartData}
          zoomState={state.zoomState}
          onScatterClick={actions.handleScatterClick}
          onQuadrantClick={actions.handleQuadrantClick}
        />
      </div>

      {/* Multi-Campaign Tooltip */}
      <HealthScatterTooltip
        tooltipState={state.tooltipState}
        onClose={actions.closeTooltip}
      />

      {/* Help text */}
      {state.zoomState.level === 0 && (
        <div className="mt-2 text-center">
          <p className="text-sm text-gray-500">
            Click on any point to view campaign details • Click on quadrants to zoom in
          </p>
        </div>
      )}

      {/* Quadrant Zoom Modal */}
      <QuadrantZoomModal
        open={state.modalState.open}
        onOpenChange={(open) => actions.setModalState(prev => ({ ...prev, open }))}
        healthData={healthData}
        xMin={state.modalState.xMin}
        xMax={state.modalState.xMax}
        yMin={state.modalState.yMin}
        yMax={state.modalState.yMax}
      />
    </div>
  );
};

export default CampaignHealthScatterPlot;