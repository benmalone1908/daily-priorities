#!/bin/bash

# Fix remaining any types with sed
cd "/Users/benmalone/Claude Projects/campaign-trends"

# CustomReportBuilder - line 22-23
sed -i '' '22s/data: any\[\]/data: CampaignDataRow[]/' src/components/CustomReportBuilder.tsx
sed -i '' '23s/contractTermsData: any\[\]/contractTermsData: ContractTermsRow[]/' src/components/CustomReportBuilder.tsx

# DailyTotalsTable - line 40
sed -i '' '40s/(totals: any)/totals: Record<string, unknown>)/' src/components/DailyTotalsTable.tsx

# Dashboard - lines 116, 156
sed -i '' '116s/(data: any\[\])/(data: CampaignDataRow[])/' src/components/Dashboard.tsx
sed -i '' '156s/(dataSubset: any\[\])/(dataSubset: CampaignDataRow[])/' src/components/Dashboard.tsx

# DashboardWrapper - lines 10-11, 35, 241
sed -i '' '10s/metricsData: any\[\]/metricsData: CampaignDataRow[]/' src/components/DashboardWrapper.tsx
sed -i '' '11s/revenueData: any\[\]/revenueData: CampaignDataRow[]/' src/components/DashboardWrapper.tsx
sed -i '' '35s/contractTermsData: any\[\]/contractTermsData: ContractTermsRow[]/' src/components/DashboardWrapper.tsx
sed -i '' '241s/, aggregatedMetricsData: any\[\]/, aggregatedMetricsData: CampaignDataRow[]/' src/components/DashboardWrapper.tsx

# GlobalFilters - lines 9-11
sed -i '' '9s/campaigns: any\[\]/campaigns: string[]/' src/components/GlobalFilters.tsx
sed -i '' '10s/advertisers: any\[\]/advertisers: string[]/' src/components/GlobalFilters.tsx
sed -i '' '11s/agencies: any\[\]/agencies: string[]/' src/components/GlobalFilters.tsx

# MetricCard - line 10
sed -i '' '10s/data: any\[\]/data: CampaignDataRow[]/' src/components/MetricCard.tsx

# QuadrantZoomModal - line 128
sed -i '' '128s/(data: any\[\], x: any)/(data: unknown[], x: unknown)/' src/components/QuadrantZoomModal.tsx

# DashboardSparkCharts - line 8
sed -i '' '8s/dateRange: any/dateRange: { from: Date | undefined; to: Date | undefined } | undefined/' src/components/DashboardSparkCharts.tsx

# dashboard/MetricCards - lines 8-9
sed -i '' '8s/currentData: any\[\]/currentData: CampaignDataRow[]/' src/components/dashboard/MetricCards.tsx
sed -i '' '9s/previousData: any\[\]/previousData: CampaignDataRow[]/' src/components/dashboard/MetricCards.tsx

# PDF DataProcessingEngine - lines 7-8, 12
sed -i '' '7s/data: any\[\]/data: CampaignDataRow[]/' src/components/pdf/DataProcessingEngine.ts
sed -i '' '8s/pacingData: any\[\]/pacingData: unknown[]/' src/components/pdf/DataProcessingEngine.ts
sed -i '' '12s/getAggregatedData(data: any\[\], startDate: any, endDate: any)/getAggregatedData(data: CampaignDataRow[], startDate: Date | string, endDate: Date | string)/' src/components/pdf/DataProcessingEngine.ts

echo "Done fixing specific lines"
