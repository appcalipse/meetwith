import { Text, VStack } from '@chakra-ui/layout'
import { useCallback } from 'react'

import { ChipInput } from '@/components/chip-input'
import { useParticipants } from '@/providers/schedule/ParticipantsContext'
import { ParticipantInfo } from '@/types/ParticipantInfo'
import { isGroupParticipant } from '@/types/schedule'
import { NO_GROUP_KEY } from '@/utils/constants/group'
import { getMergedParticipants } from '@/utils/schedule.helper'
import { ellipsizeAddress } from '@/utils/user_manager'

const AllMeetingParticipants = () => {
  const {
    group,
    participants,
    setParticipants,
    groupParticipants,
    setGroupAvailability,
    setGroupParticipants,
  } = useParticipants()
  const allParticipants = getMergedParticipants(
    participants,
    groupParticipants,
    group
  ).filter(p => {
    return !p.isHidden
  })
  const onParticipantsChange = useCallback(
    (_participants: Array<ParticipantInfo>) => {
      const participantsDiff = allParticipants.find(
        (p): p is ParticipantInfo =>
          !isGroupParticipant(p) &&
          !_participants.some(np => np.account_address === p.account_address)
      )

      if (participantsDiff) {
        if (participants.includes(participantsDiff)) {
          setParticipants(prevUsers =>
            prevUsers.filter(
              user =>
                isGroupParticipant(user) ||
                user.account_address !== participantsDiff.account_address ||
                user.guest_email !== participantsDiff.guest_email
            )
          )

          setGroupAvailability(prev => ({
            ...prev,
            [NO_GROUP_KEY]: (prev[NO_GROUP_KEY] || []).filter(
              addr => addr !== participantsDiff.account_address
            ),
          }))

          setGroupParticipants(prev => ({
            ...prev,
            [NO_GROUP_KEY]: (prev[NO_GROUP_KEY] || []).filter(
              addr => addr !== participantsDiff.account_address
            ),
          }))
        } else {
          for (const [key, addresses] of Object.entries(groupParticipants)) {
            if (addresses?.includes(participantsDiff.account_address || '')) {
              setGroupParticipants(prev => ({
                ...prev,
                [key]: (prev[key] || []).filter(
                  addr => addr !== participantsDiff.account_address
                ),
              }))
              setGroupAvailability(prev => ({
                ...prev,
                [key]: (prev[key] || []).filter(
                  addr => addr !== participantsDiff.account_address
                ),
              }))
            }
          }
        }
      }
    },
    [allParticipants]
  )
  const renderParticipantItem = useCallback((p: ParticipantInfo) => {
    if (p.account_address) {
      return p.name || ellipsizeAddress(p.account_address)
    } else if (p.name && p.guest_email) {
      return `${p.name} - ${p.guest_email}`
    } else if (p.name) {
      return p.name
    } else {
      return p.guest_email!
    }
  }, [])

  return (
    <VStack w="100%" alignItems="flex-start">
      <Text>All Meeting Participants</Text>
      <ChipInput
        currentItems={allParticipants}
        placeholder="Enter email, wallet address or ENS of user"
        onChange={onParticipantsChange}
        renderItem={renderParticipantItem}
        isReadOnly
        addDisabled
      />
    </VStack>
  )
}

export default AllMeetingParticipants
