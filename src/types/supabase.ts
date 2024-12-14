export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
        Relationships: [
          {
            foreignKeyName: 'public_account_notifications_account_address_fkey'
            columns: ['account_address']
            isOneToOne: true
            referencedRelation: 'accounts'
            referencedColumns: ['address']
          }
        ]
      }
      account_preferences: {
        Row: {
          availabilities: Json
          availableTypes: Json[] | null
          description: string | null
          id: string
          meetingProviders:
            | Database['public']['Enums']['MeetingProvider'][]
            | null
          name: string | null
          owner_account_address: string
          socialLinks: Json[]
          timezone: string
        }
        Insert: {
          availabilities?: Json
          availableTypes?: Json[] | null
          description?: string | null
          id?: string
          meetingProviders?:
            | Database['public']['Enums']['MeetingProvider'][]
            | null
          name?: string | null
          owner_account_address: string
          socialLinks: Json[]
          timezone?: string
        }
        Update: {
          availabilities?: Json
          availableTypes?: Json[] | null
          description?: string | null
          id?: string
          meetingProviders?:
            | Database['public']['Enums']['MeetingProvider'][]
            | null
          name?: string | null
          owner_account_address?: string
          socialLinks?: Json[]
          timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: 'public_account_preferences_owner_account_address_fkey'
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
          encoded_signature: string | null
          id: string
          internal_pub_key: string | null
          is_invited: boolean | null
          nonce: string | null
        }
        Insert: {
          address: string
          created_at?: string | null
          encoded_signature?: string | null
          id?: string
          internal_pub_key?: string | null
          is_invited?: boolean | null
          nonce?: string | null
        }
        Update: {
          address?: string
          created_at?: string | null
          encoded_signature?: string | null
          id?: string
          internal_pub_key?: string | null
          is_invited?: boolean | null
          nonce?: string | null
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
        Relationships: [
          {
            foreignKeyName: 'public_connected_calendars_account_address_fkey'
            columns: ['account_address']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['address']
          }
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: number
          period: number
          plan_id: number
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: number
          period: number
          plan_id?: number
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: number
          period?: number
          plan_id?: number
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
        Relationships: [
          {
            foreignKeyName: 'public_discord_accounts_address_fkey'
            columns: ['address']
            isOneToOne: true
            referencedRelation: 'accounts'
            referencedColumns: ['address']
          }
        ]
      }
      emails: {
        Row: {
          created_at: string | null
          email: string | null
          id: number
          plan: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: number
          plan?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: number
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
        Relationships: [
          {
            foreignKeyName: 'public_gate_definition_owner_fkey'
            columns: ['owner']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['address']
          }
        ]
      }
      gate_usage: {
        Row: {
          gate_id: string
          gated_entity_id: string
          id: number
          type: string
        }
        Insert: {
          gate_id: string
          gated_entity_id: string
          id?: number
          type: string
        }
        Update: {
          gate_id?: string
          gated_entity_id?: string
          id?: number
          type?: string
        }
        Relationships: []
      }
      group_invites: {
        Row: {
          discord_id: string | null
          email: string | null
          group_id: string
          id: string
          role: Database['public']['Enums']['GroupRole']
          user_id: string | null
        }
        Insert: {
          discord_id?: string | null
          email?: string | null
          group_id: string
          id?: string
          role?: Database['public']['Enums']['GroupRole']
          user_id?: string | null
        }
        Update: {
          discord_id?: string | null
          email?: string | null
          group_id?: string
          id?: string
          role?: Database['public']['Enums']['GroupRole']
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'public_group_invites_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'public_group_invites_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['address']
          }
        ]
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
        Relationships: [
          {
            foreignKeyName: 'public_group_meeting_request_owner_fkey'
            columns: ['owner']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['address']
          }
        ]
      }
      group_members: {
        Row: {
          created_at: string
          group_id: string
          member_id: string
          role: Database['public']['Enums']['GroupRole']
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_id: string
          member_id: string
          role?: Database['public']['Enums']['GroupRole']
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          member_id?: string
          role?: Database['public']['Enums']['GroupRole']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'public_group_members_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'public_group_members_member_id_fkey'
            columns: ['member_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['address']
          }
        ]
      }
      groups: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      groups_to_meetings: {
        Row: {
          group_id: string
          meeting_id: string
        }
        Insert: {
          group_id: string
          meeting_id: string
        }
        Update: {
          group_id?: string
          meeting_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'public_groups_to_meetings_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'public_groups_to_meetings_meeting_id_fkey'
            columns: ['meeting_id']
            isOneToOne: false
            referencedRelation: 'group_meeting_request'
            referencedColumns: ['id']
          }
        ]
      }
      meetings: {
        Row: {
          access_type: string | null
          created_at: string | null
          end: string | null
          id: string
          meeting_url: string | null
          provider: string | null
          recurrence: Database['public']['Enums']['MeetingRepeat']
          reminders: Json[] | null
          start: string | null
        }
        Insert: {
          access_type?: string | null
          created_at?: string | null
          end?: string | null
          id: string
          meeting_url?: string | null
          provider?: string | null
          recurrence?: Database['public']['Enums']['MeetingRepeat']
          reminders?: Json[] | null
          start?: string | null
        }
        Update: {
          access_type?: string | null
          created_at?: string | null
          end?: string | null
          id?: string
          meeting_url?: string | null
          provider?: string | null
          recurrence?: Database['public']['Enums']['MeetingRepeat']
          reminders?: Json[] | null
          start?: string | null
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
          meeting_info_encrypted: Json | null
          recurrence: Database['public']['Enums']['MeetingRepeat']
          start: string | null
          version: number | null
        }
        Insert: {
          account_address?: string | null
          created_at?: string | null
          end?: string | null
          id: string
          meeting_info_encrypted?: Json | null
          recurrence?: Database['public']['Enums']['MeetingRepeat']
          start?: string | null
          version?: number | null
        }
        Update: {
          account_address?: string | null
          created_at?: string | null
          end?: string | null
          id?: string
          meeting_info_encrypted?: Json | null
          recurrence?: Database['public']['Enums']['MeetingRepeat']
          start?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'public_slots_account_address_fkey'
            columns: ['account_address']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['address']
          }
        ]
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
        Relationships: [
          {
            foreignKeyName: 'public_subscriptions_owner_account_fkey'
            columns: ['owner_account']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['address']
          }
        ]
      }
      telegram_connections: {
        Row: {
          account_address: string
          created_at: string
          id: number
          tg_id: string
        }
        Insert: {
          account_address: string
          created_at?: string
          id?: number
          tg_id: string
        }
        Update: {
          account_address?: string
          created_at?: string
          id?: number
          tg_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pending_connections_account_address_fkey'
            columns: ['account_address']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['address']
          }
        ]
      }
      video_meeting: {
        Row: {
          id: string
          isGuest: boolean
          slot_id: string | null
          videoMeeting: Json | null
        }
        Insert: {
          id?: string
          isGuest: boolean
          slot_id?: string | null
          videoMeeting?: Json | null
        }
        Update: {
          id?: string
          isGuest?: boolean
          slot_id?: string | null
          videoMeeting?: Json | null
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
      get_availability_types_for_account_preferences: {
        Args: {
          address: string
        }
        Returns: {
          id: number
          title: string
          url: string
          duration: unknown
          min_advance_time: unknown
        }[]
      }
    }
    Enums: {
      GroupRole: 'admin' | 'member'
      MeetingProvider:
        | 'huddle01'
        | 'google-meet'
        | 'zoom'
        | 'jitsi-meet'
        | 'custom'
      MeetingRepeat: 'no-repeat' | 'daily' | 'weekly' | 'monthly'
      VideoMeeting: 'None' | 'GoogleMeet'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, 'public'>]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
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
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] &
      PublicSchema['Views'])
  ? (PublicSchema['Tables'] &
      PublicSchema['Views'])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
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
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
  ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
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
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
  ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema['Enums']
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
  ? PublicSchema['Enums'][PublicEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema['CompositeTypes']
  ? PublicSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
  : never
export type GroupMembersRow =
  Database['public']['Tables']['group_members']['Row']
export type Row<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
