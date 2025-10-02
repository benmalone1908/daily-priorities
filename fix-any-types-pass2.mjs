#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';

const files = [
  'src/components/GlobalFilters.tsx',
  'src/components/MetricCard.tsx',
  'src/components/Dashboard.tsx',
  'src/components/DashboardProxy.tsx',
  'src/components/DashboardWrapper.tsx',
  'src/components/DashboardSparkCharts.tsx',
  'src/components/DailyTotalsTable.tsx',
  'src/components/CustomReportBuilder.tsx',
  'src/components/CampaignSparkCharts.tsx',
  'src/components/StatusTab.tsx',
  'src/components/NotificationsTab.tsx',
  'src/components/UnifiedUploadModal.tsx',
  'src/components/QuadrantZoomModal.tsx',
  'src/components/pdf/ChartInstanceConfigPanel.tsx',
  'src/components/pdf/DataProcessingEngine.ts',
  'src/components/pdf/EnhancedPdfExportModal.tsx',
  'src/components/pdf/StreamlinedPdfExportModal.tsx',
  'src/components/ui/enhanced-pdf-export-button.tsx',
  'src/components/ui/streamlined-pdf-export-button.tsx',
  'src/components/charts/HealthScatterChart.tsx',
  'src/components/dashboard/MetricCards.tsx',
  'src/components/reports/SparkChartComponent.tsx',
  'src/components/sparkcharts/CampaignSparkCard.tsx',
  'src/hooks/useCombinedMetrics.ts',
  'src/hooks/useCustomReportBuilder.ts',
  'src/hooks/useDashboardDataProcessing.ts',
  'src/hooks/useDashboardState.ts',
  'src/hooks/useDataTable.ts',
  'src/hooks/useHealthScatterPlot.ts',
  'src/hooks/useSparkChartsData.ts',
  'src/pages/Index.tsx',
  'src/pages/CampaignDetailPage.tsx',
];

const basePath = '/Users/benmalone/Claude Projects/campaign-trends/';

// More specific patterns for second pass
const complexFixes = [
  // campaigns: any[] -> campaigns: string[]
  { pattern: /campaigns:\s*any\[\]/g, replacement: 'campaigns: string[]' },

  // advertisers: any[] -> advertisers: string[]
  { pattern: /advertisers:\s*any\[\]/g, replacement: 'advertisers: string[]' },

  // agencies: any[] -> agencies: string[]
  { pattern: /agencies:\s*any\[\]/g, replacement: 'agencies: string[]' },

  // contractTermsData: any[] -> contractTermsData: ContractTermsRow[]
  { pattern: /contractTermsData:\s*any\[\]/g, replacement: 'contractTermsData: ContractTermsRow[]' },

  // onDataUpdate: (data: any[]) -> onDataUpdate: (data: CampaignDataRow[])
  { pattern: /onDataUpdate:\s*\(data:\s*any\[\]\)/g, replacement: 'onDataUpdate: (data: CampaignDataRow[])' },

  // setData: (data: any[]) -> setData: (data: CampaignDataRow[])
  { pattern: /setData:\s*\(data:\s*any\[\]\)/g, replacement: 'setData: (data: CampaignDataRow[])' },

  // (prev: any[]) -> (prev: CampaignDataRow[])
  { pattern: /\(prev:\s*any\[\]\)/g, replacement: '(prev: CampaignDataRow[])' },

  // campaignData: any[] -> campaignData: CampaignDataRow[]
  { pattern: /campaignData:\s*any\[\]/g, replacement: 'campaignData: CampaignDataRow[]' },

  // deliveryData: any[] -> deliveryData: CampaignDataRow[]
  { pattern: /deliveryData:\s*any\[\]/g, replacement: 'deliveryData: CampaignDataRow[]' },

  // healthData: any[] -> healthData: CampaignHealthData[]
  { pattern: /healthData:\s*any\[\]/g, replacement: 'healthData: CampaignHealthData[]' },

  // chartData: any[] -> chartData: unknown[]
  { pattern: /chartData:\s*any\[\]/g, replacement: 'chartData: unknown[]' },

  // processedData: any[] -> processedData: CampaignDataRow[]
  { pattern: /processedData:\s*any\[\]/g, replacement: 'processedData: CampaignDataRow[]' },

  // filteredData: any[] -> filteredData: CampaignDataRow[]
  { pattern: /filteredData:\s*any\[\]/g, replacement: 'filteredData: CampaignDataRow[]' },

  // options: any[] -> options: unknown[]
  { pattern: /options:\s*any\[\]/g, replacement: 'options: unknown[]' },

  // (e: any) -> (e: React.ChangeEvent<HTMLInputElement>)
  { pattern: /\(e:\s*any\)\s*=>/g, replacement: '(e: React.ChangeEvent<HTMLInputElement>) =>' },

  // : any | null -> : unknown | null
  { pattern: /:\s*any\s*\|\s*null/g, replacement: ': unknown | null' },

  // : any | undefined -> : unknown | undefined
  { pattern: /:\s*any\s*\|\s*undefined/g, replacement: ': unknown | undefined' },

  // <any> -> <unknown>
  { pattern: /<any>/g, replacement: '<unknown>' },

  // (error: any) -> (error: unknown)
  { pattern: /\(error:\s*any\)/g, replacement: '(error: unknown)' },

  // catch (error: any) -> catch (error: unknown)
  { pattern: /catch\s*\(\s*error:\s*any\s*\)/g, replacement: 'catch (error: unknown)' },

  // Function parameters
  { pattern: /onClick:\s*\(\.\.\.\w+:\s*any\[\]\)\s*=>/g, replacement: 'onClick: (...args: unknown[]) =>' },
  { pattern: /onChange:\s*\(\.\.\.\w+:\s*any\[\]\)\s*=>/g, replacement: 'onChange: (...args: unknown[]) =>' },
];

