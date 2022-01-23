import type { NextPage } from 'next'
import React from 'react'
import Hero from '../components/landing/Hero'
import Features from '../components/landing/Features'
import Pricing from '../components/landing/Pricing'
import FAQ from '../components/landing/FAQ'
import { Container } from '@chakra-ui/react'
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
