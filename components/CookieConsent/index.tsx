import { Button } from '@chakra-ui/button'
import { useColorModeValue } from '@chakra-ui/color-mode'
import { Box, Text } from '@chakra-ui/layout'
import React from 'react'
import { useCookies } from 'react-cookie'

interface Props {
  consentCookie: boolean
}
export const CookieConsent: React.FC<Props> = (props: Props) => {

  let cookie = props.consentCookie
  const [cookies, setCookie] = useCookies(['mww_consent'])
  if(!cookie) {
    cookie = cookies.mww_consent
  }

  const accepted = () => {
    setCookie('mww_consent', true, {
      path: '/',
      maxAge: 99999999999999, // Expires after 1hr
      sameSite: true,
    })
  }
  
  const textColor = useColorModeValue('gray.200', 'gray.500')

  const boxColor = useColorModeValue('gray.800', 'white')

  return cookie ? (
    <></>
  ) : (
    <Box position="fixed" bottom={8} width="100%">
      <Box
        display="flex"
        m={'auto'}
        alignItems="center"
        justifyContent="center"
      >
        <Box
          alignItems="center"
          justifyContent="center"
          display="flex"
          p={4}
          shadow="xl"
          flexDirection={{ base: 'column', md: 'row' }}
          bg={boxColor}
          borderRadius={8}
        >
          <Text color={textColor} mr={4}>
            We use cookies to improve your experience, for real. We won't do
            anything to harm your privacy :)
          </Text>
          <Button
            onClick={accepted}
            colorScheme="orange"
            mt={{ base: 4, md: 0 }}
          >
            ACCEPT COOKIES
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
