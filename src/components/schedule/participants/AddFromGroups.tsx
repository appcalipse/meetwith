import { Accordion, VStack } from '@chakra-ui/react'

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
      <>
        <VStack alignItems="flex-start" mt={4} mb={6} width="100%" gap={4}>
          <Accordion gap={0} w="100%" allowToggle>
            <GroupCard
              currentAccount={currentAccount}
              key={group.id}
              currentGroupId={group.id}
              {...group}
            />
          </Accordion>
        </VStack>
      </>
    )
  )
}

export default AddFromGroups
