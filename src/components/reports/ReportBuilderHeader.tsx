import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { ReportBuilderState, ReportBuilderActions } from '@/hooks/useCustomReportBuilder';

interface ReportBuilderHeaderProps {
  state: ReportBuilderState;
  actions: ReportBuilderActions;
}

export const ReportBuilderHeader = ({
  state,
  actions
}: ReportBuilderHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold">Custom Report Builder</h2>
        <p className="text-muted-foreground">
          Build your custom report by adding charts and configuring their settings
        </p>
      </div>
      <Button
        onClick={actions.exportToPDF}
        disabled={state.isExporting || state.charts.length === 0}
        className="flex items-center gap-2"
      >
        <FileDown className="h-4 w-4" />
        {state.isExporting ? 'Exporting...' : 'Export PDF'}
      </Button>
    </div>
  );
};