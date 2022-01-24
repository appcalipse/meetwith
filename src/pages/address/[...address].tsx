import React from 'react'

import { forceAuthenticationCheck } from '../../session/forceAuthenticationCheck'
import { NextPage } from 'next'
import PublicCalendar from '../../components/public-calendar'

const Schedule: NextPage = () => <PublicCalendar />

const EnhancedSchedule = forceAuthenticationCheck(Schedule)

export default EnhancedSchedule
