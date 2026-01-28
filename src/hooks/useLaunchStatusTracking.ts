/**
 * Hook for managing launch status tracking data.
 * Uses the shared createStatusTrackingHook factory for implementation.
 */

import { createStatusTrackingHook } from './createStatusTrackingHook';

export const useLaunchStatusTracking = createStatusTrackingHook({
  tableName: 'launch_status_tracking',
  queryKey: 'launch-status-tracking',
  displayName: 'Launch'
});
