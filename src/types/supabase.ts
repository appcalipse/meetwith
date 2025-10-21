export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '10.2.0 (e07807d)'
  }
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
          availaibility_id: string | null
          avatar_url: string | null
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
          availaibility_id?: string | null
          avatar_url?: string | null
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
          availaibility_id?: string | null
          avatar_url?: string | null
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
            foreignKeyName: 'account_preferences_availaibility_id_fkey'
            columns: ['availaibility_id']
            isOneToOne: false
            referencedRelation: 'availabilities'
            referencedColumns: ['id']
          },
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
      availabilities: {
        Row: {
          account_owner_address: string
          created_at: string
          id: string
          timezone: string | null
          title: string | null
          updated_at: string
          weekly_availability: Json
        }
        Insert: {
          account_owner_address: string
          created_at?: string
          id?: string
          timezone?: string | null
          title?: string | null
          updated_at?: string
          weekly_availability: Json
        }
        Update: {
          account_owner_address?: string
          created_at?: string
          id?: string
          timezone?: string | null
          title?: string | null
          updated_at?: string
          weekly_availability?: Json
        }
        Relationships: [
          {
            foreignKeyName: 'availabilities_account_owner_address_fkey'
            columns: ['account_owner_address']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['address']
          }
        ]
      }
      calendar_webhooks: {
        Row: {
          calendar_id: string
          channel_id: string
          connected_calendar_id: number
          created_at: string
          expires_at: string
          id: number
          resource_id: string
        }
        Insert: {
          calendar_id: string
          channel_id: string
          connected_calendar_id: number
          created_at?: string
          expires_at: string
          id?: number
          resource_id: string
        }
        Update: {
          calendar_id?: string
          channel_id?: string
          connected_calendar_id?: number
          created_at?: string
          expires_at?: string
          id?: number
          resource_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'calendar_webhooks_connected_calendar_id_fkey'
            columns: ['connected_calendar_id']
            isOneToOne: false
            referencedRelation: 'connected_calendars'
            referencedColumns: ['id']
          }
        ]
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
      contact: {
        Row: {
          account_owner_address: string
          contact_address: string
          created_at: string
          id: string
          status: Database['public']['Enums']['ContactStatus']
        }
        Insert: {
          account_owner_address: string
          contact_address: string
          created_at?: string
          id?: string
          status: Database['public']['Enums']['ContactStatus']
        }
        Update: {
          account_owner_address?: string
          contact_address?: string
          created_at?: string
          id?: string
          status?: Database['public']['Enums']['ContactStatus']
        }
        Relationships: [
          {
            foreignKeyName: 'contact_contact_address_fkey'
            columns: ['contact_address']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['address']
          }
        ]
      }
      contact_invite: {
        Row: {
          account_owner_address: string
          channel: Database['public']['Enums']['ChannelType']
          created_at: string
          destination: string
          id: string
          last_invited: string | null
        }
        Insert: {
          account_owner_address: string
          channel?: Database['public']['Enums']['ChannelType']
          created_at?: string
          destination: string
          id?: string
          last_invited?: string | null
        }
        Update: {
          account_owner_address?: string
          channel?: Database['public']['Enums']['ChannelType']
          created_at?: string
          destination?: string
          id?: string
          last_invited?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'contact_invite_account_owner_address_fkey'
            columns: ['account_owner_address']
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
          id: number
          max_users: number
          period: number
          plan_id: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: number
          max_users?: number
          period: number
          plan_id?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: number
          max_users?: number
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
          created_at: string
          discord_id: string | null
          email: string | null
          group_id: string
          id: string
          role: Database['public']['Enums']['GroupRole']
          user_id: string | null
        }
        Insert: {
          created_at?: string
          discord_id?: string | null
          email?: string | null
          group_id: string
          id?: string
          role?: Database['public']['Enums']['GroupRole']
          user_id?: string | null
        }
        Update: {
          created_at?: string
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
      meeting_sessions: {
        Row: {
          created_at: string
          guest_address: string | null
          guest_email: string | null
          guest_name: string | null
          id: number
          meeting_id: string | null
          meeting_type_id: string
          owner_address: string
          session_number: number
          transaction_id: string
          updated_at: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          guest_address?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: number
          meeting_id?: string | null
          meeting_type_id: string
          owner_address: string
          session_number: number
          transaction_id: string
          updated_at?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          guest_address?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: number
          meeting_id?: string | null
          meeting_type_id?: string
          owner_address?: string
          session_number?: number
          transaction_id?: string
          updated_at?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'meeting_sessions_guest_address_fkey'
            columns: ['guest_address']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['address']
          },
          {
            foreignKeyName: 'meeting_sessions_meeting_type_id_fkey'
            columns: ['meeting_type_id']
            isOneToOne: false
            referencedRelation: 'meeting_type'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'meeting_sessions_owner_address_fkey'
            columns: ['owner_address']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['address']
          },
          {
            foreignKeyName: 'meeting_sessions_transaction_id_fkey'
            columns: ['transaction_id']
            isOneToOne: false
            referencedRelation: 'transactions'
            referencedColumns: ['id']
          }
        ]
      }
      meeting_type: {
        Row: {
          account_owner_address: string
          created_at: string
          custom_link: string | null
          deleted_at: string | null
          description: string | null
          duration_minutes: number | null
          fixed_link: boolean
          id: string
          meeting_platforms:
            | Database['public']['Enums']['MeetingProvider'][]
            | null
          min_notice_minutes: number | null
          slug: string | null
          title: string | null
          type: Database['public']['Enums']['SessionType']
          updated_at: string
        }
        Insert: {
          account_owner_address: string
          created_at?: string
          custom_link?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          fixed_link?: boolean
          id?: string
          meeting_platforms?:
            | Database['public']['Enums']['MeetingProvider'][]
            | null
          min_notice_minutes?: number | null
          slug?: string | null
          title?: string | null
          type?: Database['public']['Enums']['SessionType']
          updated_at?: string
        }
        Update: {
          account_owner_address?: string
          created_at?: string
          custom_link?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          fixed_link?: boolean
          id?: string
          meeting_platforms?:
            | Database['public']['Enums']['MeetingProvider'][]
            | null
          min_notice_minutes?: number | null
          slug?: string | null
          title?: string | null
          type?: Database['public']['Enums']['SessionType']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'meeting_type_account_owner_address_fkey'
            columns: ['account_owner_address']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['address']
          }
        ]
      }
      meeting_type_availabilities: {
        Row: {
          availability_id: string
          created_at: string
          id: string
          meeting_type_id: string
        }
        Insert: {
          availability_id: string
          created_at?: string
          id?: string
          meeting_type_id: string
        }
        Update: {
          availability_id?: string
          created_at?: string
          id?: string
          meeting_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'meeting_type_availabilities_availability_id_fkey'
            columns: ['availability_id']
            isOneToOne: false
            referencedRelation: 'availabilities'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'meeting_type_availabilities_meeting_type_id_fkey'
            columns: ['meeting_type_id']
            isOneToOne: false
            referencedRelation: 'meeting_type'
            referencedColumns: ['id']
          }
        ]
      }
      meeting_type_calendars: {
        Row: {
          calendar_id: number
          created_at: string
          id: string
          meeting_type_id: string
        }
        Insert: {
          calendar_id: number
          created_at?: string
          id?: string
          meeting_type_id: string
        }
        Update: {
          calendar_id?: number
          created_at?: string
          id?: string
          meeting_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'meeting_type_calendars_calendar_id_fkey'
            columns: ['calendar_id']
            isOneToOne: false
            referencedRelation: 'connected_calendars'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'meeting_type_calendars_meeting_type_id_fkey'
            columns: ['meeting_type_id']
            isOneToOne: false
            referencedRelation: 'meeting_type'
            referencedColumns: ['id']
          }
        ]
      }
      meeting_type_plan: {
        Row: {
          created_at: string
          default_chain_id: number
          default_token: Database['public']['Enums']['AcceptedToken'] | null
          id: number
          meeting_type_id: string
          no_of_slot: number
          payment_address: string
          payment_channel: Database['public']['Enums']['PaymentChannel']
          price_per_slot: number
          type: Database['public']['Enums']['PlanType']
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          default_chain_id: number
          default_token?: Database['public']['Enums']['AcceptedToken'] | null
          id?: number
          meeting_type_id: string
          no_of_slot?: number
          payment_address: string
          payment_channel: Database['public']['Enums']['PaymentChannel']
          price_per_slot: number
          type: Database['public']['Enums']['PlanType']
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          default_chain_id?: number
          default_token?: Database['public']['Enums']['AcceptedToken'] | null
          id?: number
          meeting_type_id?: string
          no_of_slot?: number
          payment_address?: string
          payment_channel?: Database['public']['Enums']['PaymentChannel']
          price_per_slot?: number
          type?: Database['public']['Enums']['PlanType']
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'meeting_type_plan_meeting_type_id_fkey'
            columns: ['meeting_type_id']
            isOneToOne: false
            referencedRelation: 'meeting_type'
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
          permissions:
            | Database['public']['Enums']['MeetingPermissions'][]
            | null
          provider: string | null
          recurrence: Database['public']['Enums']['MeetingRepeat']
          reminders: Json[] | null
          slots: string[]
          start: string | null
          title: string | null
          version: Database['public']['Enums']['MeetingVersion'] | null
        }
        Insert: {
          access_type?: string | null
          created_at?: string | null
          end?: string | null
          id: string
          meeting_url?: string | null
          permissions?:
            | Database['public']['Enums']['MeetingPermissions'][]
            | null
          provider?: string | null
          recurrence?: Database['public']['Enums']['MeetingRepeat']
          reminders?: Json[] | null
          slots: string[]
          start?: string | null
          title?: string | null
          version?: Database['public']['Enums']['MeetingVersion'] | null
        }
        Update: {
          access_type?: string | null
          created_at?: string | null
          end?: string | null
          id?: string
          meeting_url?: string | null
          permissions?:
            | Database['public']['Enums']['MeetingPermissions'][]
            | null
          provider?: string | null
          recurrence?: Database['public']['Enums']['MeetingRepeat']
          reminders?: Json[] | null
          slots?: string[]
          start?: string | null
          title?: string | null
          version?: Database['public']['Enums']['MeetingVersion'] | null
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
      payment_accounts: {
        Row: {
          created_at: string | null
          id: number
          onboarded: boolean | null
          owner_account_address: string
          provider: Database['public']['Enums']['PaymentProvider']
          provider_account_id: string
          status: Database['public']['Enums']['PaymentAccountStatus']
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: number
          onboarded?: boolean | null
          owner_account_address: string
          provider: Database['public']['Enums']['PaymentProvider']
          provider_account_id: string
          status: Database['public']['Enums']['PaymentAccountStatus']
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          onboarded?: boolean | null
          owner_account_address?: string
          provider?: Database['public']['Enums']['PaymentProvider']
          provider_account_id?: string
          status?: Database['public']['Enums']['PaymentAccountStatus']
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_preferences: {
        Row: {
          created_at: string
          default_chain_id: number | null
          id: number
          notification: Database['public']['Enums']['AccountPreferenceNotification'][]
          owner_account_address: string
          pin_hash: string | null
        }
        Insert: {
          created_at?: string
          default_chain_id?: number | null
          id?: number
          notification: Database['public']['Enums']['AccountPreferenceNotification'][]
          owner_account_address: string
          pin_hash?: string | null
        }
        Update: {
          created_at?: string
          default_chain_id?: number | null
          id?: number
          notification?: Database['public']['Enums']['AccountPreferenceNotification'][]
          owner_account_address?: string
          pin_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'payment_preferences_owner_account_address_fkey'
            columns: ['owner_account_address']
            isOneToOne: true
            referencedRelation: 'accounts'
            referencedColumns: ['address']
          }
        ]
      }
      quick_poll_calendars: {
        Row: {
          created_at: string
          email: string
          id: number
          participant_id: string | null
          payload: Json | null
          provider: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: number
          participant_id?: string | null
          payload?: Json | null
          provider: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: number
          participant_id?: string | null
          payload?: Json | null
          provider?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'quick_poll_calendars_participant_id_fkey'
            columns: ['participant_id']
            isOneToOne: false
            referencedRelation: 'quick_poll_participants'
            referencedColumns: ['id']
          }
        ]
      }
      quick_poll_participants: {
        Row: {
          account_address: string | null
          available_slots: Json[]
          created_at: string
          guest_email: string
          guest_name: string | null
          id: string
          participant_type:
            | Database['public']['Enums']['QuickPollParticipantType']
            | null
          poll_id: string
          status: Database['public']['Enums']['QuickPollParticipantStatus']
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          account_address?: string | null
          available_slots?: Json[]
          created_at?: string
          guest_email: string
          guest_name?: string | null
          id?: string
          participant_type?:
            | Database['public']['Enums']['QuickPollParticipantType']
            | null
          poll_id?: string
          status: Database['public']['Enums']['QuickPollParticipantStatus']
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          account_address?: string | null
          available_slots?: Json[]
          created_at?: string
          guest_email?: string
          guest_name?: string | null
          id?: string
          participant_type?:
            | Database['public']['Enums']['QuickPollParticipantType']
            | null
          poll_id?: string
          status?: Database['public']['Enums']['QuickPollParticipantStatus']
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'quick_poll_participants_account_address_fkey'
            columns: ['account_address']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['address']
          },
          {
            foreignKeyName: 'quick_poll_participants_poll_id_fkey'
            columns: ['poll_id']
            isOneToOne: false
            referencedRelation: 'quick_polls'
            referencedColumns: ['id']
          }
        ]
      }
      quick_polls: {
        Row: {
          created_at: string
          description: string
          duration_minutes: number
          ends_at: string
          expires_at: string
          id: string
          meeting_url: string | null
          permissions: Database['public']['Enums']['MeetingPermissions'][]
          slug: string | null
          starts_at: string
          status: Database['public']['Enums']['PollStatus']
          title: string
          updated_at: string | null
          visibility: Database['public']['Enums']['PollVisibility']
        }
        Insert: {
          created_at?: string
          description: string
          duration_minutes: number
          ends_at: string
          expires_at: string
          id?: string
          meeting_url?: string | null
          permissions: Database['public']['Enums']['MeetingPermissions'][]
          slug?: string | null
          starts_at: string
          status?: Database['public']['Enums']['PollStatus']
          title: string
          updated_at?: string | null
          visibility?: Database['public']['Enums']['PollVisibility']
        }
        Update: {
          created_at?: string
          description?: string
          duration_minutes?: number
          ends_at?: string
          expires_at?: string
          id?: string
          meeting_url?: string | null
          permissions?: Database['public']['Enums']['MeetingPermissions'][]
          slug?: string | null
          starts_at?: string
          status?: Database['public']['Enums']['PollStatus']
          title?: string
          updated_at?: string | null
          visibility?: Database['public']['Enums']['PollVisibility']
        }
        Relationships: []
      }
      result: {
        Row: {
          jsonb_agg: Json | null
        }
        Insert: {
          jsonb_agg?: Json | null
        }
        Update: {
          jsonb_agg?: Json | null
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
          role: Database['public']['Enums']['ParticipantType'] | null
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
          role?: Database['public']['Enums']['ParticipantType'] | null
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
          role?: Database['public']['Enums']['ParticipantType'] | null
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
      temp_slots: {
        Row: {
          account_address: string
          created_at: string | null
          end: string
          id: string
          meeting_info_encrypted: Json
          recurrence: Database['public']['Enums']['MeetingRepeat']
          role: Database['public']['Enums']['ParticipantType']
          slot_id: string
          start: string
          status: Database['public']['Enums']['RecurringStatus']
          version: number
        }
        Insert: {
          account_address: string
          created_at?: string | null
          end: string
          id: string
          meeting_info_encrypted: Json
          recurrence?: Database['public']['Enums']['MeetingRepeat']
          role: Database['public']['Enums']['ParticipantType']
          slot_id?: string
          start: string
          status: Database['public']['Enums']['RecurringStatus']
          version?: number
        }
        Update: {
          account_address?: string
          created_at?: string | null
          end?: string
          id?: string
          meeting_info_encrypted?: Json
          recurrence?: Database['public']['Enums']['MeetingRepeat']
          role?: Database['public']['Enums']['ParticipantType']
          slot_id?: string
          start?: string
          status?: Database['public']['Enums']['RecurringStatus']
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'temp_slots_account_address_fkey'
            columns: ['account_address']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['address']
          }
        ]
      }
      transactions: {
        Row: {
          amount: number | null
          chain_id: number | null
          confirmed_at: string | null
          created_at: string
          currency: string | null
          direction: Database['public']['Enums']['PaymentDirection']
          fee_breakdown: Json | null
          fiat_equivalent: number | null
          id: string
          initiator_address: string | null
          meeting_type_id: string | null
          metadata: Json
          method: Database['public']['Enums']['PaymentType']
          provider_reference_id: string | null
          status: Database['public']['Enums']['PaymentStatus']
          token_address: string | null
          token_type: Database['public']['Enums']['TokenType'] | null
          total_fee: number | null
          transaction_hash: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          chain_id?: number | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string | null
          direction?: Database['public']['Enums']['PaymentDirection']
          fee_breakdown?: Json | null
          fiat_equivalent?: number | null
          id?: string
          initiator_address?: string | null
          meeting_type_id?: string | null
          metadata: Json
          method: Database['public']['Enums']['PaymentType']
          provider_reference_id?: string | null
          status: Database['public']['Enums']['PaymentStatus']
          token_address?: string | null
          token_type?: Database['public']['Enums']['TokenType'] | null
          total_fee?: number | null
          transaction_hash?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          chain_id?: number | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string | null
          direction?: Database['public']['Enums']['PaymentDirection']
          fee_breakdown?: Json | null
          fiat_equivalent?: number | null
          id?: string
          initiator_address?: string | null
          meeting_type_id?: string | null
          metadata?: Json
          method?: Database['public']['Enums']['PaymentType']
          provider_reference_id?: string | null
          status?: Database['public']['Enums']['PaymentStatus']
          token_address?: string | null
          token_type?: Database['public']['Enums']['TokenType'] | null
          total_fee?: number | null
          transaction_hash?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'transactions_meeting_type_id_fkey'
            columns: ['meeting_type_id']
            isOneToOne: false
            referencedRelation: 'meeting_type'
            referencedColumns: ['id']
          }
        ]
      }
      verifications: {
        Row: {
          channel: Database['public']['Enums']['VerificationChannel']
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          owner_account_address: string
        }
        Insert: {
          channel: Database['public']['Enums']['VerificationChannel']
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          owner_account_address: string
        }
        Update: {
          channel?: Database['public']['Enums']['VerificationChannel']
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          owner_account_address?: string
        }
        Relationships: [
          {
            foreignKeyName: 'verifications_owner_account_address_fkey'
            columns: ['owner_account_address']
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
      check_contact_existence: {
        Args: { current_account: string; user_address: string }
        Returns: boolean
      }
      fetch_account: {
        Args: { identifier: string }
        Returns: Json
      }
      find_account: {
        Args: { identifier: string }
        Returns: Json
      }
      get_accounts: {
        Args: { address: string; max: number; search: string; skip: number }
        Returns: Record<string, unknown>
      }
      get_accounts_by_calendar_email: {
        Args: {
          p_address: string
          p_email: string
          p_limit?: number
          p_offset?: number
        }
        Returns: Json
      }
      get_availability_types_for_account_preferences: {
        Args: { address: string }
        Returns: {
          duration: unknown
          id: number
          min_advance_time: unknown
          title: string
          url: string
        }[]
      }
      get_discord_notifications: {
        Args: Record<PropertyKey, never>
        Returns: {
          account_address: string
          discord_id: string
          timezone: string
        }[]
      }
      get_group_invites_with_search: {
        Args: {
          limit_count?: number
          offset_count?: number
          search_term?: string
          target_discord_id?: string
          target_email?: string
          target_group_id?: string
          target_user_id?: string
          user_address?: string
        }
        Returns: {
          group_id: string
          group_name: string
          group_slug: string
          id: string
          invite_pending: boolean
          role: string
        }[]
      }
      get_paid_sessions: {
        Args:
          | { account_address: string; current_account: string }
          | { current_account: string }
        Returns: Json
      }
      get_telegram_notifications: {
        Args: Record<PropertyKey, never>
        Returns: {
          account_address: string
          telegram_id: string
          timezone: string
        }[]
      }
      get_user_groups_with_members: {
        Args: {
          limit_count?: number
          offset_count?: number
          search_term?: string
          user_address: string
        }
        Returns: {
          id: string
          members: Json
          name: string
          role: string
          slug: string
        }[]
      }
      search_accounts: {
        Args: {
          current_address?: string
          max_results?: number
          search?: string
          skip?: number
        }
        Returns: {
          result: Json
          total_count: number
        }[]
      }
      search_contact_invites: {
        Args: {
          current_account?: string
          current_account_email?: string
          max_results?: number
          search?: string
          skip?: number
        }
        Returns: Json
      }
      search_contacts: {
        Args: {
          current_account: string
          max_results: number
          search: string
          skip: number
        }
        Returns: Json
      }
      search_contacts_lean: {
        Args: {
          current_account: string
          max_results: number
          search: string
          skip: number
        }
        Returns: Json
      }
    }
    Enums: {
      AcceptedToken:
        | 'ETHER'
        | 'USDT'
        | 'EUR'
        | 'CUSD'
        | 'CELO'
        | 'CEUR'
        | 'USDC'
        | 'DAI'
        | 'METIS'
        | 'MATIC'
      AccountPreferenceNotification: 'send-tokens' | 'receive-tokens'
      ChannelType: 'discord' | 'email' | 'account' | 'telegram'
      ContactStatus: 'active' | 'inactive'
      GroupRole: 'admin' | 'member'
      MeetingPermissions: 'see_guest_list' | 'invite_guests' | 'edit_meeting'
      MeetingProvider:
        | 'huddle01'
        | 'google-meet'
        | 'zoom'
        | 'jitsi-meet'
        | 'custom'
      MeetingRepeat: 'no-repeat' | 'daily' | 'weekly' | 'monthly'
      MeetingVersion: 'V1' | 'V2'
      ParticipantType: 'scheduler' | 'owner' | 'invitee'
      PaymentAccountStatus: 'pending' | 'connected' | 'disconnected' | 'failed'
      PaymentChannel: 'account_address' | 'custom_address'
      PaymentDirection: 'debit' | 'credit'
      PaymentProvider: 'stripe'
      PaymentStatus: 'cancelled' | 'pending' | 'completed' | 'failed'
      PaymentType: 'fiat' | 'crypto'
      PlanType: 'one_off' | 'sessions'
      PollStatus: 'ongoing' | 'completed' | 'cancelled' | 'expired'
      PollVisibility: 'public' | 'private'
      QuickPollParticipantStatus: 'pending' | 'declined' | 'accepted'
      QuickPollParticipantType: 'scheduler' | 'invitee' | 'owner'
      RecurringStatus: 'confirmed' | 'cancelled'
      SessionType: 'paid' | 'free'
      TokenType: 'erc20' | 'erc721' | 'stablecoin' | 'nft' | 'native'
      VerificationChannel: 'transaction-pin' | 'reset-email'
      VideoMeeting: 'None' | 'GoogleMeet'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
      DefaultSchema['Views'])
  ? (DefaultSchema['Tables'] &
      DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
  ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
  ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
  ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
  ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {
      AcceptedToken: [
        'ETHER',
        'USDT',
        'EUR',
        'CUSD',
        'CELO',
        'CEUR',
        'USDC',
        'DAI',
        'METIS',
        'MATIC',
      ],
      AccountPreferenceNotification: ['send-tokens', 'receive-tokens'],
      ChannelType: ['discord', 'email', 'account', 'telegram'],
      ContactStatus: ['active', 'inactive'],
      GroupRole: ['admin', 'member'],
      MeetingPermissions: ['see_guest_list', 'invite_guests', 'edit_meeting'],
      MeetingProvider: [
        'huddle01',
        'google-meet',
        'zoom',
        'jitsi-meet',
        'custom',
      ],
      MeetingRepeat: ['no-repeat', 'daily', 'weekly', 'monthly'],
      MeetingVersion: ['V1', 'V2'],
      ParticipantType: ['scheduler', 'owner', 'invitee'],
      PaymentAccountStatus: ['pending', 'connected', 'disconnected', 'failed'],
      PaymentChannel: ['account_address', 'custom_address'],
      PaymentDirection: ['debit', 'credit'],
      PaymentProvider: ['stripe'],
      PaymentStatus: ['cancelled', 'pending', 'completed', 'failed'],
      PaymentType: ['fiat', 'crypto'],
      PlanType: ['one_off', 'sessions'],
      PollStatus: ['ongoing', 'completed', 'cancelled', 'expired'],
      PollVisibility: ['public', 'private'],
      QuickPollParticipantStatus: ['pending', 'declined', 'accepted'],
      QuickPollParticipantType: ['scheduler', 'invitee', 'owner'],
      RecurringStatus: ['confirmed', 'cancelled'],
      SessionType: ['paid', 'free'],
      TokenType: ['erc20', 'erc721', 'stablecoin', 'nft', 'native'],
      VerificationChannel: ['transaction-pin', 'reset-email'],
      VideoMeeting: ['None', 'GoogleMeet'],
    },
  },
} as const
