import { Accordion, Divider, Text, VStack } from '@chakra-ui/react'
import { Fragment } from 'react'
import Loading from '@/components/Loading'
import useAccountContext from '@/hooks/useAccountContext'
import { useParticipants } from '@/providers/schedule/ParticipantsContext'

import GroupCard from './GroupCard'

const AddFromGroups = () => {
  const { group, isGroupPrefetching } = useParticipants()
  const currentAccount = useAccountContext()

  return isGroupPrefetching ? (
    <VStack mb={6} w="100%" justifyContent="center">
      <Loading />
    </VStack>
  ) : (
    group && (
      <Fragment>
        <Divider my={6} borderColor="neutral.400" />
        <VStack alignItems="flex-start" my={6} width="100%" gap={0}>
          <Text>Add from Group</Text>
          <Accordion gap={0} w="100%" allowToggle>
            <GroupCard
              currentAccount={currentAccount}
              key={group.id}
              currentGroupId={group.id}
              {...group}
            />
          </Accordion>
        </VStack>
      </Fragment>
    )
  )
}

export default AddFromGroups
