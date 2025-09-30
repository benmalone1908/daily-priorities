import { useState, useMemo, useRef, useEffect } from "react";
import { CampaignHealthData } from "@/utils/campaignHealthScoring";
import { calculateTooltipPosition, getTooltipZIndex } from "@/utils/tooltipPositioning";

export interface ZoomState {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  level: number;
}

export interface ModalState {
  open: boolean;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface TooltipState {
  visible: boolean;
  campaigns: CampaignHealthData[];
  x: number;
  y: number;
}

export interface HealthScatterPlotProps {
  healthData: CampaignHealthData[];
}

export interface HealthScatterPlotState {
  zoomState: ZoomState;
  modalState: ModalState;
  tooltipState: TooltipState;
}

export interface HealthScatterPlotActions {
  handleQuadrantClick: (xStart: number, xEnd: number, yStart: number, yEnd: number) => void;
  handleReset: () => void;
  handleZoomOut: () => void;
  handleScatterClick: (data: any, event: any) => void;
  closeTooltip: () => void;
  setModalState: React.Dispatch<React.SetStateAction<ModalState>>;
}

export interface ProcessedHealthData {
  chartData: any[];
  xTicks: number[];
  yTicks: number[];
}

/**
 * Custom hook for managing health scatter plot data processing and state
 * Extracted from CampaignHealthScatterPlot.tsx for better maintainability
 */
export const useHealthScatterPlot = ({ healthData }: HealthScatterPlotProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // State management
  const [zoomState, setZoomState] = useState<ZoomState>({
    xMin: 0,
    xMax: 100,
    yMin: 0,
    yMax: 10,
    level: 0
  });

  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    xMin: 0,
    xMax: 0,
    yMin: 0,
    yMax: 0
  });

  const [tooltipState, setTooltipState] = useState<TooltipState>({
    visible: false,
    campaigns: [],
    x: 0,
    y: 0
  });

  // Process chart data with coordinate grouping
  const chartData = useMemo(() => {
    // Group campaigns by their coordinates to detect overlaps
    const coordinateGroups = new Map<string, CampaignHealthData[]>();

    healthData.forEach(campaign => {
      const key = `${campaign.completionPercentage.toFixed(1)}-${campaign.healthScore.toFixed(1)}`;
      if (!coordinateGroups.has(key)) {
        coordinateGroups.set(key, []);
      }
      coordinateGroups.get(key)!.push(campaign);
    });

    return healthData.map(campaign => {
      const key = `${campaign.completionPercentage.toFixed(1)}-${campaign.healthScore.toFixed(1)}`;
      const groupSize = coordinateGroups.get(key)?.length || 1;

      return {
        x: campaign.completionPercentage,
        y: campaign.healthScore,
        name: campaign.campaignName,
        fill: getHealthColor(campaign.healthScore),
        campaignData: campaign,
        groupSize,
        isMultiple: groupSize > 1
      };
    });
  }, [healthData]);

  // Generate custom tick arrays based on current zoom level
  const xTicks = useMemo(() => {
    const ticks = [];
    const increment = zoomState.level === 0 ? 20 : (zoomState.xMax - zoomState.xMin) / 5;
    for (let i = zoomState.xMin; i <= zoomState.xMax; i += increment) {
      ticks.push(Math.round(i));
    }
    return ticks;
  }, [zoomState]);

  const yTicks = useMemo(() => {
    const ticks = [];
    const increment = zoomState.level === 0 ? 2 : (zoomState.yMax - zoomState.yMin) / 5;
    for (let i = zoomState.yMin; i <= zoomState.yMax; i += increment) {
      ticks.push(Math.round(i * 10) / 10); // Round to 1 decimal place
    }
    return ticks;
  }, [zoomState]);

  // Actions
  const handleQuadrantClick = (xStart: number, xEnd: number, yStart: number, yEnd: number) => {
    setModalState({
      open: true,
      xMin: xStart,
      xMax: xEnd,
      yMin: yStart,
      yMax: yEnd
    });
  };

  const handleReset = () => {
    setZoomState({
      xMin: 0,
      xMax: 100,
      yMin: 0,
      yMax: 10,
      level: 0
    });
  };

  const handleZoomOut = () => {
    if (zoomState.level > 0) {
      const xRange = zoomState.xMax - zoomState.xMin;
      const yRange = zoomState.yMax - zoomState.yMin;
      const newXMin = Math.max(0, zoomState.xMin - xRange * 0.5);
      const newXMax = Math.min(100, zoomState.xMax + xRange * 0.5);
      const newYMin = Math.max(0, zoomState.yMin - yRange * 0.5);
      const newYMax = Math.min(10, zoomState.yMax + yRange * 0.5);

      setZoomState({
        xMin: newXMin,
        xMax: newXMax,
        yMin: newYMin,
        yMax: newYMax,
        level: Math.max(0, zoomState.level - 1)
      });
    }
  };

  const handleScatterClick = (data: any, event: any) => {
    console.log('Scatter clicked:', data, event);
    event?.stopPropagation?.();

    if (event) {
      const clientX = event.clientX || event.nativeEvent?.clientX || 100;
      const clientY = event.clientY || event.nativeEvent?.clientY || 100;

      // Find matching campaigns
      const tolerance = 0.5;
      const matchingCampaigns = healthData.filter(campaign => {
        const xMatch = Math.abs(campaign.completionPercentage - data.x) <= tolerance;
        const yMatch = Math.abs(campaign.healthScore - data.y) <= tolerance;
        return xMatch && yMatch;
      });

      // Calculate optimal tooltip position with expanded dimensions to match modal
      const tooltipDimensions = {
        width: 480, // Larger width to match quadrant modal
        height: matchingCampaigns.length === 1 ? 250 : Math.min(300, matchingCampaigns.length * 50 + 80)
      };

      const position = calculateTooltipPosition(clientX, clientY, tooltipDimensions);

      setTooltipState({
        visible: true,
        campaigns: matchingCampaigns,
        x: position.x,
        y: position.y
      });
    }
  };

  const closeTooltip = () => {
    setTooltipState({
      visible: false,
      campaigns: [],
      x: 0,
      y: 0
    });
  };

  // Hide tooltip on scroll, but not when scrolling within the tooltip or modal
  useEffect(() => {
    if (!tooltipState.visible) return;

    const scrollHandler = (event: Event) => {
      // Don't close tooltip if scrolling within the tooltip itself
      const target = event.target as Element;
      const tooltipElement = document.querySelector('[data-tooltip-content]');

      // Check if the scroll event is coming from within the tooltip
      if (tooltipElement && (tooltipElement === target || tooltipElement.contains(target))) {
        return; // Don't close tooltip for internal scrolling
      }

      // Check if the scroll event is coming from within a modal dialog
      const modalDialog = document.querySelector('[role="dialog"]');
      if (modalDialog && (modalDialog === target || modalDialog.contains(target))) {
        return; // Don't close tooltip for modal scrolling
      }

      closeTooltip();
    };

    // Add scroll listeners to window and potential modal containers
    window.addEventListener('scroll', scrollHandler, true);

    return () => {
      window.removeEventListener('scroll', scrollHandler, true);
    };
  }, [tooltipState.visible]);

  const state: HealthScatterPlotState = {
    zoomState,
    modalState,
    tooltipState
  };

  const actions: HealthScatterPlotActions = {
    handleQuadrantClick,
    handleReset,
    handleZoomOut,
    handleScatterClick,
    closeTooltip,
    setModalState
  };

  const data: ProcessedHealthData = {
    chartData,
    xTicks,
    yTicks
  };

  return {
    state,
    actions,
    data,
    chartContainerRef
  };
};

// Helper function to get health color based on score
function getHealthColor(healthScore: number): string {
  if (healthScore >= 7) return "#22c55e"; // Green for healthy
  if (healthScore >= 4) return "#f59e0b"; // Yellow/Orange for warning
  return "#ef4444"; // Red for critical
}