import React from 'react'
import PropTypes from 'prop-types'
import dateFns from 'date-fns'

import generateTimeSlots from './generate-time-slots'

import { List, ListItem } from './List'

function Root({ pickedDay, slotSizeMinutes, validator, pickTime }) {
  const timeSlots = generateTimeSlots(pickedDay, slotSizeMinutes)
  const filtered = timeSlots.filter(slot => {
    return validator ? validator(slot) : true
  })
  return (
    <List>
      {filtered.map(slot => {
        return (
          <ListItem key={slot} isValid onClick={() => pickTime(slot)}>
            {dateFns.format(slot, 'HH:mm')}
          </ListItem>
        )
      })}
    </List>
  )
}

Root.propTypes = {
  pickedDay: PropTypes.instanceOf(Date),
  slotSizeMinutes: PropTypes.number.isRequired,
  validator: PropTypes.func,
  pickTime: PropTypes.func.isRequired,
}

export default Root
