#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

// Patterns to fix across all files
const fixes = [
  // Props interfaces with data: any[] -> data: CampaignDataRow[]
  { pattern: /data:\s*any\[\]/g, replacement: 'data: CampaignDataRow[]' },

  // setXxx(data: any[]) -> setXxx(data: CampaignDataRow[])
  { pattern: /\(data:\s*any\[\]\)/g, replacement: '(data: CampaignDataRow[])' },

  // : any[] = [] -> : CampaignDataRow[] = []
  { pattern: /:\s*any\[\]\s*=\s*\[\]/g, replacement: ': CampaignDataRow[] = []' },

  // useState<any[]> -> useState<CampaignDataRow[]>
  { pattern: /useState<any\[\]>/g, replacement: 'useState<CampaignDataRow[]>' },

  // Record<string, any> -> Record<string, unknown>
  { pattern: /Record<string,\s*any>/g, replacement: 'Record<string, unknown>' },

  // (row: any) -> (row: CampaignDataRow)
  { pattern: /\(row:\s*any\)/g, replacement: '(row: CampaignDataRow)' },

  // (item: any) -> (item: CampaignDataRow)
  { pattern: /\(item:\s*any\)/g, replacement: '(item: CampaignDataRow)' },

  // value: any -> value: unknown
  { pattern: /value:\s*any([,\)])/g, replacement: 'value: unknown$1' },

  // : any, -> : unknown,
  { pattern: /:\s*any,/g, replacement: ': unknown,' },

  // : any; -> : unknown;
  { pattern: /:\s*any;/g, replacement: ': unknown;' },

  // : any = -> : unknown =
  { pattern: /:\s*any\s*=/g, replacement: ': unknown =' },
];

// Add import if not present
function ensureCampaignDataRowImport(content, filename) {
  if (!content.includes('CampaignDataRow') || content.includes("import { CampaignDataRow }") || content.includes("import type { CampaignDataRow }")) {
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
    const insertion = "import { CampaignDataRow } from '@/types/campaign';\n";
    return content.slice(0, importIndex) + insertion + content.slice(importIndex);
  }

  // No imports, add at top after any comments
  const lines = content.split('\n');
  let insertIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*')) {
      insertIndex = i;
      break;
    }
  }
  lines.splice(insertIndex, 0, "import { CampaignDataRow } from '@/types/campaign';");
  return lines.join('\n');
}

async function main() {
  // Get all TypeScript/TSX files
  const files = await glob('src/**/*.{ts,tsx}', {
    cwd: '/Users/benmalone/Claude Projects/campaign-trends',
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts']
  });

  console.log(`Found ${files.length} files to process`);

  let totalChanges = 0;
  let filesChanged = 0;

  for (const file of files) {
    let content = readFileSync(file, 'utf8');
    const originalContent = content;
    let fileChanges = 0;

    // Apply all fixes
    for (const fix of fixes) {
      const matches = content.match(fix.pattern);
      if (matches) {
        content = content.replace(fix.pattern, fix.replacement);
        fileChanges += matches.length;
      }
    }

    // Add import if needed
    if (fileChanges > 0) {
      content = ensureCampaignDataRowImport(content, file);
    }

    if (content !== originalContent) {
      writeFileSync(file, content, 'utf8');
      filesChanged++;
      totalChanges += fileChanges;
      console.log(`Fixed ${fileChanges} issues in ${file.replace('/Users/benmalone/Claude Projects/campaign-trends/', '')}`);
    }
  }

  console.log(`\nTotal: Fixed ${totalChanges} issues across ${filesChanged} files`);
}

main().catch(console.error);
