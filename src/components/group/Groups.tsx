import {
  Accordion,
  Box,
  Button,
  HStack,
  Image,
  Spacer,
  Spinner,
  Text,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { FaPlus } from 'react-icons/fa'

import DeleteGroupModal from '@/components/group/DeleteGroupModal'
import EditGroupNameModal from '@/components/group/EditGroupNameModal'
import EditGroupSlugModal from '@/components/group/EditGroupSlugModal'
import GroupAdminChangeModal from '@/components/group/GroupAdminChangeModal'
import GroupAdminLeaveModal from '@/components/group/GroupAdminLeaveModal'
import GroupSettingsModal from '@/components/group/GroupSettingsModal'
import LeaveGroupModal from '@/components/group/LeaveGroupModal'
import RemoveGroupMemberModal from '@/components/group/RemoveGroupMemberModal'
import { Account } from '@/types/Account'
import { AvailabilityBlock } from '@/types/availability'
import { GetGroupsFullResponse, GroupMember, MemberType } from '@/types/Group'
import {
  getAvailabilityBlocks,
  getGroupsFullWithMetadata,
} from '@/utils/api_helper'
import { GROUP_PAGE_SIZE } from '@/utils/constants/group'
import { ApiFetchError } from '@/utils/errors'
import QueryKeys from '@/utils/query_keys'
import { queryClient } from '@/utils/react_query'

import GroupCard from '../group/GroupCard'
import InviteModal from '../group/InviteModal'

type Props = {
  currentAccount: Account
  search: string
}

export interface GroupRef {
  resetState: () => Promise<void>
}
interface IGroupModal {
  openLeaveModal: () => void
  pickGroupId: (groupId: string) => void
  pickGroupSlug: (groupSlug: string) => void
  setToggleAdminLeave: (value: boolean) => void
  setToggleAdminChange: (value: boolean) => void
  openDeleteModal: () => void
  setGroupName: (groupName: string) => void
  openNameEditModal: () => void
  openSlugEditModal: () => void
  selectedGroupMember: GroupMember
  setSelectedGroupMember: React.Dispatch<React.SetStateAction<GroupMember>>
  openRemoveModal: () => void
}

const DEFAULT_STATE: IGroupModal = {
  openLeaveModal: () => {},
  pickGroupId: () => {},
  pickGroupSlug: () => {},
  setToggleAdminLeave: () => {},
  setToggleAdminChange: () => {},
  openDeleteModal: () => {},
  setGroupName: () => {},
  openNameEditModal: () => {},
  openSlugEditModal: () => {},
  selectedGroupMember: {} as GroupMember,
  setSelectedGroupMember: () => {},
  openRemoveModal: () => {},
}
export const GroupContext = React.createContext<IGroupModal>(DEFAULT_STATE)

const Groups = forwardRef<GroupRef, Props>(
  ({ currentAccount, search }: Props, ref) => {
    const toast = useToast()

    const {
      data,
      isLoading,
      isFetchingNextPage,
      hasNextPage,
      fetchNextPage,
      error,
    } = useInfiniteQuery({
      queryKey: QueryKeys.groups(currentAccount?.address, search),
      queryFn: ({ pageParam = 0 }) => {
        return getGroupsFullWithMetadata(GROUP_PAGE_SIZE, pageParam, search)
      },
      getNextPageParam: (lastPage, allPages) => {
        if (
          !lastPage ||
          !lastPage.groups ||
          lastPage.groups.length < GROUP_PAGE_SIZE
        ) {
          return undefined
        }
        return allPages.reduce(
          (acc, page) => acc + (page.groups?.length || 0),
          0
        )
      },
      enabled: !!currentAccount?.address,
      staleTime: 0,
      refetchOnMount: true,
    })
    const groups = data?.pages.flatMap(page => page.groups || []) ?? []
    const canCreateGroup = data?.pages[0]?.isPro ?? true
    const firstFetch = isLoading

    // Fetch user's availability blocks (used in settings modal)
    const { data: availabilityBlocks } = useQuery<AvailabilityBlock[]>({
      queryKey: ['availabilityBlocks', currentAccount?.address],
      queryFn: () => getAvailabilityBlocks(),
      enabled: !!currentAccount?.address,
    })
    const resetState = async () => {
      await queryClient.invalidateQueries({
        queryKey: QueryKeys.groups(currentAccount?.address, search),
      })
    }
    useImperativeHandle(ref, () => ({
      resetState: async () => {
        await resetState()
      },
    }))
    useEffect(() => {
      if (error instanceof ApiFetchError) {
        toast({
          title: 'An error occurred',
          description: error.message,
          position: 'top',
        })
      }
    }, [error, toast])

    const router = useRouter()
    const { isOpen, onOpen, onClose } = useDisclosure()

    const {
      isOpen: isLeaveModalOpen,
      onOpen: openLeaveModal,
      onClose: closeLeaveModal,
    } = useDisclosure()
    const {
      isOpen: isDeleteModalOpen,
      onOpen: openDeleteModal,
      onClose: closeDeleteModal,
    } = useDisclosure()
    const {
      isOpen: isEditNameModalOpen,
      onOpen: openNameEditModal,
      onClose: closeNameEditModal,
    } = useDisclosure()
    const {
      isOpen: isSlugEditModalOpen,
      onOpen: openSlugEditModal,
      onClose: closeSlugEditModal,
    } = useDisclosure()
    const {
      isOpen: isSettingsModalOpen,
      onOpen: openSettingsModal,
      onClose: closeSettingsModal,
    } = useDisclosure()
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
    const [selectedGroupName, setSelectedGroupName] = useState<string>('')
    const [selectedGroupSlug, setSelectedGroupSlug] = useState<string>('')
    const [toggleAdminChange, setToggleAdminChange] = useState(false)
    const [toggleAdminLeave, setToggleAdminLeave] = useState(false)
    const [selectedGroupMember, setSelectedGroupMember] = useState<GroupMember>(
      {} as GroupMember
    )
    const {
      isOpen: isRemoveModalOpen,
      onOpen: openRemoveModal,
      onClose: closeRemoveModal,
    } = useDisclosure()
    const context = {
      openLeaveModal,
      pickGroupId: setSelectedGroupId,
      pickGroupSlug: setSelectedGroupSlug,
      setToggleAdminLeave,
      setToggleAdminChange,
      openDeleteModal,
      setGroupName: setSelectedGroupName,
      openNameEditModal,
      openSlugEditModal,
      selectedGroupMember,
      setSelectedGroupMember,
      openRemoveModal,
    }

    const loadMoreRef = useRef<HTMLDivElement | null>(null)

    // Intersection Observer for infinite scroll
    useEffect(() => {
      if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return

      const observer = new IntersectionObserver(
        entries => {
          if (entries[0].isIntersecting) {
            void fetchNextPage()
          }
        },
        {
          root: null,
          rootMargin: '200px',
          threshold: 0.1,
        }
      )

      observer.observe(loadMoreRef.current)
      return () => observer.disconnect()
    }, [hasNextPage, isFetchingNextPage, fetchNextPage])

    const handleAddNewMember = (groupId: string, groupName: string) => {
      setSelectedGroupId(groupId)
      setSelectedGroupName(groupName)
      onOpen()
    }

    const handleOpenSettingsModal = (groupId: string) => {
      setSelectedGroupId(groupId)
      openSettingsModal()
    }

    const handleCloseSettingsModal = () => {
      closeSettingsModal()
      setSelectedGroupId(null)
    }

    // Get the selected group data
    const selectedGroup = groups.find(g => g.id === selectedGroupId)

    const isUserGroupAdmin = (group: GetGroupsFullResponse): boolean => {
      return (
        group.members.find(m => m.address === currentAccount?.address)?.role ===
        MemberType.ADMIN
      )
    }

    if (firstFetch) {
      return (
        <VStack alignItems="center" mb={6}>
          <Image src="/assets/schedule.svg" height="200px" alt="Loading..." />
          <HStack pt={8}>
            <Spinner />
            <Text fontSize="lg">Checking for your groups...</Text>
          </HStack>
        </VStack>
      )
    } else if (groups.length === 0) {
      return (
        <VStack alignItems="center" gap={4}>
          <Image src="/assets/no_group.svg" height="200px" alt="Loading..." />
          <Text fontSize="lg">
            You will see your Groups here once you created a new Group.
          </Text>
          <Button
            onClick={() => router.push('/dashboard/create-group')}
            flexShrink={0}
            colorScheme="primary"
            display={{ base: 'none', md: 'flex' }}
            mt={{ base: 4, md: 0 }}
            mb={4}
            leftIcon={<FaPlus />}
            isDisabled={!canCreateGroup}
            title={
              !canCreateGroup
                ? 'Upgrade to Pro to create more groups'
                : undefined
            }
          >
            Create new group
          </Button>
        </VStack>
      )
    } else {
      return (
        <GroupContext.Provider value={context}>
          <VStack>
            <GroupAdminLeaveModal
              isOpen={toggleAdminLeave}
              onClose={() => setToggleAdminLeave(false)}
            />
            <GroupAdminChangeModal
              isOpen={toggleAdminChange}
              onClose={() => setToggleAdminChange(false)}
            />
            <LeaveGroupModal
              groupID={selectedGroupId}
              resetState={resetState}
              onClose={closeLeaveModal}
              isOpen={isLeaveModalOpen}
              setToggleAdminLeaveModal={setToggleAdminLeave}
            />
            <RemoveGroupMemberModal
              groupID={selectedGroupId}
              groupName={selectedGroupName}
              resetState={resetState}
              onClose={closeRemoveModal}
              isOpen={isRemoveModalOpen}
              selectedGroupMember={selectedGroupMember}
            />
            <DeleteGroupModal
              groupName={selectedGroupName}
              resetState={resetState}
              onClose={closeDeleteModal}
              isOpen={isDeleteModalOpen}
              groupID={selectedGroupId}
            />
            <EditGroupNameModal
              isOpen={isEditNameModalOpen}
              onClose={closeNameEditModal}
              resetState={resetState}
              groupName={selectedGroupName}
              groupID={selectedGroupId}
            />
            <EditGroupSlugModal
              isOpen={isSlugEditModalOpen}
              onClose={closeSlugEditModal}
              resetState={resetState}
              groupSlug={selectedGroupSlug}
              groupID={selectedGroupId}
            />
            {selectedGroupId && selectedGroup && (
              <GroupSettingsModal
                isOpen={isSettingsModalOpen}
                onClose={handleCloseSettingsModal}
                group={selectedGroup}
                availabilityBlocks={availabilityBlocks || []}
                isAdmin={isUserGroupAdmin(selectedGroup)}
                resetState={resetState}
              />
            )}
            <Accordion allowMultiple width="100%">
              {groups.map(group => (
                <GroupCard
                  key={group.id}
                  currentAccount={currentAccount}
                  {...group}
                  onAddNewMember={(...args) => {
                    const actor = group.members?.find(
                      member => member.address === currentAccount?.address
                    )
                    if (!actor || actor?.role !== MemberType.ADMIN) return
                    handleAddNewMember(...args)
                  }}
                  onOpenSettingsModal={() => handleOpenSettingsModal(group.id)}
                  mt={0}
                  resetState={resetState}
                />
              ))}
            </Accordion>
            {hasNextPage && (
              <Box
                ref={loadMoreRef}
                w="100%"
                h="20px"
                display="flex"
                justifyContent="center"
                alignItems="center"
                my={4}
              >
                {isFetchingNextPage && (
                  <Spinner size="md" color="primary.500" />
                )}
              </Box>
            )}
            {!hasNextPage && groups.length > 0 && (
              <Text color="gray.500" fontSize="sm" textAlign="center" my={4}>
                No more groups to load
              </Text>
            )}
            <Spacer />
            <InviteModal
              groupName={selectedGroupName}
              isOpen={isOpen}
              onClose={() => {
                onClose()
                setSelectedGroupId(null)
              }}
              resetState={resetState}
              groupId={selectedGroupId ?? ''}
            />
          </VStack>
        </GroupContext.Provider>
      )
    }
  }
)

Groups.displayName = 'Groups'
export default Groups
