import { MeetingType } from '@/types/Account'

import { initDB } from './database'
import { AvailabilityBlockNotFoundError } from './errors'

const db = initDB()

export const getMeetingTypesForAvailabilityBlock = async (
  account_address: string,
  availability_block_id: string
): Promise<MeetingType[]> => {
  // First verify the availability block exists and belongs to the account
  const { data: block, error: blockError } = await db.supabase
    .from('availabilities')
    .select('id')
    .eq('id', availability_block_id)
    .eq('account_owner_address', account_address)
    .single()

  if (blockError || !block) {
    throw new AvailabilityBlockNotFoundError()
  }

  // Get meeting type IDs associated with this availability block
  const { data: meetingTypeIds, error: idsError } = await db.supabase
    .from('meeting_type_availabilities')
    .select('meeting_type_id')
    .eq('availability_id', availability_block_id)

  if (idsError) {
    throw new Error('Failed to fetch meeting type associations')
  }

  if (!meetingTypeIds || meetingTypeIds.length === 0) {
    return []
  }

  const ids = meetingTypeIds.map(
    (item: { meeting_type_id: string }) => item.meeting_type_id
  )

  // Get meeting types associated with this availability block
  const { data, error } = await db.supabase
    .from('meeting_type')
    .select(
      `
      *,
      availabilities: meeting_type_availabilities(availabilities(*)),
      plan: meeting_type_plan(*),
      connected_calendars: meeting_type_calendars(
         connected_calendars(id, email, provider)
      )
      `
    )
    .eq('account_owner_address', account_address)
    .is('deleted_at', null)
    .in('id', ids)

  if (error) {
    throw new Error('Failed to fetch meeting types')
  }

  const transformedData = data?.map(meetingType => ({
    ...meetingType,
    calendars: meetingType?.connected_calendars?.map(
      (calendar: { connected_calendars: any }) => calendar.connected_calendars
    ),
    availabilities: meetingType?.availabilities?.map(
      (availability: { availabilities: any }) => availability.availabilities
    ),
    plan: meetingType?.plan?.[0],
  }))

  return transformedData as MeetingType[]
}

export const updateAvailabilityBlockMeetingTypes = async (
  account_address: string,
  availability_block_id: string,
  meeting_type_ids: string[]
) => {
  // First verify the availability block exists and belongs to the account
  const { data: block, error: blockError } = await db.supabase
    .from('availabilities')
    .select('id')
    .eq('id', availability_block_id)
    .eq('account_owner_address', account_address)
    .single()

  if (blockError || !block) {
    throw new AvailabilityBlockNotFoundError()
  }

  // Get current meeting type associations
  const { data: current } = await db.supabase
    .from('meeting_type_availabilities')
    .select('meeting_type_id')
    .eq('availability_id', availability_block_id)

  const currentIds =
    current?.map((c: { meeting_type_id: string }) => c.meeting_type_id) || []
  const newIds = meeting_type_ids

  const toDelete = currentIds.filter((id: string) => !newIds.includes(id))
  const toInsert = newIds.filter((id: string) => !currentIds.includes(id))

  // Delete removed associations
  if (toDelete.length > 0) {
    const { error: deleteError } = await db.supabase
      .from('meeting_type_availabilities')
      .delete()
      .eq('availability_id', availability_block_id)
      .in('meeting_type_id', toDelete)

    if (deleteError) {
      throw new Error('Failed to remove meeting type associations')
    }
  }

  // Insert new associations
  if (toInsert.length > 0) {
    const { error: insertError } = await db.supabase
      .from('meeting_type_availabilities')
      .insert(
        toInsert.map(meeting_type_id => ({
          availability_id: availability_block_id,
          meeting_type_id: meeting_type_id,
        }))
      )

    if (insertError) {
      throw new Error('Failed to add meeting type associations')
    }
  }
}