function ensureImports(content, filename) {
  const neededImports = new Set();

  if (content.includes('CampaignDataRow') && !content.includes("import { CampaignDataRow }") && !content.includes("import type { CampaignDataRow }")) {
    neededImports.add('CampaignDataRow');
  }

  if (content.includes('ContractTermsRow') && !content.includes("import { ContractTermsRow }") && !content.includes("import type { ContractTermsRow }")) {
    neededImports.add('ContractTermsRow');
  }

  if (content.includes('CampaignHealthData') && !content.includes("import { CampaignHealthData }") && !content.includes("import type { CampaignHealthData }")) {
    neededImports.add('CampaignHealthData');
  }

  if (neededImports.size === 0) {
    return content;
  }

  // Don't add to type definition files
  if (filename.includes('/types/')) {
    return content;
  }

  // Find first import statement
  const importMatch = content.match(/^import\s/m);
  if (importMatch) {
    const importIndex = importMatch.index;
    let insertion = '';

    if (neededImports.has('CampaignDataRow') || neededImports.has('ProcessedCampaignData')) {
      insertion += "import { CampaignDataRow } from '@/types/campaign';\n";
    }
    if (neededImports.has('ContractTermsRow')) {
      insertion += "import { ContractTermsRow } from '@/types/dashboard';\n";
    }
    if (neededImports.has('CampaignHealthData')) {
      insertion += "import { CampaignHealthData } from '@/utils/campaignHealthScoring';\n";
    }

    return content.slice(0, importIndex) + insertion + content.slice(importIndex);
  }

  return content;
}

function main() {
  let totalChanges = 0;
  let filesChanged = 0;

  for (const file of files) {
    const fullPath = basePath + file;
    try {
      let content = readFileSync(fullPath, 'utf8');
      const originalContent = content;
      let fileChanges = 0;

      // Apply all complex fixes
      for (const fix of complexFixes) {
        const matches = content.match(fix.pattern);
        if (matches) {
          content = content.replace(fix.pattern, fix.replacement);
          fileChanges += matches.length;
        }
      }

      // Add imports if needed
      if (fileChanges > 0) {
        content = ensureImports(content, file);
      }

      if (content !== originalContent) {
        writeFileSync(fullPath, content, 'utf8');
        filesChanged++;
        totalChanges += fileChanges;
        console.log(`Fixed ${fileChanges} issues in ${file}`);
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  }

  console.log(`\nTotal: Fixed ${totalChanges} issues across ${filesChanged} files`);
}

main();
