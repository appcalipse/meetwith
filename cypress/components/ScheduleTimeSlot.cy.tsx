/// <reference types="cypress" />

import { add } from 'date-fns'
import React from 'react'

import { ScheduleTimeSlot } from '@/components/schedule/schedule-time-discover/ScheduleTimeSlot'

describe('<ScheduleTimeSlot />', () => {
  it('renders', () => {
    // see: https://on.cypress.io/mounting-react
    cy.mount(
      <ScheduleTimeSlot
        availabilities={[]}
        busySlots={[]}
        date={new Date()}
        meetingMembers={[]}
        pickedTime={null}
        slot={{
          start: new Date(),
          end: add(new Date(), { minutes: 30 }),
        }}
        timezone={Intl.DateTimeFormat().resolvedOptions().timeZone}
        handleTimePick={() => {}}
      />
    )
  })
})
