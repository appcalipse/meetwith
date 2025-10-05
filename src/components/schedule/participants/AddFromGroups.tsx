import {
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Text,
  VStack,
} from '@chakra-ui/react'
import { group } from 'console'
import { useRouter } from 'next/router'
import React, { useMemo, useState } from 'react'

import Loading from '@/components/Loading'
import SearchInput from '@/components/ui/SearchInput'
import useAccountContext from '@/hooks/useAccountContext'
import { useParticipants } from '@/providers/schedule/ParticipantsContext'
import { GetGroupsFullResponse } from '@/types/Group'

import GroupCard from './GroupCard'

const AddFromGroups = () => {
  const { groups, isGroupPrefetching } = useParticipants()
  const groupId = useRouter().query.groupId as string
  const currentAccount = useAccountContext()
  const [search, setSearch] = useState('')
  const { previewGroups, restGroups } = useMemo(() => {
    const previewGroups: GetGroupsFullResponse[] = []
    const restGroups: GetGroupsFullResponse[] = []
    const processedGroups = groups
      .map(g => ({
        ...g,
        members: g.members.filter(
          m =>
            m.address?.toLowerCase() !== currentAccount?.address.toLowerCase()
        ),
      }))
      .filter(g => g.members.length > 0)
    if (search) {
      const allGroups = processedGroups.filter(group =>
        group.members.some(
          member =>
            member.displayName?.toLowerCase().includes(search.toLowerCase()) ||
            member.address?.toLowerCase().includes(search.toLowerCase()) ||
            member.domain?.toLowerCase().includes(search.toLowerCase())
        )
      )
      previewGroups.push(...allGroups)
      restGroups.splice(0, restGroups.length)
    } else if (groupId) {
      previewGroups.push(
        ...processedGroups.filter(group => group.id === groupId)
      )
      restGroups.push(...processedGroups.filter(group => group.id !== groupId))
    } else {
      previewGroups.push(...processedGroups.slice(0, 3))
      restGroups.push(...processedGroups.slice(3))
    }

    return {
      previewGroups,
      restGroups,
    }
  }, [groupId, groups, search])

  return isGroupPrefetching ? (
    <VStack mb={6} w="100%" justifyContent="center">
      <Loading />
    </VStack>
  ) : groups.length > 0 ? (
    <>
      <Text>Add from Groups</Text>
      <VStack alignItems="flex-start" mt={4} mb={6} width="100%" gap={4}>
        <SearchInput
          setValue={setSearch}
          value={search}
          placeholder="Search for person in groups"
        />
        <Accordion gap={0} w="100%" allowToggle>
          <AccordionItem border={0} w="100%">
            {({ isExpanded }) => (
              <>
                <Accordion gap={0} w="100%" allowMultiple>
                  {previewGroups.map(group => (
                    <GroupCard
                      currentAccount={currentAccount}
                      key={group.id}
                      currentGroupId={groupId}
                      {...group}
                    />
                  ))}
                </Accordion>
                {!isExpanded && restGroups.length > 0 && (
                  <AccordionButton
                    p={0}
                    color="primary.200"
                    fontWeight={600}
                    mt={2}
                    textDecor="underline"
                  >
                    Show my other groups
                  </AccordionButton>
                )}
                <AccordionPanel px={0} mt={-3} py={0}>
                  <Accordion gap={0} w="100%" allowMultiple>
                    {restGroups.map(group => (
                      <GroupCard
                        currentAccount={currentAccount}
                        key={group.id}
                        currentGroupId={groupId}
                        {...group}
                      />
                    ))}
                  </Accordion>
                </AccordionPanel>
                {isExpanded && (
                  <AccordionButton
                    p={0}
                    color="primary.200"
                    fontWeight={600}
                    mt={2}
                    textDecor="underline"
                  >
                    Show less
                  </AccordionButton>
                )}
              </>
            )}
          </AccordionItem>
        </Accordion>
      </VStack>
    </>
  ) : (
    <Text>No groups available. Please create a group first.</Text>
  )
}

export default AddFromGroups
