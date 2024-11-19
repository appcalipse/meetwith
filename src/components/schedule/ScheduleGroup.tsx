import {
  Box,
  Collapse,
  Heading,
  HStack,
  Icon,
  Switch,
  VStack,
} from '@chakra-ui/react'
import React, { FC, useContext, useEffect, useMemo, useState } from 'react'
import { FaChevronDown, FaChevronUp } from 'react-icons/fa'

import { Availability } from '@/components/icons/Availability'
import ScheduleGroupMember from '@/components/schedule/ScheduleGroupMember'
import { IGroupParticipant, ScheduleContext } from '@/pages/dashboard/schedule'
import { AccountContext } from '@/providers/AccountProvider'
import { GetGroupsFullResponse, GroupMember } from '@/types/Group'

type ScheduleGroupItemProps = GetGroupsFullResponse

// eslint-disable-next-line react/display-name
const ScheduleGroup: FC<ScheduleGroupItemProps> = props => {
  const [groupMembers, setGroupsMembers] = useState<Array<GroupMember>>([])
  const { currentAccount } = useContext(AccountContext)

  const {
    groupAvailability,
    setGroupAvailability,
    setGroupParticipants,
    addGroup,
    removeGroup,
    participants,
  } = useContext(ScheduleContext)
  const [collapsed, setCollapsed] = useState(true)
  const isExpanded = useMemo(
    () =>
      participants.some(val => {
        const groupData = val as IGroupParticipant
        const isGroup = groupData.isGroup && groupData.id === props.id
        return isGroup
      }),
    [participants, props.id]
  )
  const loadGroupMembers = () => {
    const actualMembers = props.members
    setGroupsMembers(actualMembers)
    if (isExpanded) {
      setGroupAvailability(prev => ({
        ...prev,
        [props.id]: actualMembers
          .map(val => val.address)
          .filter((val): val is string => typeof val === 'string'),
      }))
      setGroupParticipants(prev => ({
        ...prev,
        [props.id]: actualMembers
          .map(val => val.address)
          .filter((val): val is string => typeof val === 'string'),
      }))
    }
  }
  useEffect(() => {
    void loadGroupMembers()
  }, [])
  const handleToggleAllAvailabilities = () => {
    const allAddresses = groupMembers
      .map(val => val.address)
      .filter((val): val is string => typeof val === 'string')
    setGroupAvailability(prev => ({
      ...prev,
      [props.id]:
        groupAvailability[props.id]?.length === allAddresses.length
          ? []
          : allAddresses,
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
            <Heading
              size={'sm'}
              maxW="20ch"
              w="fit-content"
              whiteSpace="nowrap"
              overflow="hidden"
              textOverflow="ellipsis"
            >
              {props.name}
            </Heading>
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
            {groupMembers?.map(({ address, ...groupMember }) => (
              <ScheduleGroupMember
                groupId={props.id}
                address={address as string}
                {...groupMember}
                key={groupMember.userId}
                currentAccount={currentAccount ?? null}
              />
            ))}
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
