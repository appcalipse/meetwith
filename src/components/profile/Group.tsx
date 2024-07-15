import {
  Accordion,
  Button,
  Flex,
  Heading,
  HStack,
  Image,
  Spacer,
  Spinner,
  Text,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import React, { ReactNode, useEffect, useState } from 'react'
import { FaPlus } from 'react-icons/fa'

import DeleteGroupModal from '@/components/group/DeleteGroupModal'
import EditGroupNameModal from '@/components/group/EditGroupNameModal'
import GroupAdminChangeModal from '@/components/group/GroupAdminChangeModal'
import GroupAdminLeaveModal from '@/components/group/GroupAdminLeaveModal'
import GroupInviteCard from '@/components/group/GroupInviteCard'
import GroupJoinModal from '@/components/group/GroupJoinModal'
import LeaveGroupModal from '@/components/group/LeaveGroupModal'
import ModalLoading from '@/components/Loading/ModalLoading'
import GroupOnBoardingModal from '@/components/onboarding/GroupOnBoardingModal'
import { Account } from '@/types/Account'
import { Intents } from '@/types/Dashboard'
import {
  GetGroupsResponse,
  Group as GroupResponse,
  MemberType,
} from '@/types/Group'
import {
  getGroupExternal,
  getGroups,
  listConnectedCalendars,
} from '@/utils/api_helper'

import GroupCard from '../group/GroupCard'
import InviteModal from '../group/InviteModal'

interface IGroupModal {
  openLeaveModal: () => void
  closeLeaveModal: () => void
  pickGroupId: (groupId: string) => void
  setToggleAdminLeave: (value: boolean) => void
  setToggleAdminChange: (value: boolean) => void
  openDeleteModal: () => void
  closeDeleteModal: () => void
  setGroupName: (groupName: string) => void
  openNameEditModal: () => void
  closeNameEditModal: () => void
}

const DEFAULT_STATE: IGroupModal = {
  openLeaveModal: () => {},
  closeLeaveModal: () => {},
  pickGroupId: () => {},
  setToggleAdminLeave: () => {},
  setToggleAdminChange: () => {},
  openDeleteModal: () => {},
  closeDeleteModal: () => {},
  setGroupName: () => {},
  openNameEditModal: () => {},
  closeNameEditModal: () => {},
}
export const GroupContext = React.createContext<IGroupModal>(DEFAULT_STATE)
const Group: React.FC<{ currentAccount: Account }> = ({ currentAccount }) => {
  const [groups, setGroups] = useState<Array<GetGroupsResponse>>([])
  const [loading, setLoading] = useState(true)
  const [noMoreFetch, setNoMoreFetch] = useState(false)
  const [firstFetch, setFirstFetch] = useState(true)
  const [inviteGroupData, setInviteGroupData] = useState<
    GroupResponse | undefined
  >(undefined)
  const [inviteDataIsLoading, setInviteDataIsLoading] = useState(false)
  const router = useRouter()
  const { join, intent, groupId, email } = useRouter().query
  const { isOpen, onOpen, onClose } = useDisclosure()
  const {
    isOpen: isOnboardingOpened,
    onOpen: onboardingOnOpen,
    onClose: onboardingOnClose,
  } = useDisclosure()
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
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [selectedGroupName, setSelectedGroupName] = useState<string>('')
  const [toggleAdminChange, setToggleAdminChange] = useState(false)
  const [toggleAdminLeave, setToggleAdminLeave] = useState(false)
  const context = {
    openLeaveModal,
    closeLeaveModal,
    pickGroupId: setSelectedGroupId,
    setToggleAdminLeave,
    setToggleAdminChange,
    openDeleteModal,
    closeDeleteModal,
    setGroupName: setSelectedGroupName,
    openNameEditModal,
    closeNameEditModal,
  }
  const fetchGroups = async (reset?: boolean) => {
    const PAGE_SIZE = 5
    setLoading(true)
    const newGroups = await getGroups(PAGE_SIZE, reset ? 0 : groups.length)
    if (newGroups?.length < PAGE_SIZE) {
      setNoMoreFetch(true)
    }
    setGroups(prev => (reset ? [] : [...prev]).concat(newGroups))
    setLoading(false)
    setFirstFetch(false)
  }

  const resetState = async () => {
    setFirstFetch(true)
    setNoMoreFetch(false)
    void fetchGroups(true)
  }

  const fetchGroup = async (group_id: string) => {
    setInviteDataIsLoading(true)
    const group = await getGroupExternal(group_id)
    setInviteGroupData(group)
    setInviteDataIsLoading(false)
  }
  const checkAccount = async () => {
    setInviteDataIsLoading(true)
    const connectedCalendars = await listConnectedCalendars()
    const nameExists = currentAccount.preferences?.name
    const group_id = Array.isArray(groupId) ? groupId[0] : groupId
    if (!group_id) {
      setInviteDataIsLoading(false)
      return
    }
    const group = await getGroupExternal(group_id)
    if (group) {
      setSelectedGroupId(group_id)
      setSelectedGroupName(group.name)
    }

    if (!nameExists || connectedCalendars.length === 0) {
      onboardingOnOpen()
    } else {
      setInviteGroupData(group)
    }
    setInviteDataIsLoading(false)
  }
  const handleOnboardingModalClose = async () => {
    onboardingOnClose()
    setInviteDataIsLoading(true)
    const group_id = Array.isArray(groupId) ? groupId[0] : groupId
    if (!group_id) {
      setInviteDataIsLoading(false)
      return
    }
    const group = await getGroupExternal(group_id)
    if (group) {
      setSelectedGroupId(group_id)
      setSelectedGroupName(group.name)
    }
    setInviteGroupData(group)
    setInviteDataIsLoading(false)
  }
  useEffect(() => {
    void resetState()
  }, [currentAccount?.address])

  useEffect(() => {
    if (join) {
      void fetchGroup(join as string)
    }
  }, [join])
  useEffect(() => {
    if (intent === Intents.JOIN) {
      checkAccount()
    }
  }, [intent, currentAccount, groupId])
  const handleAddNewMember = (groupId: string, groupName: string) => {
    setSelectedGroupId(groupId)
    setSelectedGroupName(groupName)
    onOpen()
  }

  let content: ReactNode
  if (firstFetch) {
    content = (
      <VStack alignItems="center" mb={6}>
        <Image src="/assets/schedule.svg" height="200px" alt="Loading..." />
        <HStack pt={8}>
          <Spinner />
          <Text fontSize="lg">Checking for your groups...</Text>
        </HStack>
      </VStack>
    )
  } else if (groups.length === 0) {
    content = (
      <VStack alignItems="center" mt={6} gap={4}>
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
        >
          Create new group
        </Button>
      </VStack>
    )
  } else {
    content = (
      <VStack my={6}>
        <ModalLoading isOpen={inviteDataIsLoading} />
        <GroupJoinModal
          group={inviteGroupData}
          onClose={() => setInviteGroupData(undefined)}
          resetState={resetState}
        />
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

        <Accordion allowMultiple width="100%">
          {groups.map(group =>
            group?.invitePending ? (
              <GroupInviteCard
                key={group.id}
                {...group}
                resetState={resetState}
              />
            ) : (
              <GroupCard
                key={group.id}
                currentAccount={currentAccount}
                {...group}
                onAddNewMember={(...args) => {
                  if (group.role !== MemberType.ADMIN) return
                  handleAddNewMember(...args)
                }}
                mt={0}
                resetState={resetState}
              />
            )
          )}
        </Accordion>
        {!noMoreFetch && !firstFetch && (
          <Button
            isLoading={loading}
            colorScheme="primary"
            variant="outline"
            alignSelf="center"
            my={4}
            onClick={() => fetchGroups()}
          >
            Load more
          </Button>
        )}
        <Spacer />
      </VStack>
    )
  }
  return (
    <GroupContext.Provider value={context}>
      <Flex direction={'column'} maxWidth="100%">
        <ModalLoading isOpen={inviteDataIsLoading} />
        <GroupJoinModal
          group={inviteGroupData}
          onClose={() => setInviteGroupData(undefined)}
          resetState={resetState}
          inviteEmail={email as string}
        />
        <GroupOnBoardingModal
          isOnboardingOpened={isOnboardingOpened}
          handleClose={() => handleOnboardingModalClose()}
          groupName={selectedGroupName}
        />
        <HStack
          justifyContent="space-between"
          alignItems="flex-start"
          mb={4}
          gap={6}
        >
          <Heading fontSize="2xl">
            My Groups
            <Text fontSize="sm" fontWeight={500} mt={1} lineHeight={1.5}>
              A group allows you to add multiple members and schedule meetings
              by automatically finding a suitable time based on each member’s
              availability.
            </Text>
          </Heading>
          <Button
            onClick={() => router.push('/dashboard/create-group')}
            flexShrink={0}
            colorScheme="primary"
            display={{ base: 'none', md: 'flex' }}
            mt={{ base: 4, md: 0 }}
            mb={4}
            leftIcon={<FaPlus />}
          >
            Create new group
          </Button>
        </HStack>
        {content}
        <InviteModal
          groupName={selectedGroupName}
          isOpen={isOpen}
          onClose={() => {
            onClose()
            setSelectedGroupId(null)
            resetState()
          }}
          groupId={selectedGroupId ?? ''}
        />
      </Flex>
    </GroupContext.Provider>
  )
}

export default Group
