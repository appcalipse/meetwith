import { Container } from '@chakra-ui/react'
import type { NextPage } from 'next'
import React from 'react'

import Footer from '../components/Footer'
import FAQ from '../components/landing/FAQ'
import Features from '../components/landing/Features'
import Hero from '../components/landing/Hero'
import Pricing from '../components/landing/Pricing'
import { Navbar } from '../components/Navbar'
import { forceAuthenticationCheck } from '../session/forceAuthenticationCheck'

const Home: NextPage = () => {
  return (
    <>
      <Navbar />
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
      <Footer />
    </>
  )
}

export default forceAuthenticationCheck(Home)
