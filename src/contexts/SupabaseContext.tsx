import React, { createContext, ReactNode } from 'react'
import { supabase, type CampaignData, type CampaignAnomalyData, type ContractTermsData } from '@/lib/supabase'

interface SupabaseContextType {
  upsertCampaignData: (data: Omit<CampaignData, 'id' | 'created_at' | 'updated_at'>[], onProgress?: (progress: string) => void) => Promise<void>
  getCampaignData: (startDate?: string, endDate?: string, onProgress?: (progress: string) => void, recentOnly?: boolean) => Promise<CampaignData[]>
  deleteCampaignData: (campaignName?: string, date?: string) => Promise<void>
  clearCampaignData: () => Promise<void>
  getCampaignDataCount: () => Promise<number>
  loadAllDataInBackground: (onProgress?: (progress: string) => void) => Promise<CampaignData[]>
  // Anomaly methods
  getAnomalies: (includeIgnored?: boolean) => Promise<CampaignAnomalyData[]>
  upsertAnomalies: (anomalies: Omit<CampaignAnomalyData, 'id' | 'created_at' | 'updated_at'>[], clearFirst?: boolean) => Promise<void>
  updateAnomaly: (id: string, updates: Partial<Omit<CampaignAnomalyData, 'id' | 'created_at' | 'updated_at'>>) => Promise<void>
  deleteAnomaly: (id: string) => Promise<void>
  clearAnomalies: () => Promise<void>
  // Contract terms methods
  getContractTerms: () => Promise<ContractTermsData[]>
  upsertContractTerms: (contractTerms: Omit<ContractTermsData, 'id' | 'created_at' | 'updated_at'>[], clearFirst?: boolean) => Promise<void>
  updateContractTerms: (id: string, updates: Partial<Omit<ContractTermsData, 'id' | 'created_at' | 'updated_at'>>) => Promise<void>
  deleteContractTerms: (id: string) => Promise<void>
  clearContractTerms: () => Promise<void>
}

export const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

interface SupabaseProviderProps {
  children: ReactNode
}

