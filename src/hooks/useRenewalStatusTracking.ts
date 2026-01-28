/**
 * Hook for managing renewal status tracking data.
 * Uses the shared createStatusTrackingHook factory for implementation.
 */

import { createStatusTrackingHook } from './createStatusTrackingHook';

export const useRenewalStatusTracking = createStatusTrackingHook({
  tableName: 'renewal_status_tracking',
  queryKey: 'renewal-status-tracking',
  displayName: 'Renewal'
});
