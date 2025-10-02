import { CampaignAnomaly } from "./anomalyDetection";

export interface AnomalyFilters {
  severity?: 'high' | 'medium' | 'low';
  anomalyType?: 'impression_change' | 'transaction_drop' | 'transaction_zero' | 'suspected_bot_activity';
  recency?: '3' | '7' | '10' | '14' | '30';
}

/**
 * Filter anomalies based on the provided filters
 */
export function filterAnomalies(anomalies: CampaignAnomaly[], filters: AnomalyFilters): CampaignAnomaly[] {
  return anomalies.filter(anomaly => {
    // Filter by severity
    if (filters.severity && anomaly.severity !== filters.severity) {
      return false;
    }

    // Filter by anomaly type
    if (filters.anomalyType && anomaly.anomaly_type !== filters.anomalyType) {
      return false;
    }

    // Filter by recency
    if (filters.recency) {
      const daysBack = parseInt(filters.recency);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);
      const cutoffDateString = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD format

      if (anomaly.date_detected < cutoffDateString) {
        return false;
      }
    }

    return true;
  });
}
