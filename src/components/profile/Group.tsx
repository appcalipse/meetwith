import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  Heading,
  HStack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import React, { useContext, useEffect, useRef, useState } from 'react'
import { FaPlus } from 'react-icons/fa'

import GroupJoinModal from '@/components/group/GroupJoinModal'
import ModalLoading from '@/components/Loading/ModalLoading'
import GroupOnBoardingModal from '@/components/onboarding/GroupOnBoardingModal'
import { useDebounceValue } from '@/hooks/useDebounceValue'
import { MetricStateContext } from '@/providers/MetricStateProvider'
import { Account } from '@/types/Account'
import { Intents, InviteType } from '@/types/Dashboard'
import { Group as GroupResponse } from '@/types/Group'
import {
  getGroupExternal,
  getGroupsFullWithMetadata,
  listConnectedCalendars,
} from '@/utils/api_helper'
import {
  getHideGroupAvailabilityLabels,
  setHideGroupAvailabilityLabels,
} from '@/utils/storage'
import { getActiveProSubscription } from '@/utils/subscription_manager'

import GroupInvites, { GroupInvitesRef } from '../group/GroupInvites'
import Groups, { GroupRef } from '../group/Groups'
import SearchInput from '../ui/SearchInput'

const Group: React.FC<{ currentAccount: Account }> = ({ currentAccount }) => {
  const [inviteGroupData, setInviteGroupData] = useState<
    GroupResponse | undefined
  >(undefined)
  const { groupInvitesCount, fetchGroupInvitesCount } =
    useContext(MetricStateContext)
  const [debouncedValue, setValue] = useDebounceValue('', 500)
  const groupRef = useRef<GroupRef>(null)
  const groupInviteRef = useRef<GroupInvitesRef>(null)

  // Fetch metadata to get upgradeRequired status
  const { data: groupsMetadata } = useQuery({
    queryKey: ['groupsMetadata', currentAccount?.address],
    queryFn: () => getGroupsFullWithMetadata(1, 0, '', true),
    enabled: !!currentAccount?.address,
    staleTime: 30000,
  })

  const activeSubscription = getActiveProSubscription(currentAccount)
  const hasProAccess = Boolean(activeSubscription)
  const canCreateGroup = hasProAccess && !groupsMetadata?.upgradeRequired

  // Preference to hide availability block labels in group cards
  const [hideAvailabilityLabels, setHideAvailabilityLabels] = useState(() =>
    getHideGroupAvailabilityLabels(currentAccount?.address || '')
  )

  const handleToggleHideLabels = (checked: boolean) => {
    setHideAvailabilityLabels(checked)
    setHideGroupAvailabilityLabels(currentAccount?.address || '', checked)
  }

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
          <SearchInput
            setValue={setValue}
            value={debouncedValue}
            placeholder="Search for group"
          />
          <VStack
            align="stretch"
            w="100%"
            display={{ base: 'flex', md: 'none' }}
            mt={4}
            mb={4}
            spacing={2}
          >
            <Button
              onClick={() => router.push('/dashboard/create-group')}
              flexShrink={0}
              colorScheme="primary"
              leftIcon={<FaPlus />}
              w={'100%'}
              isDisabled={!canCreateGroup}
              title={
                !canCreateGroup
                  ? 'Upgrade to Pro to create more groups'
                  : undefined
              }
            >
              Create new group
            </Button>
            {!canCreateGroup && (
              <Text
                fontSize="14px"
                color="neutral.400"
                lineHeight="1.4"
                maxW="280px"
              >
                To see all your groups, schedule with the groups and create more
                groups Go PRO{' '}
                <Button
                  variant="link"
                  colorScheme="primary"
                  px={0}
                  onClick={() =>
                    router.push('/dashboard/settings/subscriptions')
                  }
                  textDecoration="underline"
                  fontSize="14px"
                  height="auto"
                  minW="auto"
                >
                  here
                </Button>
                .
              </Text>
            )}
          </VStack>
          <TabList
            w={{ base: '100%', md: 'auto' }}
            bg="bg-surface-secondary"
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
          <VStack
            align="flex-end"
            display={{ base: 'none', md: 'flex' }}
            spacing={2}
            w="fit-content"
          >
            <Button
              onClick={() => router.push('/dashboard/create-group')}
              flexShrink={0}
              colorScheme="primary"
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
            {!canCreateGroup && (
              <Text
                fontSize="14px"
                color="neutral.400"
                textAlign="right"
                lineHeight="1.4"
                maxW="280px"
              >
                To see all your groups, schedule with the groups and create more
                groups, Go{' '}
                <Button
                  variant="link"
                  colorScheme="primary"
                  px={0}
                  onClick={() =>
                    router.push('/dashboard/settings/subscriptions')
                  }
                  textDecoration="underline"
                  fontSize="14px"
                  height="auto"
                  minW="auto"
                >
                  PRO
                </Button>
                .
              </Text>
            )}
          </VStack>
        </HStack>

        {/* Hide availability labels checkbox */}
        <HStack mb={4}>
          <Checkbox
            isChecked={hideAvailabilityLabels}
            onChange={e => handleToggleHideLabels(e.target.checked)}
            size="md"
            sx={{
              '.chakra-checkbox__control': {
                bg: 'transparent',
                borderColor: 'border-subtle',
                _checked: {
                  bg: 'primary.200',
                  borderColor: 'primary.200',
                  color: 'neutral.900',
                },
              },
              '.chakra-checkbox__label': {
                color: 'text-primary',
                fontSize: 'sm',
              },
            }}
          >
            Hide the availability block labels for groups
          </Checkbox>
        </HStack>

        <TabPanels p={0}>
          <TabPanel p={0}>
            <Groups
              currentAccount={currentAccount}
              search={debouncedValue}
              hideAvailabilityLabels={hideAvailabilityLabels}
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
