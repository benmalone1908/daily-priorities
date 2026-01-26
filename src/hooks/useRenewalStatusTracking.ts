/**
 * Hook for managing renewal status tracking data
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

export function useRenewalStatusTracking() {
  const { supabase } = useSupabase();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  // Helper function to get current user ID
  const getCurrentUserId = (): string => {
    return currentUser?.id || 'unknown';
  };

  // Fetch all renewal status tracking records
  const { data: trackingRecords = [], isLoading } = useQuery<RenewalStatusTracking[]>({
    queryKey: ['renewal-status-tracking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('renewal_status_tracking')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
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
        coda_strategy: insert.coda_strategy ?? false,
        dashboard_update: insert.dashboard_update ?? false,
        dsp_update: insert.dsp_update ?? false,
        pre_qa: insert.pre_qa ?? false,
        post_qa: insert.post_qa ?? false,
        status: insert.status ?? 'Renewal Pending',
        renewal_type: insert.renewal_type ?? 'Extension',
        created_by: getCurrentUserId()
      };

      const { data, error } = await supabase
        .from('renewal_status_tracking')
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
        
        // Handle specific error cases
        if (error.code === '23505') { // Unique violation
          throw new Error(`Campaign "${insert.campaign_name}" already has a tracking record`);
        } else if (error.code === '42P01') { // Table doesn't exist
          throw new Error('Renewal tracking table does not exist. Please run the database migration.');
        }
        
        throw error;
      }
      return data as RenewalStatusTracking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renewal-status-tracking'] });
      toast.success('Renewal tracking record created');
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
        .from('renewal_status_tracking')
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
      queryClient.invalidateQueries({ queryKey: ['renewal-status-tracking'] });
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
        .from('renewal_status_tracking')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renewal-status-tracking'] });
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
    createTrackingRecord: createTrackingRecord.mutate,
    updateTrackingRecord: updateTrackingRecord.mutate,
    deleteTrackingRecord: deleteTrackingRecord.mutate,
    hasTrackingRecord,
    isCreating: createTrackingRecord.isPending,
    isUpdating: updateTrackingRecord.isPending,
    isDeleting: deleteTrackingRecord.isPending
  };
}
