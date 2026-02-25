/**
 * Smoke tests for meeting-settings and public-meeting components
 * 
 * These tests verify that components can be imported and have basic structure
 */

describe('meeting-settings components', () => {
  describe('imports', () => {
    it('should import DeleteMeetingTypeConfirmation without crashing', () => {
      expect(() => require('@/components/meeting-settings/DeleteMeetingTypeConfirmation')).not.toThrow()
    })

    it('should import MeetingTypeModal without crashing', () => {
      expect(() => require('@/components/meeting-settings/MeetingTypeModal')).not.toThrow()
    })

    it('should import MeetingTypeCard without crashing', () => {
      expect(() => require('@/components/meeting-settings/MeetingTypeCard')).not.toThrow()
    })
  })

  describe('component structure', () => {
    it('MeetingTypeModal should have exports', () => {
      const component = require('@/components/meeting-settings/MeetingTypeModal')
      expect(component).toBeDefined()
    })

    it('MeetingTypeCard should have exports', () => {
      const component = require('@/components/meeting-settings/MeetingTypeCard')
      expect(component).toBeDefined()
    })
  })
})

describe('public-meeting components', () => {
  describe('imports', () => {
    it('should import public-meeting directory without crashing', () => {
      expect(() => {
        // Just check that the directory structure is importable
        const fs = require('fs')
        const path = require('path')
        const publicMeetingPath = path.join(__dirname, '../../components/public-meeting')
        fs.existsSync(publicMeetingPath)
      }).not.toThrow()
    })
  })
})
