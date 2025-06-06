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
  groupParticipants: Record<string, Array<string>>,
  accountAddress: string
) => {
  const allParticipants: Array<ParticipantInfo> = []
  for (const participant of participants) {
    if (isGroupParticipant(participant)) {
      const group = groups.find(g => g.id === participant.id)
      if (group) {
        const groupMembers = groupParticipants?.[participant.id] || []
        const membersSanitized = groupMembers
          .map(member => {
            const groupMember = group.members.find(m => m.address === member)
            if (
              groupMember &&
              groupMember.address &&
              allParticipants.every(
                val => val.account_address !== groupMember.address
              )
            ) {
              return {
                account_address: groupMember.address,
                name: groupMember.displayName,
                type: ParticipantType.Invitee,
                status: ParticipationStatus.Accepted,
                meeting_id: '',
              }
            }
            return undefined
          })
          .filter(val => val !== undefined)
        allParticipants.push(...membersSanitized)
      }
    } else {
      allParticipants.push(participant)
    }
  }
  return allParticipants.filter(val => val.account_address !== accountAddress)
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
