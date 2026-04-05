import { Box } from '@chakra-ui/react'
import { useEffect, useRef } from 'react'

function ImageShowcase() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = true
    video.play().catch(() => {
      // autoplay blocked by browser policy — poster image remains visible
    })
  }, [videoRef])

  return (
    <Box
      as="section"
      w="100%"
      overflow="hidden"
      px={{ base: 4, md: 8, lg: '131px' }}
      pt={2}
    >
      <Box
        w="100%"
        maxW="1152px"
        mx="auto"
        rounded="lg"
        overflow="hidden"
        borderWidth={1}
        borderColor="neutral.700"
      >
        <video
          ref={videoRef}
          src="/assets/group-demo.mp4"
          poster="/assets/product-ui.webp"
          autoPlay
          loop
          playsInline
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </Box>
    </Box>
  )
}

export default ImageShowcase
