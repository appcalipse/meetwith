import type { NextPage } from 'next'
import React from 'react'
import Hero from '../components/landing/Hero'
import Features from '../components/landing/Features'
import Pricing from '../components/landing/Pricing'
import FAQ from '../components/landing/FAQ'
import { Container } from '@chakra-ui/react'

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

export default Home
