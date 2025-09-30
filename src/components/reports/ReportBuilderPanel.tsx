import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRange } from 'react-day-picker';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import DateRangePicker from '@/components/DateRangePicker';
import { ChartConfig, chartTypes, ReportBuilderState, ReportBuilderActions } from '@/hooks/useCustomReportBuilder';

interface ReportBuilderPanelProps {
  state: ReportBuilderState;
  actions: ReportBuilderActions;
  availableDateRange: { min: Date; max: Date };
  dateRange: DateRange;
}

export const ReportBuilderPanel = ({
  state,
  actions,
  availableDateRange,
  dateRange
}: ReportBuilderPanelProps) => {

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Report Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Report Title */}
          <div>
            <label className="text-sm font-medium">Report Title</label>
            <Input
              value={state.reportTitle}
              onChange={(e) => actions.setReportTitle(e.target.value)}
              placeholder="Enter report title..."
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Chart</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category Selection */}
          <div>
            <label className="text-sm font-medium">Chart Category</label>
            <Select
              value={state.newChart.category || ''}
              onValueChange={(value) => actions.setNewChart(prev => ({
                ...prev,
                category: value as ChartConfig['category'],
                type: undefined,
                subOptions: undefined
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(chartTypes).map(([key, category]) => (
                  <SelectItem key={key} value={key}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type Selection */}
          {state.newChart.category && (
            <div>
              <label className="text-sm font-medium">Chart Type</label>
              <Select
                value={state.newChart.type || ''}
                onValueChange={(value) => actions.setNewChart(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {chartTypes[state.newChart.category].options.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Sub-options */}
          {state.newChart.category && chartTypes[state.newChart.category].subOptions && (
            <div className="space-y-3">
              {Object.entries(chartTypes[state.newChart.category].subOptions!).map(([key, options]) => (
                <div key={key}>
                  <label className="text-sm font-medium capitalize">
                    {key.replace('-', ' ')}
                  </label>
                  <Select
                    value={state.newChart.subOptions?.[key] || ''}
                    onValueChange={(value) => actions.setNewChart(prev => ({
                      ...prev,
                      subOptions: { ...prev.subOptions, [key]: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${key.replace('-', ' ')}...`} />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}

          {/* Date Range Selection */}
          <div>
            <label className="text-sm font-medium">Date Range</label>
            <DateRangePicker
              dateRange={state.newChart.dateRange || dateRange}
              onDateRangeChange={(range) => actions.setNewChart(prev => ({ ...prev, dateRange: range }))}
              minDate={availableDateRange.min}
              maxDate={availableDateRange.max}
            />
          </div>

          <Button
            onClick={actions.addChart}
            disabled={!state.newChart.category || !state.newChart.type}
            className="w-full flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Chart
          </Button>
        </CardContent>
      </Card>

      {/* Charts List */}
      {state.charts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Report Charts ({state.charts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {state.charts.map((chart, index) => (
                <div
                  key={chart.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-sm">{chart.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {chart.dateRange.from?.toLocaleDateString()} - {chart.dateRange.to?.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => actions.removeChart(chart.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};