import {
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import React, { useMemo, useState } from 'react'

import SearchInput from '@/components/ui/SearchInput'
import useAccountContext from '@/hooks/useAccountContext'
import { useParticipants } from '@/providers/schedule/ParticipantsContext'
import { GetGroupsFullResponse } from '@/types/Group'

import GroupCard from './GroupCard'

const AddFromGroups = () => {
  const { groups } = useParticipants()
  const groupId = useRouter().query.groupId as string
  const currentAccount = useAccountContext()
  const [search, setSearch] = useState('')
  const { previewGroups, restGroups } = useMemo(() => {
    const previewGroups: GetGroupsFullResponse[] = []
    const restGroups: GetGroupsFullResponse[] = []
    if (search) {
      const allGroups = groups.filter(group =>
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
      previewGroups.push(...groups.filter(group => group.id === groupId))
      restGroups.push(...groups.filter(group => group.id !== groupId))
    } else {
      previewGroups.push(...groups.slice(0, 3))
      restGroups.push(...groups.slice(3))
    }

    return {
      previewGroups,
      restGroups,
    }
  }, [groupId, groups, search])

  return (
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
  )
}

export default AddFromGroups
