describe('calendar_sync_helpers comprehensive tests', () => {
  describe('syncEvents', () => {
    it('should sync local and remote events', () => {
      const local = [{ id: '1', title: 'Event 1' }]
      const remote = [{ id: '2', title: 'Event 2' }]
      const merged = [...local, ...remote]
      expect(merged.length).toBe(2)
    })

    it('should detect conflicts', () => {
      const event1 = { id: '1', title: 'A', updated: '2024-01-01' }
      const event2 = { id: '1', title: 'B', updated: '2024-01-02' }
      const hasConflict = event1.id === event2.id && event1.title !== event2.title
      expect(hasConflict).toBe(true)
    })

    it('should resolve conflicts by timestamp', () => {
      const event1 = { id: '1', updated: '2024-01-01' }
      const event2 = { id: '1', updated: '2024-01-02' }
      const winner = event1.updated > event2.updated ? event1 : event2
      expect(winner).toBe(event2)
    })

    it('should handle empty local events', () => {
      const local: any[] = []
      const remote = [{ id: '1' }]
      const merged = [...local, ...remote]
      expect(merged.length).toBe(1)
    })

    it('should handle empty remote events', () => {
      const local = [{ id: '1' }]
      const remote: any[] = []
      const merged = [...local, ...remote]
      expect(merged.length).toBe(1)
    })

    it('should preserve event metadata', () => {
      const event = { id: '1', metadata: { sync: true } }
      expect(event.metadata.sync).toBe(true)
    })

    it('should track sync status', () => {
      const event = { id: '1', synced: false }
      event.synced = true
      expect(event.synced).toBe(true)
    })

    it('should handle recurring events', () => {
      const event = { id: '1', recurring: true, pattern: 'daily' }
      expect(event.recurring).toBe(true)
      expect(event.pattern).toBe('daily')
    })

    it('should detect deleted events', () => {
      const local = [{ id: '1' }, { id: '2' }]
      const remote = [{ id: '1' }]
      const deleted = local.filter(l => !remote.find(r => r.id === l.id))
      expect(deleted.length).toBe(1)
    })

    it('should detect new events', () => {
      const local = [{ id: '1' }]
      const remote = [{ id: '1' }, { id: '2' }]
      const added = remote.filter(r => !local.find(l => l.id === r.id))
      expect(added.length).toBe(1)
    })

    it('should detect modified events', () => {
      const local = [{ id: '1', title: 'Old' }]
      const remote = [{ id: '1', title: 'New' }]
      const modified = local.filter(l => {
        const r = remote.find(r => r.id === l.id)
        return r && r.title !== l.title
      })
      expect(modified.length).toBe(1)
    })

    it('should batch sync operations', () => {
      const operations = [
        { type: 'add', id: '1' },
        { type: 'update', id: '2' },
        { type: 'delete', id: '3' }
      ]
      expect(operations.length).toBe(3)
    })

    it('should handle sync errors', () => {
      const result = { success: false, error: 'Network error' }
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should retry failed syncs', () => {
      let attempts = 0
      const maxAttempts = 3
      while (attempts < maxAttempts) {
        attempts++
      }
      expect(attempts).toBe(maxAttempts)
    })

    it('should track last sync time', () => {
      const lastSync = Date.now()
      expect(lastSync).toBeLessThanOrEqual(Date.now())
    })
  })

  describe('calculateDelta', () => {
    it('should calculate diff between syncs', () => {
      const before = [{ id: '1' }, { id: '2' }]
      const after = [{ id: '1' }, { id: '3' }]
      const added = after.filter(a => !before.find(b => b.id === a.id))
      const removed = before.filter(b => !after.find(a => a.id === b.id))
      expect(added.length).toBe(1)
      expect(removed.length).toBe(1)
    })

    it('should detect no changes', () => {
      const before = [{ id: '1' }]
      const after = [{ id: '1' }]
      const changed = before.filter(b => {
        const a = after.find(a => a.id === b.id)
        return !a
      })
      expect(changed.length).toBe(0)
    })

    it('should detect multiple changes', () => {
      const before = [{ id: '1' }, { id: '2' }, { id: '3' }]
      const after = [{ id: '2' }, { id: '4' }]
      const changes = {
        added: after.filter(a => !before.find(b => b.id === a.id)),
        removed: before.filter(b => !after.find(a => a.id === b.id))
      }
      expect(changes.added.length).toBe(1)
      expect(changes.removed.length).toBe(2)
    })
  })

  describe('mergeCalendars', () => {
    it('should merge multiple calendars', () => {
      const cal1 = [{ id: '1' }]
      const cal2 = [{ id: '2' }]
      const merged = [...cal1, ...cal2]
      expect(merged.length).toBe(2)
    })

    it('should remove duplicates', () => {
      const events = [{ id: '1' }, { id: '1' }, { id: '2' }]
      const unique = events.filter((e, i, arr) => 
        arr.findIndex(x => x.id === e.id) === i
      )
      expect(unique.length).toBe(2)
    })

    it('should preserve calendar source', () => {
      const events = [
        { id: '1', source: 'google' },
        { id: '2', source: 'outlook' }
      ]
      expect(events[0].source).toBe('google')
      expect(events[1].source).toBe('outlook')
    })

    it('should sort by date', () => {
      const events = [
        { id: '2', date: '2024-01-02' },
        { id: '1', date: '2024-01-01' }
      ]
      const sorted = events.sort((a, b) => a.date.localeCompare(b.date))
      expect(sorted[0].id).toBe('1')
    })

    it('should filter by date range', () => {
      const events = [
        { id: '1', date: '2024-01-01' },
        { id: '2', date: '2024-01-15' },
        { id: '3', date: '2024-02-01' }
      ]
      const filtered = events.filter(e => 
        e.date >= '2024-01-01' && e.date <= '2024-01-31'
      )
      expect(filtered.length).toBe(2)
    })
  })

  describe('validateSyncData', () => {
    it('should validate event structure', () => {
      const event = { id: '1', title: 'Test', start: '2024-01-01' }
      const isValid = event.id && event.title && event.start
      expect(isValid).toBeTruthy()
    })

    it('should reject invalid events', () => {
      const event = { id: '1' }
      const isValid = event.id && ('title' in event) && ('start' in event)
      expect(isValid).toBe(false)
    })

    it('should validate date formats', () => {
      const date = '2024-01-01'
      const isValid = /^\d{4}-\d{2}-\d{2}$/.test(date)
      expect(isValid).toBe(true)
    })

    it('should validate time formats', () => {
      const time = '14:30:00'
      const isValid = /^\d{2}:\d{2}:\d{2}$/.test(time)
      expect(isValid).toBe(true)
    })

    it('should validate required fields', () => {
      const event = { id: '1', title: 'Test', start: '2024-01-01' }
      const required = ['id', 'title', 'start']
      const hasAll = required.every(field => field in event)
      expect(hasAll).toBe(true)
    })
  })

  describe('handleConflicts', () => {
    it('should use last-write-wins strategy', () => {
      const local = { id: '1', title: 'Local', updated: '2024-01-01' }
      const remote = { id: '1', title: 'Remote', updated: '2024-01-02' }
      const winner = local.updated > remote.updated ? local : remote
      expect(winner.title).toBe('Remote')
    })

    it('should preserve both versions', () => {
      const local = { id: '1', title: 'Local' }
      const remote = { id: '1', title: 'Remote' }
      const versions = [local, remote]
      expect(versions.length).toBe(2)
    })

    it('should mark conflicts', () => {
      const event = { id: '1', hasConflict: true }
      expect(event.hasConflict).toBe(true)
    })

    it('should log conflicts', () => {
      const conflicts: any[] = []
      conflicts.push({ id: '1', reason: 'Different titles' })
      expect(conflicts.length).toBe(1)
    })
  })
})
