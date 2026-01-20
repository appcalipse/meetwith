import { AvailabilityBlock } from './availability'
import { Subscription } from './Subscription'

export enum MemberType {
  ADMIN = 'admin',
  MEMBER = 'member',
}

export interface GetGroupsResponse {
  id: string
  name: string
  slug: string
  role: MemberType
  invitePending: boolean
}
export interface GetGroupsFullResponse {
  id: string
  name: string
  slug: string
  avatar_url?: string | null
  description?: string | null
  members: Array<GroupMember>
  member_availabilities?: AvailabilityBlock[]
}

export interface CreateGroupsResponse {
  id: string
  name: string
  slug: string
}

export interface GroupInvitesResponse {
  id: string
  userId?: string
  email?: string
  discordId?: string
  groupId: string
}

export interface Group {
  id: string
  name: string
  slug: string
  avatar_url?: string | null
  description?: string | null
}
export interface GroupMember {
  displayName: string
  address?: string
  avatar_url?: string
  role: MemberType
  userId?: string
  invitePending: boolean
  domain?: string
  isContact?: boolean
  hasContactInvite?: boolean
}

export interface UpdateGroupPayload {
  name?: string
  slug?: string
  avatar_url?: string
  description?: string
}

export interface RemoveGroupMemberPayload {
  member_id: string
  invite_pending: boolean
}
export type EmptyGroupsResponse = Group

export type InvitedGroupsResponse = EmptyGroupsResponse

export interface UserGroups {
  id: string
  role: MemberType
  invitePending: boolean
  group: Group
}

export interface GroupUsers {
  // an array is returned here because of the one-to-many relationship
  group_members: Array<GroupMemberQuery>
  group_invites: Array<GroupInvites>
  preferences: { name: string }
  // an array is returned here because of the one-to-many relationship
  calendars: Array<{
    calendars?: Array<CalendarType>
  }>
  subscriptions: Array<Subscription>
}
export interface GroupMemberQuery {
  id: string
  member_id: string
  user_id: string
  role: MemberType
  email?: string
  group_id?: string
}

interface CalendarType {
  name: string
  sync: boolean
  color: string
  enabled: boolean
  calendarId: string
}

export interface MenuOptions {
  label: string
  important?: boolean
  link?: string
  onClick?: () => void
}
export interface GroupInvites {
  id: string
  email: string | null
  discord_id: string | null
  user_id: string | null
  group_id: string
  role: MemberType
}

export interface GroupInvitePayload {
  invitees: {
    address?: string
    email?: string
    userId?: string
    role: MemberType
    name?: string
    contactId?: string
  }[]
  message?: string
}

export interface GroupInvitesResponse {
  id: string
  email?: string
  discordId?: string
  userId?: string
  groupId: string
}

export interface GroupInviteFilters {
  address?: string
  group_id?: string
  user_id?: string
  email?: string
  discord_id?: string
  limit?: number
  offset?: number
  search?: string
}

export interface CreateGroupPayload {
  name: string
  slug?: string
}

export interface GetGroupsFullResponseWithMetadata {
  groups: Array<GetGroupsFullResponse>
  total: number
  isPro: boolean
  upgradeRequired: boolean
}

export interface GroupMemberAvailability {
  groupId: string
  memberAddress: string
  availabilityBlocks: AvailabilityBlock[]
}
