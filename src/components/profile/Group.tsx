import {
  Badge,
  Box,
  Button,
  Flex,
  FormLabel,
  Heading,
  HStack,
  Input,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import React, { useContext, useEffect, useRef, useState } from 'react'
import { FaPlus } from 'react-icons/fa'
import { RiSearch2Line } from 'react-icons/ri'

import GroupJoinModal from '@/components/group/GroupJoinModal'
import ModalLoading from '@/components/Loading/ModalLoading'
import GroupOnBoardingModal from '@/components/onboarding/GroupOnBoardingModal'
import { useDebounceValue } from '@/hooks/useDebounceValue'
import { MetricStateContext } from '@/providers/MetricStateProvider'
import { Account } from '@/types/Account'
import { Intents, InviteType } from '@/types/Dashboard'
import { Group as GroupResponse, GroupMember } from '@/types/Group'
import { getGroupExternal, listConnectedCalendars } from '@/utils/api_helper'

import GroupInvites, { GroupInvitesRef } from '../group/GroupInvites'
import Groups, { GroupRef } from '../group/Groups'
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

const Group: React.FC<{ currentAccount: Account }> = ({ currentAccount }) => {
  const [inviteGroupData, setInviteGroupData] = useState<
    GroupResponse | undefined
  >(undefined)
  const { groupInvitesCount, fetchGroupInvitesCount } =
    useContext(MetricStateContext)
  const [debouncedValue, setValue] = useDebounceValue('', 500)
  const groupRef = useRef<GroupRef>(null)
  const groupInviteRef = useRef<GroupInvitesRef>(null)

  const [inviteDataIsLoading, setInviteDataIsLoading] = useState(false)
  const router = useRouter()
  const { join, intent, groupId, email, type } = useRouter().query
  const {
    isOpen: isOnboardingOpened,
    onOpen: onboardingOnOpen,
    onClose: onboardingOnClose,
  } = useDisclosure()

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
    const timeZoneIsSet = currentAccount.preferences?.timezone
    const availabilityNotSet =
      (currentAccount.preferences?.availabilities?.length || 0) === 0
    const group_id = Array.isArray(groupId) ? groupId[0] : groupId
    if (!group_id) {
      setInviteDataIsLoading(false)
      return
    }
    const group = await getGroupExternal(group_id)
    if (
      !nameExists ||
      connectedCalendars.length === 0 ||
      !timeZoneIsSet ||
      availabilityNotSet
    ) {
      onboardingOnOpen()
    }
    setInviteGroupData(group)
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
    setInviteGroupData(group)
    setInviteDataIsLoading(false)
  }
  useEffect(() => {
    if (join) {
      void fetchGroup(join as string)
    }
  }, [join])
  useEffect(() => {
    if (intent === Intents.JOIN) {
      void checkAccount()
    }
  }, [intent, groupId])
  return (
    <Flex direction={'column'} maxWidth="100%" mb={4}>
      <ModalLoading isOpen={inviteDataIsLoading} />
      <GroupJoinModal
        group={inviteGroupData}
        onClose={() => setInviteGroupData(undefined)}
        shouldOpen={!isOnboardingOpened}
        resetState={() =>
          Promise.all([
            groupRef.current?.resetState(),
            groupInviteRef?.current?.resetState(),
            fetchGroupInvitesCount(),
          ])
        }
        inviteEmail={email as string}
        type={type as InviteType}
      />
      <GroupOnBoardingModal
        isOnboardingOpened={isOnboardingOpened}
        handleClose={() => handleOnboardingModalClose()}
        groupName={inviteGroupData?.name || ''}
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
            A group allows you to add multiple members and schedule meetings by
            automatically finding a suitable time based on each member’s
            availability.
          </Text>
        </Heading>
      </HStack>
      <Tabs variant="unstyled" pb={0}>
        <HStack
          justifyContent="space-between"
          w={'100%'}
          alignItems="flex-start"
          mb={2}
          flexDirection={{
            base: 'column-reverse',
            md: 'row',
          }}
        >
          <Box w={{ base: '100%', md: 'fit-content' }} pos="relative" h="100%">
            <FormLabel
              display="flex"
              htmlFor="search"
              pos="absolute"
              left={3}
              insetY={0}
              h="100%"
              justifyContent="center"
              alignItems="center"
            >
              <RiSearch2Line color="neutral.400" />
            </FormLabel>
            <Input
              pl={10}
              w={{ base: '100%', md: 'fit-content' }}
              h={12}
              type="search"
              placeholder="Search for group"
              id="search"
              defaultValue={debouncedValue}
              rounded={6}
              onChange={e => setValue(e.target.value)}
              autoComplete="off"
              _placeholder={{
                color: 'neutral.400',
              }}
            />
          </Box>
          <Button
            onClick={() => router.push('/dashboard/create-group')}
            flexShrink={0}
            colorScheme="primary"
            display={{ base: 'flex', md: 'none' }}
            mt={{ base: 4, md: 0 }}
            mb={4}
            leftIcon={<FaPlus />}
            w={'100%'}
          >
            Create new group
          </Button>
          <TabList
            w={{ base: '100%', md: 'auto' }}
            bg="neutral.850"
            p={1}
            borderWidth={1}
            rounded={6}
          >
            <Tab
              rounded={4}
              fontWeight={700}
              flexGrow={{
                base: 1,
                md: 0,
              }}
              _selected={{
                color: 'neutral.900',
                bg: 'primary.200',
              }}
            >
              Groups
            </Tab>
            <Tab
              rounded={4}
              fontWeight={700}
              flexGrow={{
                base: 1,
                md: 0,
              }}
              _selected={{
                color: 'neutral.900',
                bg: 'primary.200',
              }}
            >
              Group invites
              {groupInvitesCount > 0 && (
                <Badge
                  colorScheme="primary"
                  color="white"
                  bg="primary.600"
                  ml={2}
                  px={1.5}
                >
                  {groupInvitesCount}
                </Badge>
              )}
            </Tab>
          </TabList>
          <Button
            onClick={() => router.push('/dashboard/create-group')}
            flexShrink={0}
            colorScheme="primary"
            display={{ base: 'none', md: 'flex' }}
            leftIcon={<FaPlus />}
          >
            Create new group
          </Button>
        </HStack>

        <TabPanels p={0}>
          <TabPanel p={0}>
            <Groups
              currentAccount={currentAccount}
              search={debouncedValue}
              ref={groupRef}
            />
          </TabPanel>
          <TabPanel p={0}>
            <GroupInvites
              currentAccount={currentAccount}
              search={debouncedValue}
              ref={groupInviteRef}
              reloadGroups={() => groupRef.current?.resetState()}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Flex>
  )
}

export default Group
