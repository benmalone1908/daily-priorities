import { createClient } from '@supabase/supabase-js'

// Sanitize environment variables to prevent header issues
const sanitizeEnvVar = (value: string | undefined): string | undefined => {
  if (!value) return value

  // For API keys/URLs, only remove the most problematic characters
  // Remove null bytes and control characters
  // eslint-disable-next-line no-control-regex
  return String(value).replace(/[\u0000-\u001F]/g, '').trim()
}

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL
const rawSupabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabaseUrl = sanitizeEnvVar(rawSupabaseUrl)
const supabaseKey = sanitizeEnvVar(rawSupabaseKey)

// Debug environment variables (without exposing full keys)
console.log('🔍 Supabase environment check:', {
  urlExists: !!rawSupabaseUrl,
  urlLength: rawSupabaseUrl?.length || 0,
  keyExists: !!rawSupabaseKey,
  keyLength: rawSupabaseKey?.length || 0,
  urlPreview: supabaseUrl?.substring(0, 20) + '...',
  keyPreview: supabaseKey?.substring(0, 10) + '...'
})

// Create Supabase client with graceful fallback
let supabase: ReturnType<typeof createClient> | null = null

if (supabaseUrl && supabaseKey && supabaseUrl !== 'your_supabase_url_here' && supabaseKey !== 'your_supabase_anon_key_here') {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false, // Disable session persistence to avoid potential header issues
      }
    })
    console.log('✅ Supabase client initialized successfully')
  } catch (error) {
    console.warn('⚠️ Failed to initialize Supabase client:', error)
    supabase = null
  }
} else {
  console.log('ℹ️ Supabase credentials not configured - running in CSV-only mode')
}

export { supabase }
export const isSupabaseEnabled = () => supabase !== null

// Helper function to check if we can use database features
export const canUseDatabase = async (): Promise<boolean> => {
  if (!supabase) return false

  try {
    const { error } = await supabase.from('campaign_data').select('count', { count: 'exact', head: true })
    return error === null || error.code === 'PGRST116'
  } catch {
    return false
  }
}

export type CampaignData = {
  id?: string
  date: string
  campaign_order_name: string
  impressions: number
  clicks: number
  revenue: number
  spend: number
  transactions?: number | null
  ctr?: number | null
  cpm?: number | null
  cpc?: number | null
  roas?: number | null
  data_source: string
  user_session_id?: string | null
  uploaded_at: string
  orangellow_corrected?: boolean
  original_spend?: number | null
  created_at?: string
  updated_at?: string
}

export type CampaignAnomalyData = {
  id?: string
  campaign_name: string
  anomaly_type: 'impression_change' | 'transaction_drop' | 'transaction_zero' | 'suspected_bot_activity'
  date_detected: string
  severity: 'high' | 'medium' | 'low'
  details: Record<string, unknown>
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

    if (error || !data || data.length === 0) return null
    return data[0].created_at ? new Date(data[0].created_at) : null
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

    if (error || !data || data.length === 0) return null
    return data[0].created_at ? new Date(data[0].created_at) : null
  } catch (error) {
    console.error('Error fetching last contract upload:', error)
    return null
  }
}