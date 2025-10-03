# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React-based Display Campaign Monitor application built with Vite, TypeScript, and shadcn/ui components. The application analyzes campaign performance data, tracks pacing metrics, and provides visualizations for campaign health monitoring.

## Development Commands

- **Start development server**: `npm run dev` (runs on port 8080)
- **Build for production**: `npm run build`
- **Build for development**: `npm run build:dev`
- **Lint code**: `npm run lint`
- **Preview production build**: `npm run preview`

## Technology Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Data Handling**: React Query, PapaParse for CSV processing
- **Routing**: React Router DOM
- **State Management**: React Context API
- **Form Handling**: React Hook Form with Zod validation

## Architecture Overview

### Main Application Structure

The app follows a component-based architecture with these key areas:

1. **Data Upload & Processing** (`src/pages/Index.tsx`): Handles CSV file uploads and data validation
2. **Dashboard Views** (`src/components/Dashboard*.tsx`): Multiple dashboard layouts for different data visualizations
3. **Campaign Analysis** (`src/components/Campaign*.tsx`): Campaign-specific components for health, pacing, and trends
4. **Charts & Visualizations** (`src/components/ui/chart.tsx`, various chart components): Built on Recharts
5. **Global State** (`src/contexts/CampaignFilterContext.tsx`): Manages campaign filtering and agency mappings

### Key Components

- **FileUpload**: Handles CSV data upload with validation
- **DashboardWrapper**: Main dashboard container with multiple chart types
- **CampaignSparkCharts**: Trend visualization for individual campaigns
- **PacingTable/PacingMetrics**: Campaign pacing analysis
- **CampaignHealthTab**: Health scoring and anomaly detection
- **GlobalFilters**: Hierarchical filtering (Agency → Advertiser → Campaign)

### Data Flow

1. CSV files are uploaded and parsed using PapaParse
2. Data is validated for required fields (DATE, CAMPAIGN ORDER NAME, IMPRESSIONS, CLICKS, REVENUE, SPEND)
3. Campaign names are parsed to extract agency and advertiser information using regex patterns
4. Data is filtered and aggregated for various visualizations
5. Context providers manage filtering state across components

## Campaign Name Parsing

The application uses complex regex patterns to extract agency and advertiser information from campaign names. Campaign names follow these formats:

- Standard: `2001367: HRB: District Cannabis-241217`
- Slash format: `2001569/2001963: MJ: Test Client-Campaign Name-250501`
- Awaiting IO: `Awaiting IO: PRP: Advertiser Name-Campaign Details`

Agency abbreviations are mapped to full names in `AGENCY_MAPPING` within `CampaignFilterContext.tsx`.

## File Organization

- **Components**: Organized by functionality (ui/, campaign-specific, charts)
- **Contexts**: Global state management
- **Utils**: Helper functions for colors, scoring, and formatting
- **Pages**: Route-level components
- **Hooks**: Custom React hooks

## Development Guidelines

### Data Handling
- All numeric fields are converted to numbers during data processing
- Dates are normalized to MM/DD/YYYY format
- Test campaigns are filtered out using keywords ('test', 'demo', 'draft') and 'TST' agency code

### Component Patterns
- Uses shadcn/ui component system with Tailwind CSS
- Charts use Recharts with custom styling and gradients
- Responsive design with mobile-first approach
- Extensive use of React hooks for state management

### Performance Considerations
- Uses `useMemo` for expensive calculations and filtering
- Implements virtual scrolling for large datasets
- Optimizes re-renders with proper dependency arrays

## Common Development Tasks

### Adding New Chart Types
1. Create component in appropriate subfolder
2. Follow existing Recharts patterns with gradients and tooltips
3. Implement responsive container and mobile-friendly styling
4. Add to dashboard layout with proper filtering integration

### Modifying Campaign Parsing
- Update regex patterns in `CampaignFilterContext.tsx`
- Add new agency mappings to `AGENCY_MAPPING`
- Test with various campaign name formats

### Adding New Metrics
1. Update data validation in upload handler
2. Add calculation logic in appropriate components
3. Create visualization components following existing patterns
4. Update TypeScript interfaces as needed

## File Upload Requirements

### Campaign Data CSV
Required columns: DATE, CAMPAIGN ORDER NAME, IMPRESSIONS, CLICKS, REVENUE, SPEND
Optional: TRANSACTIONS

### Pacing Data CSV  
Expected columns: Campaign, various pacing-related metrics

### Contract Terms CSV
Expected columns: Contract-related fields for health scoring

## Configuration Files

