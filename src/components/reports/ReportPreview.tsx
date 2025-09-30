import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, FileDown } from 'lucide-react';
import { ChartConfig, ReportBuilderState } from '@/hooks/useCustomReportBuilder';

// Chart component imports
import SparkChartComponent from '@/components/reports/SparkChartComponent';
import CampaignPerformanceComponent from '@/components/reports/CampaignPerformanceComponent';
import WeeklyComparisonComponent from '@/components/reports/WeeklyComparisonComponent';

interface ReportPreviewProps {
  state: ReportBuilderState;
  groupedCharts: { [key: string]: ChartConfig[] };
  data: any[];
  onTogglePanel: () => void;
}

export const ReportPreview = ({
  state,
  groupedCharts,
  data,
  onTogglePanel
}: ReportPreviewProps) => {

  const renderChart = (chart: ChartConfig) => {
    const chartComponent = (() => {
      switch (chart.category) {
        case 'spark-charts':
          return (
            <SparkChartComponent
              data={data}
              metric={chart.type}
              dateRange={chart.dateRange}
              title={chart.title}
              simplified={true}
            />
          );
        case 'campaign-performance':
          return (
            <CampaignPerformanceComponent
              data={data}
              mode={chart.subOptions?.mode || 'display'}
              format={chart.subOptions?.format || 'by-date'}
              dateRange={chart.dateRange}
              title={chart.title}
            />
          );
        case 'weekly-comparison':
          return (
            <WeeklyComparisonComponent
              data={data}
              period={chart.type}
              dateRange={chart.dateRange}
              title={chart.title}
            />
          );
        default:
          return <div>Unknown chart type</div>;
      }
    })();

    return (
      <div key={chart.id} id={`chart-${chart.id}`} className="w-full overflow-hidden">
        {chartComponent}
      </div>
    );
  };

  const renderSparkChartGrid = (sparkCharts: ChartConfig[]) => {
    const count = sparkCharts.length;
    let gridCols = '';

    if (count === 1) gridCols = 'grid-cols-1';
    else if (count === 2) gridCols = 'grid-cols-2';
    else if (count === 3) gridCols = 'grid-cols-3';
    else if (count === 4) gridCols = 'grid-cols-2';
    else if (count >= 5) gridCols = 'grid-cols-3';

    return (
      <div className={`grid ${gridCols} gap-4`}>
        {sparkCharts.map(chart => renderChart(chart))}
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Collapse Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onTogglePanel}
        className="absolute -left-3 top-4 z-10 h-8 w-8 p-0 border-2 bg-white shadow-md hover:bg-gray-50"
      >
        {state.isLeftPanelCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Report Preview</CardTitle>
          {state.charts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Add charts to see the preview
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div id="report-preview" className="space-y-6 bg-white p-6 rounded-lg border w-full overflow-hidden">
            {state.charts.length > 0 ? (
              <>
                {/* Report Header */}
                <div className="text-center border-b pb-4">
                  <h1 className="text-2xl font-bold">{state.reportTitle}</h1>
                  <p className="text-muted-foreground">
                    Generated on {new Date().toLocaleDateString()}
                  </p>
                </div>

                {/* Charts */}
                <div className="space-y-8">
                  {/* Render spark charts in grid layout */}
                  {groupedCharts['spark-charts'] && groupedCharts['spark-charts'].length > 0 && (
                    <div id="section-spark-charts">
                      <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
                      {renderSparkChartGrid(groupedCharts['spark-charts'])}
                    </div>
                  )}

                  {/* Render campaign performance charts */}
                  {groupedCharts['campaign-performance'] && groupedCharts['campaign-performance'].map(chart => (
                    <div key={chart.id} id="section-campaign-performance">
                      {renderChart(chart)}
                    </div>
                  ))}

                  {/* Render weekly comparison charts */}
                  {groupedCharts['weekly-comparison'] && groupedCharts['weekly-comparison'].map(chart => (
                    <div key={chart.id} id="section-weekly-comparison">
                      {renderChart(chart)}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileDown className="mx-auto h-12 w-12 mb-4" />
                <p>No charts added yet</p>
                <p className="text-sm">Add charts from the panel on the left to build your report</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};