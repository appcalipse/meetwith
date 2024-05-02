export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      account_notifications: {
        Row: {
          account_address: string
          id: number
          notification_types: Json | null
        }
        Insert: {
          account_address: string
          id?: number
          notification_types?: Json | null
        }
        Update: {
          account_address?: string
          id?: number
          notification_types?: Json | null
        }
        Relationships: []
      }
      account_notifications_duplicate: {
        Row: {
          account_address: string
          id: number
          notification_types: Json | null
        }
        Insert: {
          account_address: string
          id?: number
          notification_types?: Json | null
        }
        Update: {
          account_address?: string
          id?: number
          notification_types?: Json | null
        }
        Relationships: []
      }
      account_preferences: {
        Row: {
          availabilities: Json
          availableTypes: Json[]
          description: string | null
          id: string
          name: string | null
          owner_account_address: string
          socialLinks: Json[] | null
          timezone: string
        }
        Insert: {
          availabilities: Json
          availableTypes: Json[]
          description?: string | null
          id?: string
          name?: string | null
          owner_account_address: string
          socialLinks?: Json[] | null
          timezone: string
        }
        Update: {
          availabilities: Json
          availableTypes: Json[]
          description?: string | null
          id?: string
          name?: string | null
          owner_account_address?: string
          socialLinks?: Json[] | null
          timezone: string
        }
        Relationships: [
          {
            foreignKeyName: 'account_preferences_owner_account_address_fkey'
            columns: ['owner_account_address']
            isOneToOne: true
            referencedRelation: 'accounts'
            referencedColumns: ['address']
          }
        ]
      }
      accounts: {
        Row: {
          address: string
          created_at: string | null
          encoded_signature: string
          id: string
          internal_pub_key: string
          is_invited: boolean | null
          nonce: number
        }
        Insert: {
          address: string
          created_at?: string | null
          encoded_signature: string
          id?: string
          internal_pub_key: string
          is_invited?: boolean | null
          nonce: number
        }
        Update: {
          address?: string
          created_at?: string | null
          encoded_signature?: string
          id?: string
          internal_pub_key?: string
          is_invited?: boolean | null
          nonce?: number
        }
        Relationships: []
      }
      connected_calendars: {
        Row: {
          account_address: string
          calendars: Json | null
          created: string | null
          email: string
          id: number
          payload: string
          provider: string
          sync: boolean
          updated: string | null
        }
        Insert: {
          account_address: string
          calendars?: Json | null
          created?: string | null
          email: string
          id?: number
          payload: string
          provider: string
          sync?: boolean
          updated?: string | null
        }
        Update: {
          account_address?: string
          calendars?: Json | null
          created?: string | null
          email?: string
          id?: number
          payload?: string
          provider?: string
          sync?: boolean
          updated?: string | null
        }
        Relationships: []
      }
      discord_accounts: {
        Row: {
          access_token: Json
          address: string
          discord_id: string
          id: string
        }
        Insert: {
          access_token: Json
          address: string
          discord_id: string
          id?: string
        }
        Update: {
          access_token?: Json
          address?: string
          discord_id?: string
          id?: string
        }
        Relationships: []
      }
      emails: {
        Row: {
          created_at: string | null
          email: string
          plan: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          plan?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          plan?: string | null
        }
        Relationships: []
      }
      gate_definition: {
        Row: {
          definition: Json
          id: string
          owner: string
          title: string
        }
        Insert: {
          definition: Json
          id?: string
          owner: string
          title: string
        }
        Update: {
          definition?: Json
          id?: string
          owner?: string
          title?: string
        }
        Relationships: []
      }
      gate_usage: {
        Row: {
          gate_id: string
          gated_entity_id: string
          id: string
          type: string
        }
        Insert: {
          gate_id: string
          gated_entity_id: string
          id?: string
          type: string
        }
        Update: {
          gate_id?: string
          gated_entity_id?: string
          id?: string
          type?: string
        }
        Relationships: []
      }
      group_meeting_request: {
        Row: {
          duration_in_minutes: number
          id: string
          owner: string
          range_end: string | null
          range_start: string
          team_structure: Json | null
          title: string | null
        }
        Insert: {
          duration_in_minutes: number
          id?: string
          owner: string
          range_end?: string | null
          range_start: string
          team_structure?: Json | null
          title?: string | null
        }
        Update: {
          duration_in_minutes?: number
          id?: string
          owner?: string
          range_end?: string | null
          range_start?: string
          team_structure?: Json | null
          title?: string | null
        }
        Relationships: []
      }
      meetings: {
        Row: {
          access_type: string | null
          created_at: string
          end: string
          id: string
          meeting_url: string | null
          provider: string
          start: string
        }
        Insert: {
          access_type?: string | null
          created_at?: string
          end: string
          id: string
          meeting_url?: string | null
          provider: string
          start: string
        }
        Update: {
          access_type?: string | null
          created_at?: string
          end?: string
          id?: string
          meeting_url?: string | null
          provider?: string
          start?: string
        }
        Relationships: []
      }
      office_event_mapping: {
        Row: {
          mww_id: string
          office_id: string
        }
        Insert: {
          mww_id: string
          office_id: string
        }
        Update: {
          mww_id?: string
          office_id?: string
        }
        Relationships: []
      }
      slots: {
        Row: {
          account_address: string | null
          created_at: string | null
          end: string | null
          id: string
          meeting_info_file_path: string | null
          start: string | null
          version: number | null
        }
        Insert: {
          account_address?: string | null
          created_at?: string | null
          end?: string | null
          id: string
          meeting_info_file_path?: string | null
          start?: string | null
          version?: number | null
        }
        Update: {
          account_address?: string | null
          created_at?: string | null
          end?: string | null
          id?: string
          meeting_info_file_path?: string | null
          start?: string | null
          version?: number | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          chain: string
          config_ipfs_hash: string | null
          domain: string
          expiry_time: string
          id: string
          owner_account: string
          plan_id: number
          registered_at: string
        }
        Insert: {
          chain: string
          config_ipfs_hash?: string | null
          domain: string
          expiry_time: string
          id?: string
          owner_account: string
          plan_id: number
          registered_at: string
        }
        Update: {
          chain?: string
          config_ipfs_hash?: string | null
          domain?: string
          expiry_time?: string
          id?: string
          owner_account?: string
          plan_id?: number
          registered_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fetch_account: {
        Args: {
          identifier: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database['public']['Tables'] & Database['public']['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database['public']['Tables'] &
      Database['public']['Views'])
  ? (Database['public']['Tables'] &
      Database['public']['Views'])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
  ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
  ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database['public']['Enums']
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof Database['public']['Enums']
  ? Database['public']['Enums'][PublicEnumNameOrOptions]
  : never
