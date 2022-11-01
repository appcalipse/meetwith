import { createClient } from '@supabase/supabase-js'

import { ConnectedCalendar } from '@/types/CalendarConnections'
import { getConnectedCalendarIntegration } from '@/utils/services/connected_calendars.factory'

// Created to migrate old calendar models to new one
export const fixCalendarConnectionIfNeeded = async (): Promise<void> => {
  const db: any = { supabase: null }
  db.supabase = createClient(
    process.env.NEXT_SUPABASE_URL!,
    process.env.NEXT_SUPABASE_KEY!
  )

  const { data } = (await db.supabase.from('connected_calendars').select()) as {
    data: ConnectedCalendar[]
  }

  for (const calendarConnection of data) {
    if (calendarConnection && calendarConnection.calendars === null) {
      const integration = getConnectedCalendarIntegration(
        calendarConnection.account_address,
        calendarConnection.email,
        calendarConnection.provider,
        calendarConnection.payload
      )

      const calendars = await integration.refreshConnection()

      for (const cal of calendars) {
        if (cal.enabled) {
          cal.sync = (calendarConnection as any).sync
        }
      }

      const { data, error } = await db.supabase
        .from('connected_calendars')
        .update({ calendars, updated: new Date() })
        .eq('id', calendarConnection.id)
    }
  }
}
