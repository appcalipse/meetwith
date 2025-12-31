// Replace the entire handleChipInputChange with this service-based approach

import { ParticipantInfo, ParticipantType } from '@/types/ParticipantInfo'
import { isGroupParticipant, Participant } from '@/types/schedule'

import { NO_GROUP_KEY } from './constants/group'
import { deduplicateArray } from './generic_utils'
import { ellipsizeAddress } from './user_manager'

interface ParticipantChangeResult {
  added: ParticipantInfo[]
  removed: ParticipantInfo[]
}

class ParticipantService {
  private added: ParticipantInfo[]
  private removed: ParticipantInfo[]
  constructor(current: ParticipantInfo[], updated: ParticipantInfo[]) {
    const { added, removed } = this.computeParticipantChanges(current, updated)
    this.added = added
    this.removed = removed
  }
  private computeParticipantChanges(
    current: ParticipantInfo[],
    updated: ParticipantInfo[]
  ): ParticipantChangeResult {
    const currentMap = new Map(current.map(p => [this.getStableId(p), p]))
    const updatedMap = new Map(updated.map(p => [this.getStableId(p), p]))

    const toAdd = updated.filter(p => !currentMap.has(this.getStableId(p)))
    const toRemove = current.filter(p => !updatedMap.has(this.getStableId(p)))

    return {
      added: deduplicateArray(toAdd),
      removed: deduplicateArray(toRemove),
    }
  }

  private getStableId(participant: ParticipantInfo): string {
    return (
      participant.account_address?.toLowerCase() ||
      participant.guest_email?.toLowerCase() ||
      participant.name?.toLowerCase() ||
      ''
    )
  }
  handleDerivatives(prev: Record<string, Array<string> | undefined>) {
    const updated = { ...prev }
    for (const participant of this.removed) {
      if (!participant.account_address) continue

      const accountAddress = participant.account_address.toLowerCase()
      for (const [key, addresses] of Object.entries(updated)) {
        if (addresses?.includes(accountAddress)) {
          updated[key] = addresses.filter(val => val !== accountAddress)
        }
      }
    }

    const toAdd = new Set<string>()
    for (const participant of this.added) {
      if (participant.account_address) {
        toAdd.add(participant.account_address.toLowerCase())
      }
    }

    if (toAdd.size > 0) {
      const existing = new Set(updated[NO_GROUP_KEY] || [])
      const newAddresses = [...existing]

      for (const address of toAdd) {
        if (!existing.has(address)) {
          newAddresses.push(address)
        }
      }

      updated[NO_GROUP_KEY] = newAddresses
    }
    return updated
  }
  handleParticipantUpdate(prev: Participant[]) {
    let updated = [...prev]

    this.removed.forEach(participant => {
      updated = updated.filter(p => {
        if (isGroupParticipant(p)) return true
        const stableId = this.getStableId(participant)
        return this.getStableId(p) !== stableId
      })
    })

    this.added.forEach(participant => {
      updated.push(participant)
    })

    return deduplicateArray(updated)
  }
  static renderParticipantChipLabel(
    participant: Participant,
    currentAccountAddress: string
  ) {
    if (isGroupParticipant(participant)) {
      return participant.name
    }
    const participantInfo = participant as ParticipantInfo
    const isParticipantScheduler =
      participantInfo.type === ParticipantType.Scheduler

    if (isParticipantScheduler) {
      const isCurrentUser =
        participantInfo.account_address &&
        participantInfo.account_address.toLowerCase() ===
          currentAccountAddress.toLowerCase()
      if (isCurrentUser) {
        return 'You (Scheduler)'
      }
      const baseName =
        participantInfo.name ||
        participantInfo.guest_email ||
        ellipsizeAddress(participantInfo.account_address || '')
      return `${baseName} (Scheduler)`
    }

    return (
      participantInfo.name ||
      participantInfo.guest_email ||
      ellipsizeAddress(participantInfo.account_address || '')
    )
  }
}

export default ParticipantService
