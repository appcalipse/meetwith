import { CheckCircleIcon } from '@chakra-ui/icons'
import {
  CircularProgress,
  CircularProgressLabel,
  HStack,
  Icon,
  Link,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { FC, useContext, useEffect, useState } from 'react'

import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingContext } from '@/providers/OnboardingProvider'

const DashboardOnboardingGauge: FC = () => {
  const { currentAccount } = useContext(AccountContext)
  const onboardingContext = useContext(OnboardingContext)

  const [progress, setProgress] = useState(0)
  const [accountDetailsComplete, setAccountDetailsComplete] = useState(false)
  const [calendarsConnected, setCalendarsConnected] = useState(false)
  const [availabilitiesSet, setAvailabilitiesSet] = useState(false)
  const [onboardComplete, setOnboardComplete] = useState(false)

  async function defineProgress() {
    const completeSteps = (await onboardingContext.completeSteps()) ?? 0
    const progressStep = 100 / 3
    setProgress(Math.round(completeSteps * progressStep))
  }

  async function defineAccountDetailsComplete() {
    setAccountDetailsComplete(await onboardingContext.accountDetailsComplete())
  }

  async function defineCalendarsConnected() {
    setCalendarsConnected(await onboardingContext.connectedCalendarsComplete())
  }

  async function defineAvailabilitiesSet() {
    setAvailabilitiesSet(await onboardingContext.availabilitiesComplete())
  }

  async function defineOnboardComplete() {
    setOnboardComplete(await onboardingContext.onboardingComplete())
  }

  useEffect(() => {
    defineAccountDetailsComplete()
    defineCalendarsConnected()
    defineAvailabilitiesSet()
    defineProgress()
    defineOnboardComplete()
  }, [currentAccount])

  const links = [
    {
      enabled: accountDetailsComplete,
      label: 'Account Details',
      link: '/dashboard/details',
    },
    {
      enabled: calendarsConnected,
      label: 'Connect Calendars',
      link: '/dashboard/calendars',
    },
    {
      enabled: availabilitiesSet,
      label: 'Set Availabilities',
      link: '/dashboard/availability',
    },
  ]

  function StepLink({
    enabled,
    label,
    link,
  }: {
    enabled: boolean
    label: string
    link: string
  }) {
    return (
      <HStack alignItems="center" width="100%">
        {enabled ? (
          <>
            <Text color="neutral.600">{label}</Text>
            <Icon as={CheckCircleIcon} color="#34c759" />
          </>
        ) : (
          <Link as={NextLink} color="primary.200" href={link}>
            {label}
          </Link>
        )}
      </HStack>
    )
  }

  return onboardingContext.isLoading() ? (
    <VStack
      border="1px solid"
      borderColor="neutral.600"
      borderRadius={6}
      width="100%"
      height={36}
      p={4}
      alignItems="center"
      justifyContent="center"
    >
      <Spinner color="primary.400" />
    </VStack>
  ) : onboardComplete ? null : (
    <VStack
      border="1px solid"
      borderColor="neutral.600"
      borderRadius={6}
      width="100%"
      p={4}
      alignItems="flex-start"
    >
      <HStack>
        <CircularProgress value={progress} color="primary.400">
          <CircularProgressLabel>{progress}%</CircularProgressLabel>
        </CircularProgress>
        <VStack alignItems="flex-start">
          <Text>Almost there!</Text>
          <Text>Complete your profile</Text>
        </VStack>
      </HStack>
      <VStack width="100%">
        {links.map(link => (
          <StepLink
            key={link.label}
            enabled={link.enabled}
            label={link.label}
            link={link.link}
          />
        ))}
      </VStack>
    </VStack>
  )
}

export default DashboardOnboardingGauge
