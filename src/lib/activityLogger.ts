/**
 * Utility for logging activity to the activity_log table
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { QueryClient } from '@tanstack/react-query';
import { ActivityLogInsert } from '@/types/activity-log';

export async function logActivity(
  supabase: SupabaseClient | null,
  queryClient: QueryClient,
  log: ActivityLogInsert
) {
  if (!supabase) {
    console.warn('Cannot log activity: Supabase not initialized');
    return;
  }

  try {
    console.log('Logging activity:', log);
    const { data, error } = await supabase.from('activity_log').insert(log).select();
    if (error) {
      console.error('Error logging activity:', error);
    } else {
      console.log('Activity logged successfully:', data);
      // Invalidate activity log queries to refresh changelog
      queryClient.invalidateQueries({ queryKey: ['activity-log'] });
    }
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw - logging failures shouldn't break the app
  }
}
