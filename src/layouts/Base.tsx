import React from 'react'

import Footer from '../components/Footer'
import { Navbar } from '../components/Navbar'

export const BaseLayout: React.FC = ({ children }) => {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  )
}
