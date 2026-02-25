import { DateTime, Interval } from 'luxon'
import React, { createContext, useContext, useState } from 'react'

import {
  doSlotsOverlapOrContain,
  mergeTimeRanges,
} from '@/utils/quickpoll_helper'

interface AvailabilitySlot {
  weekday: number
  ranges: Array<{ start: string; end: string }>
  date?: string
}

interface SelectedTimeSlot {
  start: DateTime
  end: DateTime
  date: string
}

interface AvailabilityTrackerContextType {
  selectedSlots: SelectedTimeSlot[]
  addSlot: (slot: SelectedTimeSlot) => void
  removeSlot: (slot: SelectedTimeSlot) => void
  isSlotSelected: (slot: SelectedTimeSlot) => boolean
  clearSlots: () => void
  getAvailabilitySlots: () => AvailabilitySlot[]
  loadSlots: (slots: SelectedTimeSlot[]) => void
}

const AvailabilityTrackerContext = createContext<
  AvailabilityTrackerContextType | undefined
>(undefined)

export const AvailabilityTrackerProvider: React.FC<{
  children: React.ReactNode
  initialSlots?: SelectedTimeSlot[]
}> = ({ children, initialSlots = [] }) => {
  const [selectedSlots, setSelectedSlots] =
    useState<SelectedTimeSlot[]>(initialSlots)

  const addSlot = (slot: SelectedTimeSlot) => {
    setSelectedSlots(prev => {
      const exists = prev.some(
        s => s.start.equals(slot.start) && s.end.equals(slot.end)
      )
      if (!exists) {
        return [...prev, slot]
      }
      return prev
    })
  }

  const removeSlot = (slot: SelectedTimeSlot) => {
    setSelectedSlots(prev => {
      const slotInterval = Interval.fromDateTimes(slot.start, slot.end)
      if (!slotInterval.isValid) return prev

      return prev.filter(s => {
        const sInterval = Interval.fromDateTimes(s.start, s.end)
        if (!sInterval.isValid) return true

        return !doSlotsOverlapOrContain(slot, s)
      })
    })
  }

  const isSlotSelected = (slot: SelectedTimeSlot): boolean => {
    // Check if the slot overlaps with any selected slot
    return selectedSlots.some(s => doSlotsOverlapOrContain(slot, s))
  }

  const clearSlots = () => {
    setSelectedSlots([])
  }

  const loadSlots = (slots: SelectedTimeSlot[]) => {
    setSelectedSlots(slots)
  }

  const getAvailabilitySlots = (): AvailabilitySlot[] => {
    // Group slots by specific calendar date (yyyy-MM-dd)
    const slotsByDate = new Map<string, Array<{ start: string; end: string }>>()

    selectedSlots.forEach(slot => {
      const dateKey = slot.start.toFormat('yyyy-MM-dd')
      const startTime = slot.start.toFormat('HH:mm')
      const endTime = slot.end.toFormat('HH:mm')

      if (!slotsByDate.has(dateKey)) {
        slotsByDate.set(dateKey, [])
      }

      slotsByDate.get(dateKey)!.push({ start: startTime, end: endTime })
    })

    // Convert to AvailabilitySlot format
    const availabilitySlots: AvailabilitySlot[] = []

    for (const [dateKey, ranges] of slotsByDate.entries()) {
      const mergedRanges = mergeTimeRanges(ranges)
      const weekday = DateTime.fromFormat(dateKey, 'yyyy-MM-dd').weekday % 7

      availabilitySlots.push({
        weekday,
        ranges: mergedRanges,
        date: dateKey,
      })
    }

    return availabilitySlots
  }

  const value: AvailabilityTrackerContextType = {
    selectedSlots,
    addSlot,
    removeSlot,
    isSlotSelected,
    clearSlots,
    getAvailabilitySlots,
    loadSlots,
  }

  return (
    <AvailabilityTrackerContext.Provider value={value}>
      {children}
    </AvailabilityTrackerContext.Provider>
  )
}

export const useAvailabilityTracker = (): AvailabilityTrackerContextType => {
  const context = useContext(AvailabilityTrackerContext)
  if (!context) {
    throw new Error(
      'useAvailabilityTracker must be used within an AvailabilityTrackerProvider'
    )
  }
  return context
}

export type { AvailabilitySlot, SelectedTimeSlot }
