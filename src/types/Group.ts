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
}
export interface GroupMember {
  displayName: string
  address: string
  role: MemberType
  invitePending: boolean
  calendarConnected: boolean
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
  group_invites: Array<GroupMemberQuery>
  preferences: { name: string }
  // an array is returned here because of the one-to-many relationship
  calendars: Array<{
    calendars: Array<CalendarType>
  }>
}

export interface GroupMemberQuery {
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
  user_id: string
  group_id: string
  role: MemberType
  email?: string
}

export interface GroupInvitePayload {
  invitees: {
    address?: string
    email?: string
    userId?: string
    role: 'admin' | 'member'
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
}