export const SupabaseProvider: React.FC<SupabaseProviderProps> = ({ children }) => {
  const upsertCampaignData = async (data: Omit<CampaignData, 'id' | 'created_at' | 'updated_at'>[], onProgress?: (progress: string) => void) => {
    try {
      // Generate upload timestamp and session ID for this batch
      const uploadTimestamp = new Date().toISOString()
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

      // Validate and sanitize data before sending to Supabase
      const sanitizedData = data.map(row => {
        // Ensure all required fields are present and valid
        if (!row.date || typeof row.date !== 'string') {
          throw new Error(`Invalid date field: ${row.date}`)
        }
        if (!row.campaign_order_name || typeof row.campaign_order_name !== 'string') {
          throw new Error(`Invalid campaign_order_name field: ${row.campaign_order_name}`)
        }

        return {
          date: row.date.trim(),
          campaign_order_name: row.campaign_order_name.trim(),
          impressions: Number(row.impressions) || 0,
          clicks: Number(row.clicks) || 0,
          revenue: Number(row.revenue) || 0,
          spend: Number(row.spend) || 0,
          transactions: row.transactions ? Number(row.transactions) || null : null,
          ctr: row.ctr ? Number(row.ctr) || null : null,
          cpm: row.cpm ? Number(row.cpm) || null : null,
          cpc: row.cpc ? Number(row.cpc) || null : null,
          roas: row.roas ? Number(row.roas) || null : null,
          data_source: row.data_source || 'csv_upload',
          user_session_id: row.user_session_id || sessionId,
          uploaded_at: row.uploaded_at || uploadTimestamp,
          orangellow_corrected: row.orangellow_corrected || false,
          original_spend: row.original_spend ? Number(row.original_spend) || null : null
        }
      }).filter(row => row.date && row.campaign_order_name)

      if (sanitizedData.length === 0) {
        throw new Error('No valid data rows to upsert')
      }

      console.log(`💾 Attempting to upsert ${sanitizedData.length} sanitized records to Supabase...`)

      // For large datasets, use chunked uploads to avoid payload size limits
      const chunkSize = 1000; // Upload in chunks of 1000 records
      const totalChunks = Math.ceil(sanitizedData.length / chunkSize);

      if (sanitizedData.length > chunkSize) {
        console.log(`Large dataset detected (${sanitizedData.length} records). Using chunked upload with ${totalChunks} chunks.`);

        let successfullyUpserted = 0;

        for (let i = 0; i < totalChunks; i++) {
          const startIndex = i * chunkSize;
          const endIndex = Math.min(startIndex + chunkSize, sanitizedData.length);
          const chunk = sanitizedData.slice(startIndex, endIndex);

          const progressMessage = `Uploading chunk ${i + 1} of ${totalChunks} (${successfullyUpserted + chunk.length} / ${sanitizedData.length} records)`;
          console.log(progressMessage);
          onProgress?.(progressMessage);

          const { error } = await supabase
            .from('campaign_data')
            .upsert(chunk, {
              onConflict: 'date,campaign_order_name',
              ignoreDuplicates: false
            });

          if (error) {
            console.error(`Error upserting chunk ${i + 1}:`, error);
            throw new Error(`Failed to upload chunk ${i + 1}: ${error.message}`);
          }

          successfullyUpserted += chunk.length;
          console.log(`✅ Chunk ${i + 1} uploaded successfully (${chunk.length} records)`);
        }

        onProgress?.(`Upload complete: ${successfullyUpserted} records uploaded successfully`);
        console.log(`✅ Successfully upserted all ${successfullyUpserted} campaign records in ${totalChunks} chunks`);
      } else {
        // For smaller datasets, upload all at once
        const { error } = await supabase
          .from('campaign_data')
          .upsert(sanitizedData, {
            onConflict: 'date,campaign_order_name',
            ignoreDuplicates: false
          });

        if (error) {
          console.error('Error upserting campaign data:', error);
          throw error;
        }

        console.log(`✅ Successfully upserted ${sanitizedData.length} campaign records`);
      }
    } catch (error) {
      console.error('❌ Failed to upsert campaign data:', error);
      throw error;
    }
  }

  const getCampaignData = async (startDate?: string, endDate?: string, onProgress?: (progress: string) => void, recentOnly = false): Promise<CampaignData[]> => {
    try {
      // If recentOnly is true, automatically filter to last 90 days for fast initial load
      if (recentOnly && !startDate && !endDate) {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        startDate = ninetyDaysAgo.toISOString().split('T')[0]; // YYYY-MM-DD format
        onProgress?.('Loading recent data (last 90 days) for faster startup...');
      }

      // Get total count first for progress tracking
      let countQuery = supabase
        .from('campaign_data')
        .select('*', { count: 'exact', head: true });

      if (startDate) {
        countQuery = countQuery.gte('date', startDate);
      }
      if (endDate) {
        countQuery = countQuery.lte('date', endDate);
      }

      const { count: totalCount } = await countQuery;

      if (totalCount === 0) {
        onProgress?.('No data found');
        return [];
      }

      onProgress?.(`Found ${totalCount?.toLocaleString()} records. Loading...`);

      // Use pagination to fetch all data
      const pageSize = 1000; // Use Supabase's reliable limit
      let allData: CampaignData[] = [];
      let page = 0;
      let hasMore = true;

      console.log(`Starting pagination with ${totalCount} total records expected, page size: ${pageSize}`);

      while (hasMore) {
        let query = supabase
          .from('campaign_data')
          .select('*')
          .order('date', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (startDate) {
          query = query.gte('date', startDate);
        }
        if (endDate) {
          query = query.lte('date', endDate);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching campaign data:', error);
          throw error;
        }

        console.log(`Page ${page}: fetched ${data?.length || 0} records`);

        if (data && data.length > 0) {
          allData = allData.concat(data);
          page++;

          const progress = totalCount
            ? `Loaded ${allData.length.toLocaleString()} of ${totalCount.toLocaleString()} records (${Math.round((allData.length / totalCount) * 100)}%)`
            : `Loaded ${allData.length.toLocaleString()} records...`;

          onProgress?.(progress);

          // Continue until we get less than a full page or reach the expected total
          hasMore = data.length === pageSize && (!totalCount || allData.length < totalCount);

          // Safety check: if we've loaded as much as the total count, stop
          if (totalCount && allData.length >= totalCount) {
            console.log(`Reached expected total count of ${totalCount}, stopping pagination`);
            hasMore = false;
          }
        } else {
          console.log(`No more data found, stopping pagination`);
          hasMore = false;
        }
      }

      console.log(`Completed fetching ${allData.length} total records from Supabase`);
      return allData;
    } catch (error) {
      console.error('Failed to fetch campaign data:', error);
      throw error;
    }
  }


  const getCampaignDataCount = async (): Promise<number> => {
    try {
      const { count, error } = await supabase
        .from('campaign_data')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Error fetching campaign data count:', error);
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('Failed to fetch campaign data count:', error);
      throw error;
    }
  }

  const loadAllDataInBackground = async (onProgress?: (progress: string) => void): Promise<CampaignData[]> => {
    console.log('🔄 Starting background load of all historical data...');
    return getCampaignData(undefined, undefined, onProgress, false);
  }

  const deleteCampaignData = async (campaignName?: string, date?: string): Promise<void> => {
    try {
      let query = supabase.from('campaign_data').delete()

      if (campaignName && date) {
        query = query.eq('campaign_order_name', campaignName).eq('date', date)
      } else if (campaignName) {
        query = query.eq('campaign_order_name', campaignName)
      } else if (date) {
        query = query.eq('date', date)
      } else {
        // If no filters provided, delete all (be careful with this)
        query = query.neq('id', '00000000-0000-0000-0000-000000000000') // This will match all records
      }

      const { error } = await query

      if (error) {
        console.error('Error deleting campaign data:', error)
        throw error
      }

      console.log('Successfully deleted campaign data')
    } catch (error) {
      console.error('Failed to delete campaign data:', error)
      throw error
    }
  }

  const getAnomalies = async (includeIgnored: boolean = false): Promise<CampaignAnomalyData[]> => {
    try {
      let query = supabase
        .from('campaign_anomalies')
        .select('*')
        .order('date_detected', { ascending: false })

      if (!includeIgnored) {
        query = query.eq('is_ignored', false)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching anomalies:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Failed to fetch anomalies:', error)
      throw error
    }
  }

  const clearAnomalies = async (): Promise<void> => {
    try {
      const { error } = await supabase
        .from('campaign_anomalies')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // This will match all records

      if (error) {
        console.error('Error clearing anomalies:', error)
        throw error
      }

      console.log('✅ Successfully cleared all anomalies')
    } catch (error) {
      console.error('❌ Failed to clear anomalies:', error)
      throw error
    }
  }

  const upsertAnomalies = async (anomalies: Omit<CampaignAnomalyData, 'id' | 'created_at' | 'updated_at'>[], clearFirst: boolean = true): Promise<void> => {
    try {
      // Clear existing anomalies first if requested
      if (clearFirst) {
        await clearAnomalies()
      }

      // Validate and sanitize anomaly data
      const sanitizedData = anomalies.map(anomaly => ({
        campaign_name: anomaly.campaign_name.trim(),
        anomaly_type: anomaly.anomaly_type,
        date_detected: anomaly.date_detected,
        severity: anomaly.severity,
        details: anomaly.details || {},
        is_ignored: anomaly.is_ignored,
        custom_duration: anomaly.custom_duration || null
      }))

      if (sanitizedData.length === 0) {
        throw new Error('No valid anomaly data to insert')
      }

      console.log(`💾 Attempting to insert ${sanitizedData.length} anomalies to Supabase...`)

      // Group anomalies by campaign and type to keep only the most recent/severe for each
      const groupedAnomalies = sanitizedData.reduce((acc, anomaly) => {
        const key = `${anomaly.campaign_name}|${anomaly.anomaly_type}`

        if (!acc[key]) {
          acc[key] = anomaly
        } else {
          const existing = acc[key]
          const current = anomaly

          // Keep the more recent one, or if same date, keep the more severe one
          const existingDate = new Date(existing.date_detected)
          const currentDate = new Date(current.date_detected)

          if (currentDate > existingDate) {
            acc[key] = current
          } else if (currentDate.getTime() === existingDate.getTime()) {
            // Same date - keep the more severe one
            const severityOrder = { 'high': 3, 'medium': 2, 'low': 1 }
            if (severityOrder[current.severity] > severityOrder[existing.severity]) {
              acc[key] = current
            }
          }
        }

        return acc
      }, {} as Record<string, typeof sanitizedData[0]>)

      const finalAnomalies = Object.values(groupedAnomalies)

      console.log(`💾 Reduced ${sanitizedData.length} anomalies to ${finalAnomalies.length} unique anomalies (most recent/severe per campaign per type)`)

      const { error } = await supabase
        .from('campaign_anomalies')
        .insert(finalAnomalies)

      if (error) {
        console.error('Error inserting anomalies:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        throw error
      }

      console.log(`✅ Successfully inserted ${finalAnomalies.length} anomalies`)
    } catch (error) {
      console.error('❌ Failed to insert anomalies:', error)
      throw error
    }
  }

  const updateAnomaly = async (id: string, updates: Partial<Omit<CampaignAnomalyData, 'id' | 'created_at' | 'updated_at'>>): Promise<void> => {
    try {
      const { error } = await supabase
        .from('campaign_anomalies')
        .update(updates)
        .eq('id', id)

      if (error) {
        console.error('Error updating anomaly:', error)
        throw error
      }

      console.log(`✅ Successfully updated anomaly ${id}`)
    } catch (error) {
      console.error('❌ Failed to update anomaly:', error)
      throw error
    }
  }

  const deleteAnomaly = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('campaign_anomalies')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting anomaly:', error)
        throw error
      }

      console.log(`✅ Successfully deleted anomaly ${id}`)
    } catch (error) {
      console.error('❌ Failed to delete anomaly:', error)
      throw error
    }
  }

  // Contract Terms operations
  const getContractTerms = async (): Promise<ContractTermsData[]> => {
    try {
      const { data, error } = await supabase
        .from('contract_terms')
        .select('*')
        .order('campaign_name', { ascending: true })

      if (error) {
        console.error('Error fetching contract terms:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('❌ Failed to fetch contract terms:', error)
      throw error
    }
  }

  const upsertContractTerms = async (contractTerms: Omit<ContractTermsData, 'id' | 'created_at' | 'updated_at'>[], clearFirst: boolean = false): Promise<void> => {
    try {
      if (clearFirst) {
        const { error: clearError } = await supabase
          .from('contract_terms')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records

        if (clearError) {
          console.error('Error clearing contract terms:', clearError)
          throw clearError
        }
        console.log('🗑️ Cleared existing contract terms')
      }

      if (contractTerms.length === 0) {
        console.log('No contract terms to insert')
        return
      }

      // Validate and sanitize data
      const sanitizedData = contractTerms.map(term => {
        if (!term.campaign_name || typeof term.campaign_name !== 'string') {
          throw new Error(`Invalid campaign_name: ${term.campaign_name}`)
        }
        if (!term.start_date || !term.end_date) {
          throw new Error(`Invalid dates for campaign ${term.campaign_name}`)
        }

        return {
          campaign_name: term.campaign_name.trim(),
          start_date: term.start_date,
          end_date: term.end_date,
          budget: Number(term.budget) || 0,
          cpm: Number(term.cpm) || 0,
          impressions_goal: Number(term.impressions_goal) || 0
        }
      })

      const { error } = await supabase
        .from('contract_terms')
        .insert(sanitizedData)

      if (error) {
        console.error('Error inserting contract terms:', error)
        throw error
      }

      console.log(`✅ Successfully inserted ${sanitizedData.length} contract terms`)
    } catch (error) {
      console.error('❌ Failed to insert contract terms:', error)
      throw error
    }
  }

  const updateContractTerms = async (id: string, updates: Partial<Omit<ContractTermsData, 'id' | 'created_at' | 'updated_at'>>): Promise<void> => {
    try {
      const { error } = await supabase
        .from('contract_terms')
        .update(updates)
        .eq('id', id)

      if (error) {
        console.error('Error updating contract terms:', error)
        throw error
      }

      console.log(`✅ Successfully updated contract terms ${id}`)
    } catch (error) {
      console.error('❌ Failed to update contract terms:', error)
      throw error
    }
  }

  const deleteContractTerms = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('contract_terms')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting contract terms:', error)
        throw error
      }

      console.log(`✅ Successfully deleted contract terms ${id}`)
    } catch (error) {
      console.error('❌ Failed to delete contract terms:', error)
      throw error
    }
  }

  const clearContractTerms = async (): Promise<void> => {
    try {
      const { error } = await supabase
        .from('contract_terms')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records

      if (error) {
        console.error('Error clearing contract terms:', error)
        throw error
      }

      console.log('✅ Successfully cleared all contract terms')
    } catch (error) {
      console.error('❌ Failed to clear contract terms:', error)
      throw error
    }
  }

  const clearCampaignData = async (): Promise<void> => {
    try {
      const { error } = await supabase
        .from('campaign_data')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records

      if (error) {
        console.error('Error clearing campaign data:', error)
        throw error
      }

      console.log('✅ Successfully cleared all campaign data')
    } catch (error) {
      console.error('❌ Failed to clear campaign data:', error)
      throw error
    }
  }

  const value: SupabaseContextType = {
    upsertCampaignData,
    getCampaignData,
    deleteCampaignData,
    clearCampaignData,
    getCampaignDataCount,
    loadAllDataInBackground,
    getAnomalies,
    upsertAnomalies,
    updateAnomaly,
    deleteAnomaly,
    clearAnomalies,
    getContractTerms,
    upsertContractTerms,
    updateContractTerms,
    deleteContractTerms,
    clearContractTerms
  }

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  )
}