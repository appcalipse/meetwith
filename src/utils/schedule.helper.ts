import { Account } from '@meta/Account'
import { getAccount } from '@utils/api_helper'
import { getAddressFromDomain } from '@utils/rpc_helper_front'
import { isValidEmail, isValidEVMAddress } from '@utils/validations'

import { GetGroupsFullResponse } from '@/types/Group'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import { isGroupParticipant, Participant } from '@/types/schedule'

export const getMergedParticipants = (
  participants: Array<Participant>,
  groups: Array<GetGroupsFullResponse>,
  groupParticipants: Record<string, Array<string> | undefined>,
  accountAddress?: string
) => {
  const seenAddresses = new Set<string>()
  const allParticipants: Array<ParticipantInfo> = []

  const groupsMap = new Map(groups.map(g => [g.id, g]))

  for (const participant of participants) {
    if (isGroupParticipant(participant)) {
      const group = groupsMap.get(participant.id)
      if (!group) continue

      const groupMembers = groupParticipants?.[participant.id]
      if (!groupMembers) continue

      const membersMap = new Map(group.members?.map(m => [m.address, m]) || [])

      for (const memberAddress of groupMembers) {
        if (seenAddresses.has(memberAddress)) continue

        const groupMember = membersMap.get(memberAddress)
        if (groupMember?.address) {
          seenAddresses.add(memberAddress)
          allParticipants.push({
            account_address: groupMember.address,
            name: groupMember.displayName,
            type: ParticipantType.Invitee,
            status: ParticipationStatus.Pending,
            meeting_id: '',
          })
        }
      }
    } else {
      if (!seenAddresses.has(participant.account_address || '')) {
        seenAddresses.add(participant.account_address || '')
        allParticipants.push(participant)
      }
    }
  }

  return accountAddress
    ? allParticipants.filter(val => val.account_address !== accountAddress)
    : allParticipants
}

export const parseAccounts = async (
  participants: ParticipantInfo[]
): Promise<{ valid: ParticipantInfo[]; invalid: string[] }> => {
  const valid: ParticipantInfo[] = []
  const invalid: string[] = []
  for (const participant of participants) {
    if (
      isValidEVMAddress(participant.account_address || '') ||
      isValidEmail(participant.guest_email || '')
    ) {
      valid.push(participant)
    } else {
      const address = await getAddressFromDomain(participant.name || '')
      if (address) {
        valid.push({
          account_address: address,
          type: ParticipantType.Invitee,
          slot_id: '',
          meeting_id: '',
          status: ParticipationStatus.Pending,
        })
      } else if (participant.name) {
        let account: Account | null = null
        try {
          account = await getAccount(participant.name)
        } catch (e) {}

        if (account) {
          valid.push({
            account_address: account.address,
            type: ParticipantType.Invitee,
            slot_id: '',
            meeting_id: '',
            status: ParticipationStatus.Pending,
            name: participant.name,
          })
        } else {
          invalid.push(participant.name!)
        }
      }
    }
  }
  return { valid, invalid }
}
