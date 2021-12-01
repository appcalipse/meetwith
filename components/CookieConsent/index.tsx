import { Button } from '@chakra-ui/button';
import { useColorModeValue } from '@chakra-ui/color-mode';
import { Box, Text } from '@chakra-ui/layout';
import React from 'react';
import { useCookies } from 'react-cookie';

export const CookieConsent: React.FC = () => {
  const [cookies, setCookie] = useCookies(['mww_consent']);

  const accepted = () => {
    setCookie('mww_consent', true, {
      path: '/',
      maxAge: 99999999999999, // Expires after 1hr
      sameSite: true,
    });
  };

  const textColor = useColorModeValue('gray.200', 'gray.500')

  const boxColor = useColorModeValue('gray.800', 'white')

  return cookies.mww_consent ? (
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
          bg={boxColor}
          borderRadius={8}
        >
          <Text color={textColor} mr={4}>
            We use cookies to improve your experience, for real. We won't do
            anything to harm your privacy :)
          </Text>
          <Button onClick={accepted} colorScheme="orange">
            ACCEPT COOKIES
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
