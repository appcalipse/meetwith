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
  role: MemberType
  invite_pending: boolean
  address: string
  preferences: {
    name: string
  }
  calendars: {
    email: string
    calendars: Array<{ id: string; name: string }>
  }
}
