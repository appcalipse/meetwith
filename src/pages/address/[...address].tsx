import { NextPage } from 'next'
import React from 'react'

import Footer from '../../components/Footer'
import { Navbar } from '../../components/Navbar'
import PublicCalendar from '../../components/public-calendar'
import { forceAuthenticationCheck } from '../../session/forceAuthenticationCheck'

const Schedule: NextPage = () => (
  <>
    <Navbar />
    <PublicCalendar />
    <Footer />
  </>
)

const EnhancedSchedule = forceAuthenticationCheck(Schedule)

export default EnhancedSchedule
