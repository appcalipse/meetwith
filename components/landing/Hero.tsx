import {
  Container,
  Stack,
  Flex,
  Box,
  Heading,
  Text,
  Button,
  Image,
  Icon,
  IconProps,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react'
import router from 'next/router'
import { useContext, useState } from 'react'
import { AccountContext } from '../../providers/AccountProvider'
import { logEvent } from '../../utils/analytics'
import { loginWithWallet } from '../../utils/user_manager'
import MWWButton from '../MWWButton'
import * as Sentry from '@sentry/browser'

export default function CallToActionWithVideo() {
  const { currentAccount, login, setLoginIn, loginIn } =
    useContext(AccountContext)

  const toast = useToast()

  const handleLogin = async () => {
    setLoginIn(true)
    if (!currentAccount) {
      logEvent('Clicked on get started')
      try {
        const account = await loginWithWallet()
        if (!account) {
          setLoginIn(false)
          return
        }
        await login(account)
        logEvent('Signed in')

        await router.push('/dashboard')
      } catch (error: any) {
        Sentry.captureException(error)
        toast({
          title: 'Error',
          description: error.message || error,
          status: 'error',
          duration: 7000,
          position: 'top',
          isClosable: true,
        })
        logEvent('Failed to sign in', error)
      }
    }
    setLoginIn(false)
  }

  return (
    <Container maxW={'7xl'}>
      <Stack
        align={'center'}
        spacing={{ base: 8, md: 10 }}
        py={{ base: 16, md: 28 }}
        direction={{ base: 'column', md: 'row' }}
      >
        <Stack flex={1} spacing={{ base: 5, md: 10 }}>
          <Heading
            lineHeight={1.1}
            fontWeight={600}
            fontSize={{ base: '4xl', sm: '4xl', lg: '6xl' }}
          >
            <Text
              as={'span'}
              position={'relative'}
              _after={{
                content: "''",
                width: 'full',
                height: '30%',
                position: 'absolute',
                bottom: 1,
                left: 0,
                bg: 'orange.400',
                zIndex: -1,
              }}
            >
              Meeting scheduler,
            </Text>
            <br />
            <Text
              bgGradient={useColorModeValue(
                'linear(to-r,orange.400 25%, yellow.300)',
                'linear(to-r,orange.300 25%, yellow.500)'
              )}
              bgClip="text"
              fontSize="6xl"
              fontWeight="extrabold"
            >
              for web3
            </Text>
          </Heading>
          <Text color={useColorModeValue('gray.500', 'gray.300')}>
            <strong>Meet with Wallet</strong> provides an easy way to share your
            (or your <strong>DAO's</strong>) calendar and schedule meetings
            without any hassle or back-and-forth communication. All possible by
            simply connecting your crypto wallet. No registration needed, no
            more emails (only if you want to) - Own your private data! You know{' '}
            <b>Calendly</b> right? Same thing here, but for{' '}
            <strong>web3</strong>!
          </Text>
          <Stack
            spacing={{ base: 4, sm: 6 }}
            direction={{ base: 'column', sm: 'row' }}
          >
            <MWWButton
              rounded={'full'}
              size={'lg'}
              fontWeight={'normal'}
              px={6}
              isLoading={loginIn}
              onClick={handleLogin}
            >
              Get started
            </MWWButton>
            <Button
              as="a"
              href="#pricing"
              rounded={'full'}
              size={'lg'}
              color={useColorModeValue('gray.500', 'gray.400')}
              fontWeight={'normal'}
              px={6}
            >
              Pricing
            </Button>
          </Stack>
        </Stack>
        <Flex
          flex={1}
          justify={'center'}
          align={'center'}
          position={'relative'}
          w={'full'}
        >
          <Blob
            w={'150%'}
            h={'150%'}
            position={'absolute'}
            top={{ base: '-15%', md: '-20%' }}
            left={0}
            zIndex={-1}
            color={useColorModeValue('orange.50', 'orange.400')}
          />
          <Box
            position={'relative'}
            width={'full'}
            maxW="600px"
            mt={{ base: 8, md: 0 }}
            overflow={'hidden'}
          >
            <Image
              alt={'Hero Image'}
              align={'center'}
              w={'100%'}
              h={'auto'}
              src={'/assets/calendar.png'}
            />
          </Box>
        </Flex>
      </Stack>
    </Container>
  )
}

export const Blob = (props: IconProps) => {
  return (
    <Icon
      width={'100%'}
      viewBox="0 0 578 440"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M239.184 439.443c-55.13-5.419-110.241-21.365-151.074-58.767C42.307 338.722-7.478 282.729.938 221.217c8.433-61.644 78.896-91.048 126.871-130.712 34.337-28.388 70.198-51.348 112.004-66.78C282.34 8.024 325.382-3.369 370.518.904c54.019 5.115 112.774 10.886 150.881 49.482 39.916 40.427 49.421 100.753 53.385 157.402 4.13 59.015 11.255 128.44-30.444 170.44-41.383 41.683-111.6 19.106-169.213 30.663-46.68 9.364-88.56 35.21-135.943 30.551z"
        fill="currentColor"
      />
    </Icon>
  )
}
