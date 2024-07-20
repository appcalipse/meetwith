import {
  Box,
  Collapse,
  Heading,
  HStack,
  Icon,
  Switch,
  VStack,
} from '@chakra-ui/react'
import React, { FC, useContext, useEffect, useState } from 'react'
import { FaChevronDown, FaChevronUp } from 'react-icons/fa'

import { Availability } from '@/components/icons/Availability'
import Loading from '@/components/Loading'
import ScheduleGroupMember from '@/components/schedule/ScheduleGroupMember'
import { IGroupParticipant, ScheduleContext } from '@/pages/dashboard/schedule'
import { AccountContext } from '@/providers/AccountProvider'
import { GetGroupsResponse, GroupMember } from '@/types/Group'
import { getGroupsMembers } from '@/utils/api_helper'

type ScheduleGroupItemProps = GetGroupsResponse

// eslint-disable-next-line react/display-name
const ScheduleGroup: FC<ScheduleGroupItemProps> = props => {
  const [groupMembers, setGroupsMembers] = useState<Array<GroupMember>>([])
  const { currentAccount } = useContext(AccountContext)
  const [loading, setLoading] = useState(false)
  const {
    groupParticipants,
    groupAvailability,
    setGroupAvailability,
    setGroupParticipants,
    addGroup,
    removeGroup,
    participants,
  } = useContext(ScheduleContext)
  const [collapsed, setCollapsed] = useState(true)
  const fetchGroupMembers = async (reset?: boolean) => {
    setLoading(true)
    const fetchedGroupMembers = await getGroupsMembers(props.id)
    const actualMembers = fetchedGroupMembers
      .filter(val => !val.invitePending)
      .filter(val => !!val.address)
    setGroupsMembers(reset ? [] : actualMembers)
    const allAddresses = actualMembers
      .map(val => val.address)
      .filter((val): val is string => typeof val === 'string')
    if (!(groupParticipants[props.id] || groupAvailability[props.id])) {
      setGroupAvailability(prev => ({
        ...prev,
        [props.id]: allAddresses,
      }))
      setGroupParticipants(prev => ({
        ...prev,
        [props.id]: allAddresses,
      }))
    }
    setLoading(false)
  }
  useEffect(() => {
    if (props?.id) {
      void fetchGroupMembers()
    }
  }, [])
  const handleToggleAllAvailabilities = () => {
    const allAddresses = groupMembers
      .map(val => val.address)
      .filter((val): val is string => typeof val === 'string')
    setGroupAvailability(prev => ({
      ...prev,
      [props.id]: allAddresses,
    }))
  }
  const handleSwitchClick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      addGroup({ id: props.id, name: props.name, isGroup: true })
    } else {
      removeGroup(props.id)
    }
    const allAddresses = groupMembers
      .map(val => val.address)
      .filter((val): val is string => typeof val === 'string')
    setGroupAvailability(prev => ({
      ...prev,
      [props.id]: e.target.checked ? allAddresses : [],
    }))
    setGroupParticipants(prev => ({
      ...prev,
      [props.id]: e.target.checked ? allAddresses : [],
    }))
  }
  const isExpanded = participants.some(val => {
    const groupData = val as IGroupParticipant
    const isGroup = groupData.isGroup && groupData.id === props.id
    return isGroup
  })
  return (
    <VStack
      width="100%"
      key={`${props.id}`}
      border={0}
      borderRadius="lg"
      bgColor="transparent"
      id={props.id}
      mt={0}
    >
      <HStack
        p={0}
        justifyContent="space-between"
        width="100%"
        h={'auto'}
        _hover={{
          bgColor: 'transparent',
        }}
        borderTopWidth={1}
        borderBottomWidth={1}
        borderColor="neutral.600"
      >
        <HStack gap={4} minH={24}>
          <Switch
            colorScheme="primary"
            size="md"
            isChecked={isExpanded}
            onChange={handleSwitchClick}
          />
          <VStack gap={0} alignItems="flex-start">
            <Heading size={'sm'}>{props.name}</Heading>
          </VStack>
        </HStack>
        <HStack gap={3} width="fit-content">
          {isExpanded && (
            <Availability
              w="auto"
              h={{
                base: 20,
                md: 24,
              }}
              onClick={handleToggleAllAvailabilities}
              cursor="pointer"
            />
          )}
          {isExpanded &&
            (!collapsed ? (
              <Icon
                as={FaChevronDown}
                h={{
                  base: 20,
                  md: 24,
                }}
                cursor="pointer"
                onClick={() => setCollapsed(true)}
                size={20}
              />
            ) : (
              <Icon
                as={FaChevronUp}
                cursor="pointer"
                onClick={() => setCollapsed(false)}
                size={20}
              />
            ))}
        </HStack>
      </HStack>
      {collapsed && (
        <Collapse in={isExpanded} style={{ width: '100%' }}>
          <VStack w={'100%'} maxH="600px" h="auto" overflowY="auto">
            {loading ? (
              <Box my={2}>
                <Loading />
              </Box>
            ) : (
              groupMembers.map(({ address, ...groupMember }) => (
                <ScheduleGroupMember
                  groupId={props.id}
                  address={address as string}
                  {...groupMember}
                  key={groupMember.userId}
                  currentAccount={currentAccount ?? null}
                />
              ))
            )}
          </VStack>
        </Collapse>
      )}
    </VStack>
  )
}
export default React.memo(
  ScheduleGroup,
  (prevProps, nextProps) => prevProps.id === nextProps.id
)
