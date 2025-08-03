import { createClient } from '@supabase/supabase-js'

import {
  CreateGroupsResponse,
  EmptyGroupsResponse,
  GetGroupsFullResponse,
  Group,
  GroupInviteFilters,
  GroupInvitesResponse,
  GroupMemberQuery,
  GroupUsers,
  MemberType,
  UserGroups,
} from '@/types/Group'
import {
  addUserToGroup,
  addUserToGroupInvites,
  changeGroupRole,
  createGroupInDB,
  createGroupInvite,
  deleteGroup,
  deleteGroupInvites,
  deleteGroupMembers,
  editGroup,
  findGroupsWithSingleMember,
  getGroup,
  getGroupAdminsFromDb,
  getGroupInternal,
  getGroupInvite,
  getGroupInvites,
  getGroupMembersInternal,
  getGroupName,
  getGroupsAndMembers,
  getGroupsEmpty,
  getGroupUsers,
  getGroupUsersInternal,
  getUserGroups,
  isGroupAdmin,
  isGroupExists,
  isUserAdminOfGroup,
  leaveGroup,
  manageGroupInvite,
  publicGroupJoin,
  rejectGroupInvite,
  removeMember,
  updateGroupInviteUserId,
} from '@/utils/database'

// Mock Supabase
jest.mock('@supabase/supabase-js')

const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  ilike: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  is: jest.fn().mockReturnThis(),
}

const mockCreateClient = createClient as jest.MockedFunction<
  typeof createClient
>
mockCreateClient.mockReturnValue(mockSupabaseClient as any)

