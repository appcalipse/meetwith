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

export interface GroupMember {
  displayName: string
  address: string
  role: MemberType
  invitePending: boolean
  calendarConnected: boolean
}

export interface EmptyGroupsResponse {
  id: string
  name: string
  slug: string
}

export type InvitedGroupsResponse = EmptyGroupsResponse

export interface UserGroups {
  id: string
  role: MemberType
  invitePending: boolean
  group: {
    id: string
    name: string
    slug: string
  }
}

export interface GroupUsers {
  // an array is returned here because of the one to many relationship
  group_members: Array<GroupMemberQuery>
  group_invites: Array<GroupMemberQuery>
  preferences: { name: string }
  // an array is returned here because of the one to many relationship
  calendars: Array<{
    calendars: Array<CalendarType>
  }>
}

export interface GroupMemberQuery {
  member_id: string
  user_id: string
  role: MemberType
  email?: MemberType
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
}
