import { DateTime } from 'luxon'
import React, { createContext, ReactNode, useContext, useState } from 'react'

import { mergeTimeRanges } from '@/utils/quickpoll_helper'

interface AvailabilitySlot {
  weekday: number
  ranges: Array<{ start: string; end: string }>
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
}

const AvailabilityTrackerContext = createContext<
  AvailabilityTrackerContextType | undefined
>(undefined)

interface AvailabilityTrackerProviderProps {
  children: ReactNode
}

export const AvailabilityTrackerProvider: React.FC<
  AvailabilityTrackerProviderProps
> = ({ children }) => {
  const [selectedSlots, setSelectedSlots] = useState<SelectedTimeSlot[]>([])

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
    setSelectedSlots(prev =>
      prev.filter(s => !s.start.equals(slot.start) || !s.end.equals(slot.end))
    )
  }

  const isSlotSelected = (slot: SelectedTimeSlot): boolean => {
    return selectedSlots.some(
      s => s.start.equals(slot.start) && s.end.equals(slot.end)
    )
  }

  const clearSlots = () => {
    setSelectedSlots([])
  }

  const getAvailabilitySlots = (): AvailabilitySlot[] => {
    // Group slots by weekday
    const slotsByWeekday = new Map<
      number,
      Array<{ start: string; end: string }>
    >()

    selectedSlots.forEach(slot => {
      const weekday = slot.start.weekday % 7
      const startTime = slot.start.toFormat('HH:mm')
      const endTime = slot.end.toFormat('HH:mm')

      if (!slotsByWeekday.has(weekday)) {
        slotsByWeekday.set(weekday, [])
      }

      slotsByWeekday.get(weekday)!.push({ start: startTime, end: endTime })
    })

    // Convert to AvailabilitySlot format
    const availabilitySlots: AvailabilitySlot[] = []

    for (let weekday = 0; weekday < 7; weekday++) {
      const ranges = slotsByWeekday.get(weekday) || []

      // Merge overlapping/adjacent ranges
      const mergedRanges = mergeTimeRanges(ranges)

      availabilitySlots.push({
        weekday,
        ranges: mergedRanges,
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
