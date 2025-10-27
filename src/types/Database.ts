import { Database } from '@/types/Supabase'

export type Row<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
