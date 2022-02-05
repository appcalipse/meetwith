import { NextPage } from 'next'
import React from 'react'

import PublicCalendar from '../../components/public-calendar'
import { forceAuthenticationCheck } from '../../session/forceAuthenticationCheck'

const Schedule: NextPage = () => <PublicCalendar />

const EnhancedSchedule = forceAuthenticationCheck(Schedule)

export default EnhancedSchedule
