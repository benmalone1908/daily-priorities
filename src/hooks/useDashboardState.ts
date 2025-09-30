import { useState, useEffect } from 'react';

// Types for state management
export type ChartViewMode = "date" | "dayOfWeek";
export type AnomalyPeriod = "daily" | "weekly";
export type ComparisonPeriod = "7" | "14" | "30";

export interface WeeklyData {
  periodStart: string;
  periodEnd: string;
  IMPRESSIONS: number;
  CLICKS: number;
  REVENUE: number;
  TRANSACTIONS: number;
  ROAS: number;
  CTR: number;
  AOV: number;
  count: number;
}

export interface DashboardState {
  // Filter selections
  selectedWeeklyAdvertisers: string[];
  selectedWeeklyAgencies: string[];
  localSelectedMetricsAdvertisers: string[];
  localSelectedMetricsAgencies: string[];

  // View modes and periods
  anomalyPeriod: AnomalyPeriod;
  comparisonPeriod: ComparisonPeriod;
  metricsViewMode: ChartViewMode;
  revenueViewMode: ChartViewMode;

  // Data states
  weeklyDataState: WeeklyData[];
  anomalies: any;

  // UI states
  showAnomalySection: boolean;
}

export interface DashboardActions {
  setSelectedWeeklyAdvertisers: (advertisers: string[]) => void;
  setSelectedWeeklyAgencies: (agencies: string[]) => void;
  setLocalSelectedMetricsAdvertisers: (advertisers: string[]) => void;
  setLocalSelectedMetricsAgencies: (agencies: string[]) => void;
  setAnomalyPeriod: (period: AnomalyPeriod) => void;
  setComparisonPeriod: (period: ComparisonPeriod) => void;
  setMetricsViewMode: (mode: ChartViewMode) => void;
  setRevenueViewMode: (mode: ChartViewMode) => void;
  setWeeklyDataState: (data: WeeklyData[]) => void;
  setAnomalies: (anomalies: any) => void;
  setShowAnomalySection: (show: boolean) => void;
}

export interface DashboardStateProps {
  selectedMetricsAdvertisers?: string[];
  selectedMetricsAgencies?: string[];
  viewByDate?: boolean;
}

/**
 * Custom hook for Dashboard state management
 * Extracted from Dashboard.tsx for better maintainability
 */
export const useDashboardState = (props: DashboardStateProps = {}) => {
  const {
    selectedMetricsAdvertisers = [],
    selectedMetricsAgencies = [],
    viewByDate = false
  } = props;

  // Filter selections
  const [selectedWeeklyAdvertisers, setSelectedWeeklyAdvertisers] = useState<string[]>([]);
  const [selectedWeeklyAgencies, setSelectedWeeklyAgencies] = useState<string[]>([]);
  const [localSelectedMetricsAdvertisers, setLocalSelectedMetricsAdvertisers] = useState<string[]>(selectedMetricsAdvertisers);
  const [localSelectedMetricsAgencies, setLocalSelectedMetricsAgencies] = useState<string[]>(selectedMetricsAgencies);

  // View modes and periods
  const [anomalyPeriod, setAnomalyPeriod] = useState<AnomalyPeriod>("daily");
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>("7");
  const [metricsViewMode, setMetricsViewMode] = useState<ChartViewMode>(viewByDate ? "date" : "dayOfWeek");
  const [revenueViewMode, setRevenueViewMode] = useState<ChartViewMode>(viewByDate ? "date" : "dayOfWeek");

  // Data states
  const [weeklyDataState, setWeeklyDataState] = useState<WeeklyData[]>([]);
  const [anomalies, setAnomalies] = useState<any>({
    impressions: [],
    clicks: [],
    revenue: [],
    transactions: []
  });

  // UI states
  const [showAnomalySection, setShowAnomalySection] = useState<boolean>(false);

  // Sync with props when they change
  useEffect(() => {
    setLocalSelectedMetricsAdvertisers(selectedMetricsAdvertisers);
  }, [selectedMetricsAdvertisers]);

  useEffect(() => {
    setLocalSelectedMetricsAgencies(selectedMetricsAgencies);
  }, [selectedMetricsAgencies]);

  const state: DashboardState = {
    selectedWeeklyAdvertisers,
    selectedWeeklyAgencies,
    localSelectedMetricsAdvertisers,
    localSelectedMetricsAgencies,
    anomalyPeriod,
    comparisonPeriod,
    metricsViewMode,
    revenueViewMode,
    weeklyDataState,
    anomalies,
    showAnomalySection
  };

  const actions: DashboardActions = {
    setSelectedWeeklyAdvertisers,
    setSelectedWeeklyAgencies,
    setLocalSelectedMetricsAdvertisers,
    setLocalSelectedMetricsAgencies,
    setAnomalyPeriod,
    setComparisonPeriod,
    setMetricsViewMode,
    setRevenueViewMode,
    setWeeklyDataState,
    setAnomalies,
    setShowAnomalySection
  };

  return { state, actions };
};