- **Vite**: `vite.config.ts` (includes path aliases `@/` → `src/`)
- **TypeScript**: `tsconfig.json` with relaxed settings for rapid development
- **ESLint**: `eslint.config.js` with React-specific rules
- **Tailwind**: `tailwind.config.ts` with custom animations and shadcn integration

## Debugging Guide

### Debugging React Prop Flow Issues

When props aren't flowing correctly between components, follow this systematic approach:

#### 1. **Identify the Component Chain First**
Map out the complete prop flow before adding any debug logs:
```
Parent → Child1 → Child2 → Child3 → TargetComponent
```

#### 2. **Add Parallel Logging at ALL Levels Immediately**
Instead of debugging incrementally, add console logs at every component in the chain at once:

```javascript
// In Parent component
console.log('[Parent] propName:', propValue);

// In Child1 component
console.log('[Child1] propName:', propValue);

// In Child2 component
console.log('[Child2] propName:', propValue);

// In TargetComponent
console.log('[TargetComponent] propName:', propValue);
```

This immediately reveals **exactly where** the value changes.

#### 3. **Check for the Classic React Bug Pattern**

When a prop has the correct value at parent but wrong value at child, the issue is almost always:

**Pattern A: Prop Not Destructured**
```typescript
// Props interface includes it
interface ComponentProps {
  dateRange?: DateRange;
  data: Data[];
}

// But function params don't destructure it ❌
function Component({ data }: ComponentProps) {
  // Prop is never extracted, so it's undefined
}

// Fix: Add to destructuring ✓
function Component({ data, dateRange }: ComponentProps) {
  // Now accessible
}
```

**Pattern B: Local Variable Shadows Prop**
```typescript
function Component({ data, dateRange }: ComponentProps) {
  // This overwrites the prop! ❌
  const dateRange = calculateFromData(data);

  // Fix: Use different variable name ✓
  const calculatedDateRange = dateRange || calculateFromData(data);
}
```

#### 4. **Search for Variable Reassignments**
When you find the component where the prop value changes:

```bash
# Search for variable assignments in the problem component
grep "const dateRange =" ComponentName.tsx
grep "let dateRange =" ComponentName.tsx
```

This quickly finds shadowing bugs like `const dateRange = dataDateRange()`.

#### 5. **Verify Three Things in Order**

For any prop that's not working:

1. ✓ Is the prop in the TypeScript interface?
2. ✓ Is it destructured in the function parameters?
3. ✓ Is there a local variable with the same name overwriting it?

### Common Debugging Pitfalls to Avoid

❌ **Don't debug bottom-up** - Starting at the deepest component and working backwards wastes time

✓ **Do debug top-down** - Start at the parent component and trace the prop flow downward

❌ **Don't add logs incrementally** - Adding one log, checking, adding another is slow

✓ **Do add logs in parallel** - Add logs at all levels simultaneously to see the complete flow

❌ **Don't follow red herrings** - If the console shows wrong data, focus on WHERE it becomes wrong

✓ **Do trust your console output** - If a value is wrong at a certain level, that's where the bug is

### Real Example: DateRange Not Extending Charts

**Problem**: Charts ending at last data date (9/8) instead of filter end date (10/2)

**Fast Solution Path**:
1. See `console.log('[useCombinedMetrics] dateRange:', dateRange)` shows Sep 9, not Oct 2
2. Add logs at every level: Index → CampaignManager → DashboardWrapper → Dashboard → Chart
3. Find Dashboard receives Oct 2 but chart gets Sep 9
4. Search Dashboard.tsx for `dateRange =`
5. Find `const dateRange = dataDateRange()` on line 1005 (overwrites prop!)
6. Check function params: `dateRange` prop not destructured
7. Fix: Add `dateRange: dateRangeProp` to params, use `dateRangeProp || dataDateRange()`

**Time saved**: ~45 minutes of debugging reduced to 5 minutes

### Quick Reference: Debug Log Template

```typescript
// Add this at the TOP of any component receiving props
console.log('[ComponentName] Received props:', {
  propName1,
  propName2,
  // Add any props you're debugging
});

// Add this AFTER any transformations
console.log('[ComponentName] After transform:', transformedValue);

// Add this BEFORE passing to child
console.log('[ComponentName] Passing to child:', valueBeingPassed);
```

### Using Browser DevTools Effectively

1. **React DevTools**: Inspect component props in real-time
2. **Console Filtering**: Filter by component name (e.g., `[Dashboard]`)
3. **Break on Exception**: Catches errors at source
4. **Network Tab**: Verify data loading correctly