const getBaseEventId = (googleEventId: string): string => {
  const sanitizedMeetingId = googleEventId.split('_')[0] // '02cd383a77214840b5a1ad4ceb545ff8'
  // Insert hyphens in UUID format: 8-4-4-4-12
  return [
    sanitizedMeetingId.slice(0, 8),
    sanitizedMeetingId.slice(8, 12),
    sanitizedMeetingId.slice(12, 16),
    sanitizedMeetingId.slice(16, 20),
    sanitizedMeetingId.slice(20, 32),
  ].join('-')
}

const extractSlotIdFromDescription = (description: string): string | null => {
  const match = description.match(/meetingId=([a-f0-9-]{36})/i)
  return match ? match[1] : null
}

export { extractSlotIdFromDescription, getBaseEventId }
