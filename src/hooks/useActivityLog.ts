/**
 * Custom hook for fetching activity log / changelog data
 */

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/contexts/use-supabase';
import { ActivityLogEntry } from '@/types/activity-log';
import { startOfMonth, endOfMonth } from 'date-fns';

export function useActivityLog(year?: number, month?: number) {
  const { supabase } = useSupabase();

  // Fetch activity log entries, optionally filtered by year/month
  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ['activity-log', year, month],
    queryFn: async () => {
      let query = supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false });

      // If year and month provided, filter to that month
      if (year !== undefined && month !== undefined) {
        const date = new Date(year, month, 1);
        const start = startOfMonth(date).toISOString();
        const end = endOfMonth(date).toISOString();

        query = query
          .gte('created_at', start)
          .lte('created_at', end);
      }

      const { data, error } = await query.limit(1000); // Limit to prevent huge queries

      if (error) {
        console.error('Error fetching activity log:', error);
        throw error;
      }

      console.log('Activity log entries fetched:', data);
      return (data || []) as ActivityLogEntry[];
    },
    enabled: !!supabase
  });

  return {
    entries,
    isLoading,
    error
  };
}

// Hook to get unique year/month combinations for archive navigation
export function useActivityLogArchive() {
  const { supabase } = useSupabase();

  const { data: archive = [], isLoading } = useQuery({
    queryKey: ['activity-log-archive'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get current month/year to exclude from archive
      const now = new Date();
      const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;

      // Extract unique year/month combinations
      const yearMonths = new Set<string>();
      (data || []).forEach((entry) => {
        const date = new Date(entry.created_at);
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
        // Exclude current month from archive
        if (yearMonth !== currentYearMonth) {
          yearMonths.add(yearMonth);
        }
      });

      // Convert to array of {year, month, label}
      return Array.from(yearMonths)
        .map(ym => {
          const [year, month] = ym.split('-');
          const date = new Date(parseInt(year), parseInt(month), 1);
          return {
            year: parseInt(year),
            month: parseInt(month),
            label: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
          };
        })
        .sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        });
    },
    enabled: !!supabase
  });

  return {
    archive,
    isLoading
  };
}
