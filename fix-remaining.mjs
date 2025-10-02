#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

const basePath = '/Users/benmalone/Claude Projects/campaign-trends/';

// Get list of files with errors
let lintOutput;
try {
  lintOutput = execSync('npm run lint 2>&1', { cwd: basePath, encoding: 'utf8' });
} catch (error) {
  // Lint exits with error code when there are linting errors
  lintOutput = error.stdout + error.stderr;
}
const errorLines = lintOutput.split('\n').filter(line => line.includes('Unexpected any'));

// Extract file paths
const filesWithErrors = new Set();
let currentFile = '';
for (const line of lintOutput.split('\n')) {
  if (line.includes('.tsx') || line.includes('.ts')) {
    if (line.includes('/src/')) {
      currentFile = line.trim().split(':')[0].replace(basePath, '');
    }
  } else if (line.includes('Unexpected any') && currentFile) {
    filesWithErrors.add(currentFile);
  }
}

console.log(`Found ${filesWithErrors.size} files with remaining errors`);

// Additional targeted fixes for edge cases
const edgeCaseFixes = [
  // Interface props
  { pattern: /data:\s*any\s*;/g, replacement: 'data: CampaignDataRow[];' },
  { pattern: /campaigns:\s*any\s*;/g, replacement: 'campaigns: string[];' },
  { pattern: /advertisers:\s*any\s*;/g, replacement: 'advertisers: string[];' },
  { pattern: /agencies:\s*any\s*;/g, replacement: 'agencies: string[];' },
  { pattern: /contractTermsData:\s*any\s*;/g, replacement: 'contractTermsData: ContractTermsRow[];' },

  // setState functions
  { pattern: /setData:\s*Dispatch<SetStateAction<any\[\]>>/g, replacement: 'setData: Dispatch<SetStateAction<CampaignDataRow[]>>' },
  { pattern: /setContractTermsData:\s*Dispatch<SetStateAction<any\[\]>>/g, replacement: 'setContractTermsData: Dispatch<SetStateAction<ContractTermsRow[]>>' },
  { pattern: /setCampaigns:\s*Dispatch<SetStateAction<any\[\]>>/g, replacement: 'setCampaigns: Dispatch<SetStateAction<string[]>>' },
  { pattern: /setAdvertisers:\s*Dispatch<SetStateAction<any\[\]>>/g, replacement: 'setAdvertisers: Dispatch<SetStateAction<string[]>>' },
  { pattern: /setAgencies:\s*Dispatch<SetStateAction<any\[\]>>/g, replacement: 'setAgencies: Dispatch<SetStateAction<string[]>>' },

  // Function signatures
  { pattern: /onUpdate:\s*\(\s*data:\s*any\[\]\s*\)\s*=>/g, replacement: 'onUpdate: (data: CampaignDataRow[]) =>' },
  { pattern: /onData(Update|Change):\s*\(\s*data:\s*any\[\]\s*\)\s*=>/g, replacement: 'onData$1: (data: CampaignDataRow[]) =>' },

  // Callback props
  { pattern: /onCampaignsChange:\s*\(\s*campaigns:\s*any\[\]\s*\)\s*=>/g, replacement: 'onCampaignsChange: (campaigns: string[]) =>' },
  { pattern: /onAdvertisersChange:\s*\(\s*advertisers:\s*any\[\]\s*\)\s*=>/g, replacement: 'onAdvertisersChange: (advertisers: string[]) =>' },
  { pattern: /onAgenciesChange:\s*\(\s*agencies:\s*any\[\]\s*\)\s*=>/g, replacement: 'onAgenciesChange: (agencies: string[]) =>' },

  // Array types in objects
  { pattern: /\{\s*data:\s*any\[\]/g, replacement: '{ data: CampaignDataRow[]' },
  { pattern: /\{\s*campaigns:\s*any\[\]/g, replacement: '{ campaigns: string[]' },
  { pattern: /\{\s*advertisers:\s*any\[\]/g, replacement: '{ advertisers: string[]' },
  { pattern: /\{\s*agencies:\s*any\[\]/g, replacement: '{ agencies: string[]' },

  // Generic types
  { pattern: /Map<string,\s*any>/g, replacement: 'Map<string, unknown>' },
  { pattern: /Set<any>/g, replacement: 'Set<unknown>' },
  { pattern: /Promise<any>/g, replacement: 'Promise<unknown>' },

  // Props destructuring
  { pattern: /\(\s*\{\s*data,/g, replacement: '({ data,' }, // Just for context - actual fix below

  // React event handlers - more specific
  { pattern: /\(event:\s*any\)\s*=>\s*\{/g, replacement: '(event: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {' },

  // Remaining anys in function params
  { pattern: /,\s*options:\s*any\s*\)/g, replacement: ', options: unknown)' },
  { pattern: /,\s*config:\s*any\s*\)/g, replacement: ', config: unknown)' },
  { pattern: /,\s*params:\s*any\s*\)/g, replacement: ', params: unknown)' },

  // Array.from or array methods
  { pattern: /Array\.from\((\w+)\)\s*as\s*any/g, replacement: 'Array.from($1) as unknown' },

  // Type assertions
  { pattern: /as\s*any\[\]/g, replacement: 'as unknown[]' },
  { pattern: /\[\]\s*as\s*any/g, replacement: '[] as unknown' },
];

let totalFixed = 0;
let filesFixed = 0;

for (const file of filesWithErrors) {
  const fullPath = basePath + file;

  if (!existsSync(fullPath)) {
    console.log(`Skipping ${file} - file not found`);
    continue;
  }

  try {
    let content = readFileSync(fullPath, 'utf8');
    const original = content;
    let fixCount = 0;

    // Apply all edge case fixes
    for (const fix of edgeCaseFixes) {
      const matches = content.match(fix.pattern);
      if (matches) {
        content = content.replace(fix.pattern, fix.replacement);
        fixCount += matches.length;
      }
    }

    if (content !== original) {
      // Ensure imports
      if (content.includes('CampaignDataRow') && !content.match(/import.*CampaignDataRow/)) {
        const importMatch = content.match(/^import\s/m);
        if (importMatch) {
          content = content.slice(0, importMatch.index) +
                    "import { CampaignDataRow } from '@/types/campaign';\n" +
                    content.slice(importMatch.index);
        }
      }

      if (content.includes('ContractTermsRow') && !content.match(/import.*ContractTermsRow/)) {
        const importMatch = content.match(/^import\s/m);
        if (importMatch) {
          content = content.slice(0, importMatch.index) +
                    "import { ContractTermsRow } from '@/types/dashboard';\n" +
                    content.slice(importMatch.index);
        }
      }

      writeFileSync(fullPath, content, 'utf8');
      console.log(`Fixed ${fixCount} issues in ${file}`);
      filesFixed++;
      totalFixed += fixCount;
    }
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
}

console.log(`\nTotal: Fixed ${totalFixed} issues across ${filesFixed} files`);
