import { Container } from '@chakra-ui/react'
import type { NextPage } from 'next'
import React from 'react'

import FAQ from '../components/landing_old/FAQ'
import Features from '../components/landing_old/Features'
import Hero from '../components/landing_old/Hero'
import Pricing from '../components/landing_old/Pricing'
import { forceAuthenticationCheck } from '../session/forceAuthenticationCheck'

const Home: NextPage = () => {
  return (
    <main data-testid="main-container">
      <Container maxW="9xl">
        <Hero />
        <Features />
        <Pricing />
        <FAQ />
      </Container>
    </main>
  )
}

export default forceAuthenticationCheck(Home)
