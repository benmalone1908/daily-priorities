import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ReferenceLine, ReferenceArea, Cell } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { ZoomState } from "@/hooks/useHealthScatterPlot";

interface HealthScatterChartProps {
  chartData: any[];
  zoomState: ZoomState;
  onScatterClick: (data: any, event: any) => void;
  onQuadrantClick: (xStart: number, xEnd: number, yStart: number, yEnd: number) => void;
}

const chartConfig = {
  healthScore: {
    label: "Health Score",
  },
  completionPercentage: {
    label: "Completion %",
  },
};

export const HealthScatterChart = ({
  chartData,
  zoomState,
  onScatterClick,
  onQuadrantClick
}: HealthScatterChartProps) => {

  // Generate clickable ReferenceArea components for quadrants
  const generateQuadrantAreas = () => {
    const areas = [];

    if (zoomState.level === 0) {
      // Use actual axis increments: 20% for x-axis, 2 points for y-axis
      const xIncrements = [0, 20, 40, 60, 80, 100];
      const yIncrements = [0, 2, 4, 6, 8, 10];

      for (let i = 0; i < xIncrements.length - 1; i++) {
        for (let j = 0; j < yIncrements.length - 1; j++) {
          const xStart = xIncrements[i];
          const xEnd = xIncrements[i + 1];
          const yStart = yIncrements[j];
          const yEnd = yIncrements[j + 1];

          areas.push(
            <ReferenceArea
              key={`quadrant-${i}-${j}`}
              x1={xStart}
              x2={xEnd}
              y1={yStart}
              y2={yEnd}
              fill="transparent"
              stroke="rgba(59, 130, 246, 0.2)"
              strokeWidth={1}
              className="cursor-pointer hover:fill-blue-50 hover:fill-opacity-20 transition-all"
              onClick={() => onQuadrantClick(xStart, xEnd, yStart, yEnd)}
            />
          );
        }
      }
    } else {
      // For zoomed views, create 5x5 sub-quadrants
      const xStep = (zoomState.xMax - zoomState.xMin) / 5;
      const yStep = (zoomState.yMax - zoomState.yMin) / 5;

      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          const xStart = zoomState.xMin + i * xStep;
          const xEnd = zoomState.xMin + (i + 1) * xStep;
          const yStart = zoomState.yMin + j * yStep;
          const yEnd = zoomState.yMin + (j + 1) * yStep;

          areas.push(
            <ReferenceArea
              key={`quadrant-${i}-${j}`}
              x1={xStart}
              x2={xEnd}
              y1={yStart}
              y2={yEnd}
              fill="transparent"
              stroke="rgba(59, 130, 246, 0.2)"
              strokeWidth={1}
              className="cursor-pointer hover:fill-blue-50 hover:fill-opacity-20 transition-all"
              onClick={() => onQuadrantClick(xStart, xEnd, yStart, yEnd)}
            />
          );
        }
      }
    }
    return areas;
  };

  return (
    <ChartContainer config={chartConfig} className="w-full min-h-[400px]">
      <ScatterChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />

        {/* Quadrant Grid Lines */}
        {zoomState.level === 0 && (
          <>
            <ReferenceLine x={20} stroke="#e5e7eb" strokeDasharray="2 2" opacity={0.5} />
            <ReferenceLine x={40} stroke="#e5e7eb" strokeDasharray="2 2" opacity={0.5} />
            <ReferenceLine x={60} stroke="#e5e7eb" strokeDasharray="2 2" opacity={0.5} />
            <ReferenceLine x={80} stroke="#e5e7eb" strokeDasharray="2 2" opacity={0.5} />
            <ReferenceLine y={2} stroke="#e5e7eb" strokeDasharray="2 2" opacity={0.5} />
            <ReferenceLine y={4} stroke="#e5e7eb" strokeDasharray="2 2" opacity={0.5} />
            <ReferenceLine y={6} stroke="#e5e7eb" strokeDasharray="2 2" opacity={0.5} />
            <ReferenceLine y={8} stroke="#e5e7eb" strokeDasharray="2 2" opacity={0.5} />
          </>
        )}

        {/* Clickable Quadrant Areas */}
        {generateQuadrantAreas()}

        <XAxis
          type="number"
          dataKey="x"
          name="Completion %"
          domain={[zoomState.xMin, zoomState.xMax]}
          tick={{ fontSize: 12 }}
          label={{ value: 'Campaign Completion (%)', position: 'insideBottom', offset: -10 }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name="Health Score"
          domain={[zoomState.yMin, zoomState.yMax]}
          tick={{ fontSize: 12 }}
          label={{ value: 'Health Score', angle: -90, position: 'insideLeft' }}
        />

        <Scatter
          dataKey="y"
          className="cursor-pointer"
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.fill}
              onClick={(event) => onScatterClick(entry, event)}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ChartContainer>
  );
};