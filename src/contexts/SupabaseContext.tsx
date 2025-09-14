import React, { createContext, useContext, ReactNode } from 'react'
import { supabase, type CampaignData } from '@/lib/supabase'

interface SupabaseContextType {
  upsertCampaignData: (data: Omit<CampaignData, 'id' | 'created_at' | 'updated_at'>[]) => Promise<void>
  getCampaignData: (startDate?: string, endDate?: string, onProgress?: (progress: string) => void, recentOnly?: boolean) => Promise<CampaignData[]>
  deleteCampaignData: (campaignName?: string, date?: string) => Promise<void>
  getCampaignDataCount: () => Promise<number>
  loadAllDataInBackground: (onProgress?: (progress: string) => void) => Promise<CampaignData[]>
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

export const useSupabase = () => {
  const context = useContext(SupabaseContext)
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
}

interface SupabaseProviderProps {
  children: ReactNode
}

export const SupabaseProvider: React.FC<SupabaseProviderProps> = ({ children }) => {
  const upsertCampaignData = async (data: Omit<CampaignData, 'id' | 'created_at' | 'updated_at'>[]) => {
    try {
      const { error } = await supabase
        .from('campaign_data')
        .upsert(data, {
          onConflict: 'date,campaign_order_name',
          ignoreDuplicates: false
        })

      if (error) {
        console.error('Error upserting campaign data:', error)
        throw error
      }

      console.log(`Successfully upserted ${data.length} campaign records`)
    } catch (error) {
      console.error('Failed to upsert campaign data:', error)
      throw error
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

      // For very large datasets, use pagination to fetch all data
      const pageSize = 1000; // Use smaller batches to ensure reliability
      let allData: CampaignData[] = [];
      let page = 0;
      let hasMore = true;
      let consecutiveEmptyPages = 0;

      console.log(`Starting pagination with ${totalCount} total records expected`);

      while (hasMore && consecutiveEmptyPages < 3) {
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

        console.log(`Page ${page}: fetched ${data?.length || 0} records (range: ${page * pageSize} to ${(page + 1) * pageSize - 1})`);

        if (data && data.length > 0) {
          allData = allData.concat(data);
          consecutiveEmptyPages = 0; // Reset counter on successful fetch
          hasMore = data.length === pageSize; // Continue if we got a full page
          page++;

          const progress = totalCount
            ? `Loaded ${allData.length.toLocaleString()} of ${totalCount.toLocaleString()} records (${Math.round((allData.length / totalCount) * 100)}%)`
            : `Loaded ${allData.length.toLocaleString()} records...`;

          onProgress?.(progress);
          console.log(`Fetched page ${page}, ${progress}`);

          // Safety check: if we've loaded as much as the total count, stop
          if (totalCount && allData.length >= totalCount) {
            console.log(`Reached expected total count of ${totalCount}, stopping pagination`);
            hasMore = false;
          }
        } else {
          consecutiveEmptyPages++;
          if (consecutiveEmptyPages >= 3) {
            console.log(`Got 3 consecutive empty pages, stopping pagination`);
            hasMore = false;
          } else {
            console.log(`Empty page ${page}, continuing... (${consecutiveEmptyPages}/3 empty pages)`);
            page++;
          }
        }
      }

      console.log(`Completed fetching ${allData.length} total records from Supabase`);

      // If we didn't get all the expected records, log a warning
      if (totalCount && allData.length < totalCount) {
        console.warn(`⚠️ Only fetched ${allData.length} of ${totalCount} expected records. This may indicate a Supabase pagination limit.`);
        console.warn(`Consider using date-based filtering to fetch data in chunks.`);
      }

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

  const value: SupabaseContextType = {
    upsertCampaignData,
    getCampaignData,
    deleteCampaignData,
    getCampaignDataCount,
    loadAllDataInBackground
  }

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  )
}