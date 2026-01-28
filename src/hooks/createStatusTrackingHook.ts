/**
 * Factory function for creating status tracking hooks.
 * This reduces code duplication between useRenewalStatusTracking and useLaunchStatusTracking.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/contexts/use-supabase';
import { useAuth } from '@/contexts/use-auth';
import {
  RenewalStatusTracking,
  RenewalStatusTrackingInsert,
  RenewalStatusTrackingUpdate
} from '@/types/daily-priorities';
import { toast } from 'sonner';

export interface StatusTrackingConfig {
  /** The Supabase table name */
  tableName: string;
  /** The React Query key for caching */
  queryKey: string;
  /** Display name for toast messages (e.g., "Renewal" or "Launch") */
  displayName: string;
}

export interface StatusTrackingHookReturn {
  trackingRecords: RenewalStatusTracking[];
  isLoading: boolean;
  error: Error | null;
  isError: boolean;
  createTrackingRecord: (insert: RenewalStatusTrackingInsert) => void;
  updateTrackingRecord: (params: { id: string; updates: RenewalStatusTrackingUpdate }) => void;
  deleteTrackingRecord: (id: string) => void;
  hasTrackingRecord: (campaignName: string) => boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}

/**
 * Creates a status tracking hook with the given configuration.
 * Used to generate useRenewalStatusTracking and useLaunchStatusTracking hooks.
 */
export function createStatusTrackingHook(config: StatusTrackingConfig) {
  const { tableName, queryKey, displayName } = config;

  return function useStatusTracking(): StatusTrackingHookReturn {
    const { supabase } = useSupabase();
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    // Helper function to get current user ID (must be a valid UUID)
    const getCurrentUserId = (): string | null => {
      const userId = currentUser?.id;
      // Check if it's a valid UUID format
      if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
        return userId;
      }
      return null;
    };

    // Fetch all tracking records
    const { data: trackingRecords = [], isLoading, error, isError } = useQuery<RenewalStatusTracking[]>({
      queryKey: [queryKey],
      queryFn: async () => {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error(`Failed to fetch ${displayName.toLowerCase()} status tracking records:`, {
            code: error.code,
            message: error.message,
            details: error.details
          });
          throw error;
        }
        return data as RenewalStatusTracking[];
      },
      enabled: !!supabase
    });

    // Create a new tracking record
    const createTrackingRecord = useMutation({
      mutationFn: async (insert: RenewalStatusTrackingInsert) => {
        if (!supabase) throw new Error('Supabase not initialized');

        const insertData = {
          campaign_name: insert.campaign_name,
          renewal_date: insert.renewal_date || null,
          project_kickoff_ticket_creation: insert.project_kickoff_ticket_creation ?? false,
          bt_approval: insert.bt_approval ?? false,
          bt_approved: insert.bt_approved ?? false,
          coda_strategy: insert.coda_strategy ?? false,
          dashboard_update: insert.dashboard_update ?? false,
          dsp_creative_setup: insert.dsp_creative_setup ?? false,
          dsp_update: insert.dsp_update ?? false,
          pre_qa: insert.pre_qa ?? false,
          post_qa: insert.post_qa ?? false,
          status: insert.status ?? 'Not Started',
          renewal_type: insert.renewal_type ?? 'Extension',
          created_by: getCurrentUserId()
        };

        const { data, error } = await supabase
          .from(tableName)
          .insert(insertData)
          .select()
          .single();

        if (error) {
          console.error('Supabase error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });

          if (error.code === '23505') {
            throw new Error(`Campaign "${insert.campaign_name}" already has a tracking record`);
          } else if (error.code === '42P01') {
            throw new Error(`${displayName} tracking table does not exist. Please run the database migration.`);
          }

          throw error;
        }
        return data as RenewalStatusTracking;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
        toast.success(`${displayName} tracking record created`);
      },
      onError: (error: unknown) => {
        console.error('Error creating tracking record:', error);
        const errorMessage = (error as { message?: string; details?: string; hint?: string })?.message ||
                            (error as { message?: string; details?: string; hint?: string })?.details ||
                            (error as { message?: string; details?: string; hint?: string })?.hint ||
                            'Unknown error';
        const errorCode = (error as { code?: string })?.code ? ` (${(error as { code?: string }).code})` : '';
        toast.error(`Failed to create tracking record: ${errorMessage}${errorCode}`, {
          duration: 5000
        });
      }
    });

    // Update a tracking record
    const updateTrackingRecord = useMutation({
      mutationFn: async ({ id, updates }: { id: string; updates: RenewalStatusTrackingUpdate }) => {
        if (!supabase) throw new Error('Supabase not initialized');

        const { data, error } = await supabase
          .from(tableName)
          .update({
            ...updates,
            updated_by: getCurrentUserId()
          })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data as RenewalStatusTracking;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      },
      onError: (error) => {
        console.error('Error updating tracking record:', error);
        toast.error('Failed to update tracking record');
      }
    });

    // Delete a tracking record
    const deleteTrackingRecord = useMutation({
      mutationFn: async (id: string) => {
        if (!supabase) throw new Error('Supabase not initialized');

        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', id);

        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
        toast.success('Tracking record deleted');
      },
      onError: (error) => {
        console.error('Error deleting tracking record:', error);
        toast.error('Failed to delete tracking record');
      }
    });

    // Check if a campaign already has a tracking record
    const hasTrackingRecord = (campaignName: string): boolean => {
      return trackingRecords.some(record => record.campaign_name === campaignName);
    };

    return {
      trackingRecords,
      isLoading,
      error: error as Error | null,
      isError,
      createTrackingRecord: createTrackingRecord.mutate,
      updateTrackingRecord: updateTrackingRecord.mutate,
      deleteTrackingRecord: deleteTrackingRecord.mutate,
      hasTrackingRecord,
      isCreating: createTrackingRecord.isPending,
      isUpdating: updateTrackingRecord.isPending,
      isDeleting: deleteTrackingRecord.isPending
    };
  };
}
