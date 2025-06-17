import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type MovieMetadata = {
  id?: number
  title: string
  genre: string
  cast: string
  director: string
  duration: string
  poster_url?: string
  created_at?: string
} 