import { Container } from '@chakra-ui/react'
import type { NextPage } from 'next'
import React from 'react'

import FAQ from '../components/landing/FAQ'
import Features from '../components/landing/Features'
import Hero from '../components/landing/Hero'
import Pricing from '../components/landing/Pricing'
import { forceAuthenticationCheck } from '../session/forceAuthenticationCheck'

const Home: NextPage = () => {
  return (
    <div>
      <main>
        <Container maxW="9xl">
          <Hero />

          <Features />

          <Pricing />

          <FAQ />
        </Container>
      </main>
    </div>
  )
}

export default forceAuthenticationCheck(Home)
