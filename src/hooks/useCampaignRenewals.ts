/**
 * Hook for managing campaign renewal statuses
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/contexts/use-supabase';
import { useAuth } from '@/contexts/use-auth';
import { CampaignRenewal, CampaignRenewalUpdate, RenewalStatus } from '@/types/daily-priorities';
import { toast } from 'sonner';

export function useCampaignRenewals() {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
    onSuccess: (data, variables) => {
      // Invalidate and refetch to get the real data from server
      queryClient.invalidateQueries({ queryKey: ['campaign-renewals'] });

      // Log activity
      logRenewalStatusChange(
        variables.campaignName,
        variables.newStatus,
        user?.username || 'Unknown'
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
    newStatus: RenewalStatus,
    username: string
  ) => {
    try {
      await supabase.from('activity_log').insert({
        action_type: 'renewal_status_change',
        description: `Changed renewal status for "${campaignName}" to "${newStatus}"`,
        performed_by: username,
        metadata: {
          campaign_name: campaignName,
          new_status: newStatus
        }
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
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
