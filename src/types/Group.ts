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

export interface UserGroups {
  id: string
  role: MemberType
  invite_pending: boolean
  group: {
    id: string
    name: string
    slug: string
  }
}
export interface GroupUsers {
  // an array is returned here because of the one to many relationship
  group_members: Array<GroupMemberQuery>
  preferences: { name: string }
  // an array is returned here because of the one to many relationship
  calendars: Array<{
    calendars: Array<CalendarType>
  }>
}
interface GroupMemberQuery {
  address: string
  role: MemberType
  invite_pending: boolean
}
interface CalendarType {
  name: string
  sync: boolean
  color: string
  enabled: boolean
  calendarId: string
}
