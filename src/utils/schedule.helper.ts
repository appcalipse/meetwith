import { Account } from '@meta/Account'
import { getAccount } from '@utils/api_helper'
import { getAddressFromDomain } from '@utils/rpc_helper_front'
import { isValidEmail, isValidEVMAddress } from '@utils/validations'
import { Interval } from 'luxon'

import { AvailabilityBlock } from '@/types/availability'
import { GetGroupsFullResponse } from '@/types/Group'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import { isGroupParticipant, Participant } from '@/types/schedule'

import { parseMonthAvailabilitiesToDate } from './date_helper'
import { mergeLuxonIntervals } from './quickpoll_helper'

export const getMergedParticipants = (
  participants: Array<Participant>,
  groupParticipants: Record<string, Array<string> | undefined>,
  activeGroup?: GetGroupsFullResponse,
  accountAddress?: string
) => {
  const seenAddresses = new Set<string>()
  const allParticipants: Array<ParticipantInfo> = []

  const groupsMap = new Map(
    [activeGroup]
      .filter((g): g is GetGroupsFullResponse => Boolean(g))
      .map(g => [g.id, g])
  )

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
            meeting_id: '',
            name: groupMember.displayName,
            status: ParticipationStatus.Pending,
            type: ParticipantType.Invitee,
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

  if (accountAddress) {
    const addr = accountAddress.toLowerCase()
    return allParticipants.filter(
      p => (p.account_address || '').toLowerCase() !== addr
    )
  }

  return allParticipants
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
          meeting_id: '',
          slot_id: '',
          status: ParticipationStatus.Pending,
          type: ParticipantType.Invitee,
        })
      } else if (participant.name) {
        let account: Account | null = null
        try {
          account = await getAccount(participant.name)
        } catch (_e) {}

        if (account) {
          valid.push({
            account_address: account.address,
            meeting_id: '',
            name: participant.name,
            slot_id: '',
            status: ParticipationStatus.Pending,
            type: ParticipantType.Invitee,
          })
        } else {
          invalid.push(participant.name!)
        }
      }
    }
  }
  return { invalid, valid }
}

/**
 * Merges multiple availability blocks into a single array of intervals.
 * Used when a group member has multiple availability blocks configured for a group.
 * Each block may have a different timezone, which is handled during parsing.
 */
export const mergeAvailabilityBlocks = (
  blocks: AvailabilityBlock[],
  monthStart: Date,
  monthEnd: Date
): Interval[] => {
  if (!blocks || blocks.length === 0) {
    return []
  }

  const allIntervals: Interval[] = []

  for (const block of blocks) {
    if (!block.weekly_availability || block.weekly_availability.length === 0) {
      continue
    }

    const blockIntervals = parseMonthAvailabilitiesToDate(
      block.weekly_availability,
      monthStart,
      monthEnd,
      block.timezone || 'UTC'
    )

    allIntervals.push(...blockIntervals)
  }

  // Merge overlapping intervals to avoid duplicates
  return mergeLuxonIntervals(allIntervals)
}
