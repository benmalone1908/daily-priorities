import { Button } from "@/components/ui/button";
import { ZoomOut, RotateCcw } from "lucide-react";
import { ZoomState } from "@/hooks/useHealthScatterPlot";

interface HealthScatterControlsProps {
  zoomState: ZoomState;
  onZoomOut: () => void;
  onReset: () => void;
}

export const HealthScatterControls = ({
  zoomState,
  onZoomOut,
  onReset
}: HealthScatterControlsProps) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">
          {zoomState.level === 0 ? "Full View" : `Zoom Level ${zoomState.level}`}
        </span>
        {zoomState.level > 0 && (
          <span className="text-xs text-gray-500">
            ({zoomState.xMin.toFixed(0)}-{zoomState.xMax.toFixed(0)}%, {zoomState.yMin.toFixed(1)}-{zoomState.yMax.toFixed(1)})
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onZoomOut}
          disabled={zoomState.level === 0}
          className="flex items-center gap-1"
        >
          <ZoomOut className="h-3 w-3" />
          Zoom Out
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          disabled={zoomState.level === 0}
          className="flex items-center gap-1"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>
      </div>
    </div>
  );
};