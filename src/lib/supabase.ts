import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kxggewdlaujmjyamfcik.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4Z2dld2RsYXVqbWp5YW1mY2lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3Mjg5MTIsImV4cCI6MjA3MzMwNDkxMn0.Z5EoAE0EdCN75dAxyA_qbvSJ5GGgIHYxZwkVruSQ2mM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type CampaignData = {
  id?: string
  date: string
  campaign_order_name: string
  impressions: number
  clicks: number
  revenue: number
  spend: number
  transactions?: number
  created_at?: string
  updated_at?: string
}

export type CampaignAnomalyData = {
  id?: string
  campaign_name: string
  anomaly_type: 'impression_change' | 'transaction_drop' | 'transaction_zero' | 'suspected_bot_activity'
  date_detected: string
  severity: 'high' | 'medium' | 'low'
  details: Record<string, any>
  is_ignored: boolean
  custom_duration?: number
  created_at?: string
  updated_at?: string
}

export type ContractTermsData = {
  id?: string
  campaign_name: string
  start_date: string
  end_date: string
  budget: number
  cpm: number
  impressions_goal: number
  created_at?: string
  updated_at?: string
}

export type Database = {
  public: {
    Tables: {
      campaign_data: {
        Row: CampaignData
        Insert: Omit<CampaignData, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<CampaignData, 'id' | 'created_at' | 'updated_at'>>
      }
      campaign_anomalies: {
        Row: CampaignAnomalyData
        Insert: Omit<CampaignAnomalyData, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<CampaignAnomalyData, 'id' | 'created_at' | 'updated_at'>>
      }
      contract_terms: {
        Row: ContractTermsData
        Insert: Omit<ContractTermsData, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ContractTermsData, 'id' | 'created_at' | 'updated_at'>>
      }
    }
  }
}

// Helper functions to get last upload timestamps
export async function getLastCampaignUpload(): Promise<Date | null> {
  try {
    const { data, error } = await supabase
      .from('campaign_data')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) return null
    return data.created_at ? new Date(data.created_at) : null
  } catch (error) {
    console.error('Error fetching last campaign upload:', error)
    return null
  }
}

export async function getLastContractUpload(): Promise<Date | null> {
  try {
    const { data, error } = await supabase
      .from('contract_terms')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) return null
    return data.created_at ? new Date(data.created_at) : null
  } catch (error) {
    console.error('Error fetching last contract upload:', error)
    return null
  }
}