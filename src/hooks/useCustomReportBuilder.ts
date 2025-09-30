import { useState, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface ChartConfig {
  id: string;
  category: 'spark-charts' | 'campaign-performance' | 'weekly-comparison';
  type: string;
  subOptions?: Record<string, string>;
  dateRange: DateRange;
  title: string;
}

export interface CustomReportBuilderProps {
  data: any[];
  dateRange: DateRange;
  pacingData?: any[];
  contractTermsData?: any[];
}

export interface ReportBuilderState {
  charts: ChartConfig[];
  isExporting: boolean;
  reportTitle: string;
  isLeftPanelCollapsed: boolean;
  newChart: Partial<ChartConfig>;
}

export interface ReportBuilderActions {
  addChart: () => void;
  removeChart: (id: string) => void;
  exportToPDF: () => Promise<void>;
  setReportTitle: (title: string) => void;
  setIsLeftPanelCollapsed: (collapsed: boolean) => void;
  setNewChart: React.Dispatch<React.SetStateAction<Partial<ChartConfig>>>;
}

// Available chart types configuration
export const chartTypes = {
  'spark-charts': {
    name: 'Spark Charts',
    options: [
      { value: 'impressions', label: 'Impressions' },
      { value: 'clicks', label: 'Clicks' },
      { value: 'ctr', label: 'CTR' },
      { value: 'transactions', label: 'Transactions' },
      { value: 'revenue', label: 'Attributed Sales' },
      { value: 'roas', label: 'ROAS' }
    ]
  },
  'campaign-performance': {
    name: 'Campaign Performance',
    options: [
      { value: 'combined', label: 'Combined Chart' }
    ],
    subOptions: {
      mode: [
        { value: 'display', label: 'Display' },
        { value: 'attribution', label: 'Attribution' }
      ],
      format: [
        { value: 'by-date', label: 'By Date' },
        { value: 'by-day-of-week', label: 'By Day of Week' }
      ]
    }
  },
  'weekly-comparison': {
    name: 'Weekly Comparison',
    options: [
      { value: '7-day', label: '7-Day Comparison' },
      { value: '14-day', label: '14-Day Comparison' },
      { value: '30-day', label: '30-Day Comparison' }
    ]
  }
};

/**
 * Custom hook for managing custom report builder state and business logic
 * Extracted from CustomReportBuilder.tsx for better maintainability
 */
export const useCustomReportBuilder = ({
  data,
  dateRange,
  pacingData,
  contractTermsData
}: CustomReportBuilderProps) => {

  // State management
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [reportTitle, setReportTitle] = useState('Campaign Performance Report');
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [newChart, setNewChart] = useState<Partial<ChartConfig>>({
    dateRange: dateRange
  });

  // Get available date range from data
  const availableDateRange = useMemo(() => {
    const dates = data
      .map(row => {
        const dateStr = row.DATE || row.date;
        if (!dateStr) return null;
        return new Date(dateStr);
      })
      .filter(Boolean) as Date[];

    if (dates.length === 0) return { min: new Date(), max: new Date() };

    return {
      min: new Date(Math.min(...dates.map(d => d.getTime()))),
      max: new Date(Math.max(...dates.map(d => d.getTime())))
    };
  }, [data]);

  // Group charts by category for better layout
  const groupedCharts = useMemo(() => {
    const groups: { [key: string]: ChartConfig[] } = {};
    charts.forEach(chart => {
      if (!groups[chart.category]) {
        groups[chart.category] = [];
      }
      groups[chart.category].push(chart);
    });
    return groups;
  }, [charts]);

  // Actions
  const addChart = () => {
    if (!newChart.category || !newChart.type) {
      toast.error('Please select chart category and type');
      return;
    }

    const chartType = chartTypes[newChart.category as keyof typeof chartTypes];
    const typeOption = chartType.options.find(opt => opt.value === newChart.type);

    let title = typeOption?.label || '';
    if (newChart.subOptions) {
      Object.entries(newChart.subOptions).forEach(([key, value]) => {
        const subOption = chartType.subOptions?.[key]?.find(opt => opt.value === value);
        if (subOption) {
          title += ` - ${subOption.label}`;
        }
      });
    }

    const chart: ChartConfig = {
      id: Date.now().toString(),
      category: newChart.category as ChartConfig['category'],
      type: newChart.type!,
      subOptions: newChart.subOptions,
      dateRange: newChart.dateRange || dateRange,
      title
    };

    setCharts(prev => [...prev, chart]);

    // Reset new chart form
    setNewChart({ dateRange: dateRange });

    toast.success('Chart added to report');
  };

  const removeChart = (id: string) => {
    setCharts(prev => prev.filter(chart => chart.id !== id));
    toast.success('Chart removed from report');
  };

  const exportToPDF = async () => {
    if (charts.length === 0) {
      toast.error('Please add at least one chart to export');
      return;
    }

    setIsExporting(true);

    try {
      const reportElement = document.getElementById('report-preview');
      if (!reportElement) {
        throw new Error('Report preview not found');
      }

      // Capture the entire report preview area
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: reportElement.offsetWidth,
        height: reportElement.offsetHeight
      });

      // Create PDF with custom dimensions to fit content
      const imgWidth = canvas.width / 2; // Scale down from scale: 2
      const imgHeight = canvas.height / 2;

      // Convert pixels to mm (assuming 96 DPI)
      const mmWidth = (imgWidth * 25.4) / 96;
      const mmHeight = (imgHeight * 25.4) / 96;

      // Create PDF with custom size to fit the content
      const pdf = new jsPDF({
        orientation: mmWidth > mmHeight ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [mmWidth + 20, mmHeight + 20] // Add 20mm margin (10mm each side)
      });

      // Add the image to fill the page
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 10, 10, mmWidth, mmHeight);

      // Download the PDF
      const filename = `${reportTitle.toLowerCase().replace(/\s+/g, '-')}.pdf`;
      pdf.save(filename);
      toast.success('PDF exported successfully');

    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const state: ReportBuilderState = {
    charts,
    isExporting,
    reportTitle,
    isLeftPanelCollapsed,
    newChart
  };

  const actions: ReportBuilderActions = {
    addChart,
    removeChart,
    exportToPDF,
    setReportTitle,
    setIsLeftPanelCollapsed,
    setNewChart
  };

  return {
    state,
    actions,
    data: {
      availableDateRange,
      groupedCharts
    }
  };
};