describe('Database Group Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabaseClient.from.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.select.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.insert.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.update.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.delete.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.or.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.ilike.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.order.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.limit.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.offset.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.single.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.in.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.gte.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.lte.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.gt.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.lt.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.neq.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.is.mockReturnValue(mockSupabaseClient)
  })

  describe('getUserGroups', () => {
    const mockUserGroups: UserGroups[] = [
      {
        id: 'group-1',
        role: MemberType.ADMIN,
        invitePending: false,
        group: {
          id: 'group-1',
          name: 'Test Group',
          slug: 'test-group',
        },
      },
    ]

    it('should get user groups successfully', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: mockUserGroups,
        error: null,
      })

      const result = await getUserGroups(
        '0x1234567890123456789012345678901234567890',
        10,
        0
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_groups')
      expect(result).toEqual(mockUserGroups)
    })

    it('should get user groups with email filter', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: mockUserGroups,
        error: null,
      })

      await getUserGroups(
        '0x1234567890123456789012345678901234567890',
        10,
        0,
        'test@example.com'
      )

      expect(mockSupabaseClient.ilike).toHaveBeenCalledWith(
        'email',
        '%test@example.com%'
      )
    })
  })

  describe('getGroupsAndMembers', () => {
    const mockGroupsAndMembers: GetGroupsFullResponse[] = [
      {
        id: 'group-1',
        name: 'Test Group',
        slug: 'test-group',
        members: [
          {
            displayName: 'Test User',
            address: '0x1234567890123456789012345678901234567890',
            role: MemberType.ADMIN,
            invitePending: false,
          },
        ],
      },
    ]

    it('should get groups and members successfully', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: mockGroupsAndMembers,
        error: null,
      })

      const result = await getGroupsAndMembers(
        '0x1234567890123456789012345678901234567890',
        10,
        0
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('groups')
      expect(result).toEqual(mockGroupsAndMembers)
    })
  })

  describe('findGroupsWithSingleMember', () => {
    const mockEmptyGroups: EmptyGroupsResponse[] = [
      {
        id: 'group-1',
        name: 'Test Group',
        slug: 'test-group',
      },
    ]

    it('should find groups with single member successfully', async () => {
      mockSupabaseClient.in.mockResolvedValue({
        data: mockEmptyGroups,
        error: null,
      })

      const result = await findGroupsWithSingleMember(['group-1', 'group-2'])

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('groups')
      expect(result).toEqual(mockEmptyGroups)
    })
  })

  describe('getGroupsEmpty', () => {
    const mockEmptyGroups: EmptyGroupsResponse[] = [
      {
        id: 'group-1',
        name: 'Test Group',
        slug: 'test-group',
      },
    ]

    it('should get empty groups successfully', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: mockEmptyGroups,
        error: null,
      })

      const result = await getGroupsEmpty(
        '0x1234567890123456789012345678901234567890'
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('groups')
      expect(result).toEqual(mockEmptyGroups)
    })
  })

  describe('getGroupInvite', () => {
    const mockGroupInvite: GroupInvitesResponse = {
      id: 'invite-1',
      email: 'test@example.com',
      discordId: 'discord-123',
      userId: 'user-123',
      groupId: 'group-1',
    }

    it('should get group invite by email successfully', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: mockGroupInvite,
        error: null,
      })

      const result = await getGroupInvite({ email: 'test@example.com' })

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('group_invites')
      expect(result).toEqual(mockGroupInvite)
    })

    it('should get group invite by user_id successfully', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: mockGroupInvite,
        error: null,
      })

      const result = await getGroupInvite({ user_id: 'user-123' })

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('group_invites')
      expect(result).toEqual(mockGroupInvite)
    })

    it('should return null when invite not found', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await getGroupInvite({ email: 'test@example.com' })

      expect(result).toBeNull()
    })
  })

  describe('getGroupName', () => {
    const mockGroup: Group = {
      id: 'group-1',
      name: 'Test Group',
      slug: 'test-group',
    }

    it('should get group name successfully', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: mockGroup,
        error: null,
      })

      const result = await getGroupName('group-1')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('groups')
      expect(result).toEqual(mockGroup)
    })
  })

  describe('getGroupInvites', () => {
    const mockGroupInvites: UserGroups[] = [
      {
        id: 'group-1',
        role: MemberType.ADMIN,
        invitePending: true,
        group: {
          id: 'group-1',
          name: 'Test Group',
          slug: 'test-group',
        },
      },
    ]

    it('should get group invites successfully', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: mockGroupInvites,
        error: null,
      })

      const filters: GroupInviteFilters = {
        address: '0x1234567890123456789012345678901234567890',
        group_id: 'group-1',
        limit: 10,
        offset: 0,
      }

      const result = await getGroupInvites(filters)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_groups')
      expect(result).toEqual(mockGroupInvites)
    })
  })

  describe('publicGroupJoin', () => {
    it('should join public group successfully', async () => {
      mockSupabaseClient.insert.mockResolvedValue({
        data: [{ id: 'member-1' }],
        error: null,
      })

      await publicGroupJoin(
        'group-1',
        '0x1234567890123456789012345678901234567890'
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('group_members')
      expect(mockSupabaseClient.insert).toHaveBeenCalled()
    })
  })

  describe('manageGroupInvite', () => {
    it('should accept group invite successfully', async () => {
      mockSupabaseClient.update.mockResolvedValue({
        data: [{ id: 'invite-1' }],
        error: null,
      })

      await manageGroupInvite(
        'group-1',
        '0x1234567890123456789012345678901234567890'
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('group_invites')
      expect(mockSupabaseClient.update).toHaveBeenCalled()
    })

    it('should reject group invite successfully', async () => {
      mockSupabaseClient.update.mockResolvedValue({
        data: [{ id: 'invite-1' }],
        error: null,
      })

      await manageGroupInvite(
        'group-1',
        '0x1234567890123456789012345678901234567890',
        true
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('group_invites')
      expect(mockSupabaseClient.update).toHaveBeenCalled()
    })
  })

  describe('addUserToGroup', () => {
    it('should add user to group successfully', async () => {
      mockSupabaseClient.insert.mockResolvedValue({
        data: [{ id: 'member-1' }],
        error: null,
      })

      await addUserToGroup(
        'group-1',
        '0x1234567890123456789012345678901234567890'
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('group_members')
      expect(mockSupabaseClient.insert).toHaveBeenCalled()
    })

    it('should add user to group with custom role', async () => {
      mockSupabaseClient.insert.mockResolvedValue({
        data: [{ id: 'member-1' }],
        error: null,
      })

      await addUserToGroup(
        'group-1',
        '0x1234567890123456789012345678901234567890',
        MemberType.MEMBER
      )

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          role: MemberType.MEMBER,
        })
      )
    })
  })

  describe('getGroupAdminsFromDb', () => {
    const mockGroupMembers = [
      {
        id: 'member-1',
        group_id: 'group-1',
        member_id: '0x1234567890123456789012345678901234567890',
        role: MemberType.ADMIN,
        invitePending: false,
      },
    ]

    it('should get group admins successfully', async () => {
      mockSupabaseClient.eq.mockResolvedValue({
        data: mockGroupMembers,
        error: null,
      })

      const result = await getGroupAdminsFromDb('group-1')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('group_members')
      expect(result).toEqual(mockGroupMembers)
    })
  })

  describe('rejectGroupInvite', () => {
    it('should reject group invite successfully', async () => {
      mockSupabaseClient.update.mockResolvedValue({
        data: [{ id: 'invite-1' }],
        error: null,
      })

      await rejectGroupInvite(
        'group-1',
        '0x1234567890123456789012345678901234567890'
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('group_invites')
      expect(mockSupabaseClient.update).toHaveBeenCalled()
    })
  })

  describe('leaveGroup', () => {
    it('should leave group successfully', async () => {
      mockSupabaseClient.delete.mockResolvedValue({
        data: [{ id: 'member-1' }],
        error: null,
      })

      await leaveGroup('group-1', '0x1234567890123456789012345678901234567890')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('group_members')
      expect(mockSupabaseClient.delete).toHaveBeenCalled()
    })

    it('should leave group with invite pending', async () => {
      mockSupabaseClient.delete.mockResolvedValue({
        data: [{ id: 'invite-1' }],
        error: null,
      })

      await leaveGroup(
        'group-1',
        '0x1234567890123456789012345678901234567890',
        true
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('group_invites')
      expect(mockSupabaseClient.delete).toHaveBeenCalled()
    })
  })

  describe('removeMember', () => {
    it('should remove member successfully', async () => {
      mockSupabaseClient.delete.mockResolvedValue({
        data: [{ id: 'member-1' }],
        error: null,
      })

      await removeMember(
        'group-1',
        '0x1234567890123456789012345678901234567890',
        'member-1',
        false
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('group_members')
      expect(mockSupabaseClient.delete).toHaveBeenCalled()
    })

    it('should remove pending invite', async () => {
      mockSupabaseClient.delete.mockResolvedValue({
        data: [{ id: 'invite-1' }],
        error: null,
      })

      await removeMember(
        'group-1',
        '0x1234567890123456789012345678901234567890',
        'member-1',
        true
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('group_invites')
      expect(mockSupabaseClient.delete).toHaveBeenCalled()
    })
  })

  describe('getGroupUsers', () => {
    const mockGroupUsers: (GroupUsers & any)[] = [
      {
        id: 'member-1',
        group_id: 'group-1',
        member_id: '0x1234567890123456789012345678901234567890',
        role: MemberType.ADMIN,
        invitePending: false,
        name: 'Test User',
        email: 'test@example.com',
      },
    ]

    it('should get group users successfully', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: mockGroupUsers,
        error: null,
      })

      const result = await getGroupUsers(
        'group-1',
        '0x1234567890123456789012345678901234567890',
        10,
        0
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('group_members')
      expect(result).toEqual(mockGroupUsers)
    })
  })

  describe('isGroupAdmin', () => {
    it('should return true when user is admin', async () => {
      mockSupabaseClient.eq.mockResolvedValue({
        data: [{ role: MemberType.ADMIN }],
        error: null,
      })

      const result = await isGroupAdmin(
        'group-1',
        '0x1234567890123456789012345678901234567890'
      )

      expect(result).toBe(true)
    })

    it('should return false when user is not admin', async () => {
      mockSupabaseClient.eq.mockResolvedValue({
        data: [],
        error: null,
      })

      const result = await isGroupAdmin(
        'group-1',
        '0x1234567890123456789012345678901234567890'
      )

      expect(result).toBe(false)
    })
  })

  describe('changeGroupRole', () => {
    it('should change group role successfully', async () => {
      mockSupabaseClient.update.mockResolvedValue({
        data: [{ id: 'member-1' }],
        error: null,
      })

      await changeGroupRole(
        'group-1',
        '0x1234567890123456789012345678901234567890',
        MemberType.MEMBER,
        false
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('group_members')
      expect(mockSupabaseClient.update).toHaveBeenCalled()
    })

    it('should change invite role successfully', async () => {
      mockSupabaseClient.update.mockResolvedValue({
        data: [{ id: 'invite-1' }],
        error: null,
      })

      await changeGroupRole(
        'group-1',
        '0x1234567890123456789012345678901234567890',
        MemberType.MEMBER,
        true
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('group_invites')
      expect(mockSupabaseClient.update).toHaveBeenCalled()
    })
  })

  describe('getGroupUsersInternal', () => {
    const mockGroupMemberQueries: GroupMemberQuery[] = [
      {
        id: 'member-1',
        group_id: 'group-1',
        member_id: '0x1234567890123456789012345678901234567890',
        role: MemberType.ADMIN,
        user_id: 'user-123',
        email: 'test@example.com',
      },
    ]

    it('should get group users internal successfully', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: mockGroupMemberQueries,
        error: null,
      })

      const result = await getGroupUsersInternal('group-1')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('group_members')
      expect(result).toEqual(mockGroupMemberQueries)
    })
  })

  describe('getGroupMembersInternal', () => {
    const mockGroupMemberQueries: GroupMemberQuery[] = [
      {
        id: 'member-1',
        group_id: 'group-1',
        member_id: '0x1234567890123456789012345678901234567890',
        role: MemberType.ADMIN,
        user_id: 'user-123',
        email: 'test@example.com',
      },
    ]

    it('should get group members internal successfully', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: mockGroupMemberQueries,
        error: null,
      })

      const result = await getGroupMembersInternal('group-1')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('group_members')
      expect(result).toEqual(mockGroupMemberQueries)
    })
  })

  describe('isGroupExists', () => {
    it('should return true when group exists', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { id: 'group-1' },
        error: null,
      })

      const result = await isGroupExists('group-1')

      expect(result).toBe(true)
    })

    it('should return false when group does not exist', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await isGroupExists('group-1')

      expect(result).toBe(false)
    })
  })

  describe('getGroupInternal', () => {
    const mockGroup: Group = {
      id: 'group-1',
      name: 'Test Group',
      slug: 'test-group',
    }

    it('should get group internal successfully', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: mockGroup,
        error: null,
      })

      const result = await getGroupInternal('group-1')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('groups')
      expect(result).toEqual(mockGroup)
    })
  })

  describe('getGroup', () => {
    const mockGroup: Group = {
      id: 'group-1',
      name: 'Test Group',
      slug: 'test-group',
    }

    it('should get group successfully', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: mockGroup,
        error: null,
      })

      const result = await getGroup(
        'group-1',
        '0x1234567890123456789012345678901234567890'
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('groups')
      expect(result).toEqual(mockGroup)
    })
  })

  describe('editGroup', () => {
    it('should edit group name successfully', async () => {
      mockSupabaseClient.update.mockResolvedValue({
        data: [{ id: 'group-1' }],
        error: null,
      })

      await editGroup(
        'group-1',
        '0x1234567890123456789012345678901234567890',
        'New Name'
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('groups')
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Name',
        })
      )
    })

    it('should edit group slug successfully', async () => {
      mockSupabaseClient.update.mockResolvedValue({
        data: [{ id: 'group-1' }],
        error: null,
      })

      await editGroup(
        'group-1',
        '0x1234567890123456789012345678901234567890',
        undefined,
        'new-slug'
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('groups')
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'new-slug',
        })
      )
    })
  })

  describe('deleteGroup', () => {
    it('should delete group successfully', async () => {
      mockSupabaseClient.delete.mockResolvedValue({
        data: [{ id: 'group-1' }],
        error: null,
      })

      await deleteGroup('group-1', '0x1234567890123456789012345678901234567890')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('groups')
      expect(mockSupabaseClient.delete).toHaveBeenCalled()
    })
  })

  describe('deleteGroupMembers', () => {
    it('should delete group members successfully', async () => {
      mockSupabaseClient.delete.mockResolvedValue({
        data: [{ id: 'member-1' }],
        error: null,
      })

      await deleteGroupMembers('group-1')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('group_members')
      expect(mockSupabaseClient.delete).toHaveBeenCalled()
    })
  })

  describe('deleteGroupInvites', () => {
    it('should delete group invites successfully', async () => {
      mockSupabaseClient.delete.mockResolvedValue({
        data: [{ id: 'invite-1' }],
        error: null,
      })

      await deleteGroupInvites('group-1')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('group_invites')
      expect(mockSupabaseClient.delete).toHaveBeenCalled()
    })
  })

  describe('createGroupInvite', () => {
    it('should create group invite with email successfully', async () => {
      mockSupabaseClient.insert.mockResolvedValue({
        data: [{ id: 'invite-1' }],
        error: null,
      })

      await createGroupInvite('group-1', 'test@example.com')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('group_invites')
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
        })
      )
    })

    it('should create group invite with discord ID successfully', async () => {
      mockSupabaseClient.insert.mockResolvedValue({
        data: [{ id: 'invite-1' }],
        error: null,
      })

      await createGroupInvite('group-1', undefined, 'discord-123')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('group_invites')
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          discord_id: 'discord-123',
        })
      )
    })
  })

  describe('addUserToGroupInvites', () => {
    it('should add user to group invites successfully', async () => {
      mockSupabaseClient.insert.mockResolvedValue({
        data: [{ id: 'invite-1' }],
        error: null,
      })

      await addUserToGroupInvites(
        'group-1',
        MemberType.MEMBER,
        'test@example.com'
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('group_invites')
      expect(mockSupabaseClient.insert).toHaveBeenCalled()
    })
  })

  describe('updateGroupInviteUserId', () => {
    it('should update group invite user ID successfully', async () => {
      mockSupabaseClient.update.mockResolvedValue({
        data: [{ id: 'invite-1' }],
        error: null,
      })

      await updateGroupInviteUserId('invite-1', 'user-123')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('group_invites')
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
        })
      )
    })
  })

  describe('createGroupInDB', () => {
    const mockCreateGroupsResponse: CreateGroupsResponse = {
      id: 'group-1',
      name: 'Test Group',
      slug: 'test-group',
    }

    it('should create group in DB successfully', async () => {
      mockSupabaseClient.insert.mockResolvedValue({
        data: [mockCreateGroupsResponse],
        error: null,
      })

      const result = await createGroupInDB(
        'Test Group',
        '0x1234567890123456789012345678901234567890'
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('groups')
      expect(mockSupabaseClient.insert).toHaveBeenCalled()
      expect(result).toEqual(mockCreateGroupsResponse)
    })

    it('should create group with custom slug', async () => {
      mockSupabaseClient.insert.mockResolvedValue({
        data: [mockCreateGroupsResponse],
        error: null,
      })

      await createGroupInDB(
        'Test Group',
        '0x1234567890123456789012345678901234567890',
        'custom-slug'
      )

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'custom-slug',
        })
      )
    })
  })

  describe('isUserAdminOfGroup', () => {
    it('should return true when user is admin of group', async () => {
      mockSupabaseClient.eq.mockResolvedValue({
        data: [{ role: MemberType.ADMIN }],
        error: null,
      })

      const result = await isUserAdminOfGroup(
        'group-1',
        '0x1234567890123456789012345678901234567890'
      )

      expect(result).toBe(true)
    })

    it('should return false when user is not admin of group', async () => {
      mockSupabaseClient.eq.mockResolvedValue({
        data: [],
        error: null,
      })

      const result = await isUserAdminOfGroup(
        'group-1',
        '0x1234567890123456789012345678901234567890'
      )

      expect(result).toBe(false)
    })
  })
})
