/**
 * Hook for managing campaign renewal statuses
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/contexts/use-supabase';
import { useAuth } from '@/contexts/use-auth';
import { CampaignRenewal, CampaignRenewalUpdate, RenewalStatus } from '@/types/daily-priorities';
import { toast } from 'sonner';
import { logActivity } from '@/lib/activityLogger';

export function useCampaignRenewals() {
  const { supabase } = useSupabase();
  const { user, currentUser } = useAuth();
  const queryClient = useQueryClient();

  // Helper function to get current user ID
  const getCurrentUserId = (): string => {
    if (!currentUser?.id) {
      console.error('getCurrentUserId called but currentUser is not set!', {
        currentUser,
        timestamp: new Date().toISOString()
      });
    }
    return currentUser?.id || 'unknown';
  };

  // Fetch all campaign renewals
  const { data: renewals = [], isLoading } = useQuery<CampaignRenewal[]>({
    queryKey: ['campaign-renewals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_renewals')
        .select('*')
        .order('status_updated_at', { ascending: false });

      if (error) throw error;
      return data as CampaignRenewal[];
    },
    enabled: !!supabase
  });

  // Update renewal status mutation
  const updateRenewalStatus = useMutation({
    mutationFn: async ({
      campaignName,
      newStatus,
      notes
    }: {
      campaignName: string;
      newStatus: RenewalStatus;
      notes?: string;
    }) => {
      // Check if renewal record exists
      const { data: existing } = await supabase
        .from('campaign_renewals')
        .select('*')
        .eq('campaign_order_name', campaignName)
        .single();

      const updateData: CampaignRenewalUpdate = {
        renewal_status: newStatus,
        status_updated_by: user?.username || null,
        ...(notes !== undefined && { notes })
      };

      if (existing) {
        // Update existing record
        const { data, error } = await supabase
          .from('campaign_renewals')
          .update({
            ...updateData,
            status_updated_at: new Date().toISOString()
          })
          .eq('campaign_order_name', campaignName)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('campaign_renewals')
          .insert({
            campaign_order_name: campaignName,
            ...updateData
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onMutate: async ({ campaignName, newStatus }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['campaign-renewals'] });

      // Snapshot the previous value
      const previousRenewals = queryClient.getQueryData<CampaignRenewal[]>(['campaign-renewals']);

      // Optimistically update to the new value
      queryClient.setQueryData<CampaignRenewal[]>(['campaign-renewals'], (old = []) => {
        const existing = old.find(r => r.campaign_order_name === campaignName);

        if (existing) {
          // Update existing
          return old.map(r =>
            r.campaign_order_name === campaignName
              ? { ...r, renewal_status: newStatus, status_updated_at: new Date().toISOString() }
              : r
          );
        } else {
          // Add new
          return [...old, {
            id: `temp-${Date.now()}`,
            campaign_order_name: campaignName,
            renewal_status: newStatus,
            status_updated_at: new Date().toISOString(),
            status_updated_by: user?.username || null,
            notes: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as CampaignRenewal];
        }
      });

      // Return a context object with the snapshotted value
      return { previousRenewals };
    },
    onSuccess: (data, variables, context) => {
      // Invalidate and refetch to get the real data from server
      queryClient.invalidateQueries({ queryKey: ['campaign-renewals'] });

      // Get old status from previous renewals
      const oldRenewal = context?.previousRenewals?.find(r => r.campaign_order_name === variables.campaignName);
      const oldStatus = oldRenewal?.renewal_status || null;

      // Log activity
      logRenewalStatusChange(
        variables.campaignName,
        oldStatus,
        variables.newStatus
      );

      toast.success(`Renewal status updated to "${variables.newStatus}"`);
    },
    onError: (error, variables, context) => {
      // Rollback to the previous value on error
      if (context?.previousRenewals) {
        queryClient.setQueryData(['campaign-renewals'], context.previousRenewals);
      }

      console.error('Failed to update renewal status:', error);
      toast.error('Failed to update renewal status');
    }
  });

  // Log renewal status change to activity log
  const logRenewalStatusChange = async (
    campaignName: string,
    oldStatus: RenewalStatus | null,
    newStatus: RenewalStatus
  ) => {
    await logActivity(supabase, queryClient, {
      priority_id: null,
      user_id: getCurrentUserId(),
      action: 'renewal_status_updated',
      task_description: campaignName,
      changes: {
        status: {
          before: oldStatus,
          after: newStatus
        }
      }
    });
  };

  // Get renewal status for a specific campaign
  const getRenewalStatus = (campaignName: string): CampaignRenewal | undefined => {
    return renewals.find((r) => r.campaign_order_name === campaignName);
  };

  return {
    renewals,
    isLoading,
    updateRenewalStatus: updateRenewalStatus.mutate,
    getRenewalStatus
  };
}
