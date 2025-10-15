import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/contexts/use-supabase';
import { RoasAlertIgnore, RoasAlertIgnoreInsert, IgnoreReason } from '@/types/daily-priorities';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/use-auth';
import { logActivity } from '@/lib/activityLogger';

export function useRoasIgnores() {
  const { supabase } = useSupabase();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentUser } = useAuth();

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

  // Fetch all ignored campaigns
  const { data: ignoredCampaigns = [], isLoading } = useQuery<RoasAlertIgnore[]>({
    queryKey: ['roas-alert-ignores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roas_alert_ignores')
        .select('*');

      if (error) throw error;
      return data as RoasAlertIgnore[];
    },
    enabled: !!supabase
  });

  // Add ignore with reason
  const addIgnore = useMutation({
    mutationFn: async ({ campaignName, reason }: { campaignName: string; reason: IgnoreReason }) => {
      const { error } = await supabase
        .from('roas_alert_ignores')
        .insert({
          campaign_order_name: campaignName,
          ignore_reason: reason
        } as RoasAlertIgnoreInsert);

      if (error) throw error;

      // Log activity
      await logActivity(supabase, queryClient, {
        priority_id: null,
        user_id: getCurrentUserId(),
        action: 'roas_ignored',
        task_description: campaignName,
        changes: { reason }
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['roas-alert-ignores'] });

      toast({
        title: 'ROAS alert ignored',
        description: `Alerts for "${variables.campaignName}" will be hidden.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to ignore ROAS alert',
        variant: 'destructive'
      });
      console.error('Error adding ROAS ignore:', error);
    }
  });

  // Remove ignore
  const removeIgnore = useMutation({
    mutationFn: async (campaignName: string) => {
      const { error } = await supabase
        .from('roas_alert_ignores')
        .delete()
        .eq('campaign_order_name', campaignName);

      if (error) throw error;

      // Log activity
      await logActivity(supabase, queryClient, {
        priority_id: null,
        user_id: getCurrentUserId(),
        action: 'roas_unignored',
        task_description: campaignName,
        changes: null
      });
    },
    onSuccess: (_, campaignName) => {
      queryClient.invalidateQueries({ queryKey: ['roas-alert-ignores'] });

      toast({
        title: 'ROAS alert enabled',
        description: `Alerts for "${campaignName}" will now appear.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to enable ROAS alert',
        variant: 'destructive'
      });
      console.error('Error removing ROAS ignore:', error);
    }
  });

  // Helper function to check if a campaign is ignored
  const isIgnored = (campaignName: string): boolean => {
    return ignoredCampaigns.some(ignore => ignore.campaign_order_name === campaignName);
  };

  // Helper function to get ignore reason for a campaign
  const getIgnoreReason = (campaignName: string): IgnoreReason | null => {
    const ignore = ignoredCampaigns.find(ignore => ignore.campaign_order_name === campaignName);
    return ignore?.ignore_reason || null;
  };

  return {
    ignoredCampaigns,
    isLoading,
    addIgnore: (campaignName: string, reason: IgnoreReason) =>
      addIgnore.mutate({ campaignName, reason }),
    removeIgnore: (campaignName: string) =>
      removeIgnore.mutate(campaignName),
    isIgnored,
    getIgnoreReason
  };
}
