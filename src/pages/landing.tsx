import { Box } from '@chakra-ui/react'

import { Faq } from '../components/landing/FAQ'
import { Features } from '../components/landing/Features'
import { Hero } from '../components/landing/Hero'
import { Plans } from '../components/landing/Plans'
import { Why } from '../components/landing/Why'

export default function Landing() {
  return (
    <>
      <Box
        bgImage={{
          base: `url('/assets/bg-hero-why-mobile.png')`,
          md: `url('/assets/bg-hero-why.png')`,
        }}
        bgRepeat="no-repeat"
        bgSize={{ base: 'auto', '2xl': 'cover' }}
      >
        <Hero />
        <Box display={{ base: 'none', md: 'unset' }}>
          <Why />
        </Box>
      </Box>
      <Box display={{ base: 'unset', md: 'none' }}>
        <Why />
      </Box>
      <Box
        bgImage={`url('/assets/bg-features-plans.png')`}
        bgRepeat="no-repeat"
        bgSize="cover"
        px={4}
      >
        <Features />
        <Plans />
      </Box>
      <Box px={4}>
        <Faq />
      </Box>
    </>
  )
}
