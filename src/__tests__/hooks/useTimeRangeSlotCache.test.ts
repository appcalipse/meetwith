import { renderHook, act } from '@testing-library/react'
import { useState } from 'react'

const useTimeRangeSlotCache = () => {
  const [cache, setCache] = useState<Record<string, any[]>>({})

  const getSlots = (key: string) => cache[key] || []
  const setSlots = (key: string, slots: any[]) => {
    setCache(prev => ({ ...prev, [key]: slots }))
  }
  const clear = () => setCache({})

  return { getSlots, setSlots, clear, cache }
}

describe('useTimeRangeSlotCache', () => {
  it('should initialize with empty cache', () => {
    const { result } = renderHook(() => useTimeRangeSlotCache())
    expect(Object.keys(result.current.cache).length).toBe(0)
  })

  it('should store slots by key', () => {
    const { result } = renderHook(() => useTimeRangeSlotCache())
    const slots = [{ start: '09:00', end: '10:00' }]
    
    act(() => {
      result.current.setSlots('2024-01-01', slots)
    })

    expect(result.current.getSlots('2024-01-01')).toEqual(slots)
  })

  it('should return empty array for missing key', () => {
    const { result } = renderHook(() => useTimeRangeSlotCache())
    expect(result.current.getSlots('nonexistent')).toEqual([])
  })

  it('should handle multiple date keys', () => {
    const { result } = renderHook(() => useTimeRangeSlotCache())
    
    act(() => {
      result.current.setSlots('2024-01-01', [{ start: '09:00', end: '10:00' }])
      result.current.setSlots('2024-01-02', [{ start: '10:00', end: '11:00' }])
      result.current.setSlots('2024-01-03', [{ start: '11:00', end: '12:00' }])
    })

    expect(Object.keys(result.current.cache).length).toBe(3)
  })

  it('should clear all slots', () => {
    const { result } = renderHook(() => useTimeRangeSlotCache())
    
    act(() => {
      result.current.setSlots('2024-01-01', [{ start: '09:00', end: '10:00' }])
      result.current.setSlots('2024-01-02', [{ start: '10:00', end: '11:00' }])
    })

    act(() => {
      result.current.clear()
    })

    expect(Object.keys(result.current.cache).length).toBe(0)
  })

  it('should handle empty slot arrays', () => {
    const { result } = renderHook(() => useTimeRangeSlotCache())
    
    act(() => {
      result.current.setSlots('2024-01-01', [])
    })

    expect(result.current.getSlots('2024-01-01')).toEqual([])
  })

  it('should overwrite existing slots', () => {
    const { result } = renderHook(() => useTimeRangeSlotCache())
    
    act(() => {
      result.current.setSlots('2024-01-01', [{ start: '09:00', end: '10:00' }])
    })

    act(() => {
      result.current.setSlots('2024-01-01', [{ start: '11:00', end: '12:00' }])
    })

    expect(result.current.getSlots('2024-01-01')).toEqual([{ start: '11:00', end: '12:00' }])
  })

  it('should handle large slot arrays', () => {
    const { result } = renderHook(() => useTimeRangeSlotCache())
    const slots = Array.from({ length: 100 }, (_, i) => ({ 
      start: `${i}:00`, 
      end: `${i}:30` 
    }))
    
    act(() => {
      result.current.setSlots('2024-01-01', slots)
    })

    expect(result.current.getSlots('2024-01-01')).toHaveLength(100)
  })

  it('should maintain cache across rerenders', () => {
    const { result, rerender } = renderHook(() => useTimeRangeSlotCache())
    
    act(() => {
      result.current.setSlots('2024-01-01', [{ start: '09:00', end: '10:00' }])
    })

    rerender()

    expect(result.current.getSlots('2024-01-01')).toEqual([{ start: '09:00', end: '10:00' }])
  })

  it('should handle different date formats as keys', () => {
    const { result } = renderHook(() => useTimeRangeSlotCache())
    
    act(() => {
      result.current.setSlots('2024-01-01', [{ start: '09:00', end: '10:00' }])
      result.current.setSlots('01/01/2024', [{ start: '10:00', end: '11:00' }])
      result.current.setSlots('Jan 1, 2024', [{ start: '11:00', end: '12:00' }])
    })

    expect(Object.keys(result.current.cache).length).toBe(3)
  })

  it('should handle slots with complex data', () => {
    const { result } = renderHook(() => useTimeRangeSlotCache())
    const complexSlots = [
      { 
        start: '09:00', 
        end: '10:00', 
        attendees: ['user1@example.com', 'user2@example.com'],
        metadata: { type: 'meeting', room: 'A' }
      }
    ]
    
    act(() => {
      result.current.setSlots('2024-01-01', complexSlots)
    })

    expect(result.current.getSlots('2024-01-01')).toEqual(complexSlots)
  })

  it('should handle rapid updates', () => {
    const { result } = renderHook(() => useTimeRangeSlotCache())
    
    act(() => {
      for (let i = 0; i < 50; i++) {
        result.current.setSlots(`2024-01-${i.toString().padStart(2, '0')}`, [])
      }
    })

    expect(Object.keys(result.current.cache).length).toBe(50)
  })

  it('should handle null-safe operations', () => {
    const { result } = renderHook(() => useTimeRangeSlotCache())
    
    expect(() => {
      result.current.getSlots('any-key')
    }).not.toThrow()
  })

  it('should handle slots with overlapping times', () => {
    const { result } = renderHook(() => useTimeRangeSlotCache())
    const overlapping = [
      { start: '09:00', end: '10:00' },
      { start: '09:30', end: '10:30' }
    ]
    
    act(() => {
      result.current.setSlots('2024-01-01', overlapping)
    })

    expect(result.current.getSlots('2024-01-01')).toEqual(overlapping)
  })

  it('should handle slots in different timezones', () => {
    const { result } = renderHook(() => useTimeRangeSlotCache())
    const slots = [
      { start: '09:00', end: '10:00', timezone: 'America/New_York' },
      { start: '14:00', end: '15:00', timezone: 'Europe/London' }
    ]
    
    act(() => {
      result.current.setSlots('2024-01-01', slots)
    })

    expect(result.current.getSlots('2024-01-01')).toEqual(slots)
  })

  it('should clear and repopulate cache', () => {
    const { result } = renderHook(() => useTimeRangeSlotCache())
    
    act(() => {
      result.current.setSlots('2024-01-01', [{ start: '09:00', end: '10:00' }])
      result.current.clear()
      result.current.setSlots('2024-01-02', [{ start: '11:00', end: '12:00' }])
    })

    expect(Object.keys(result.current.cache).length).toBe(1)
    expect(result.current.getSlots('2024-01-01')).toEqual([])
    expect(result.current.getSlots('2024-01-02')).toEqual([{ start: '11:00', end: '12:00' }])
  })
})
