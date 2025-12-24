import { CheckCircleIcon } from '@chakra-ui/icons'
import {
  Box,
  CircularProgress,
  CircularProgressLabel,
  Collapse,
  HStack,
  Icon,
  Link,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { FC, useContext, useEffect, useState } from 'react'

import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingContext } from '@/providers/OnboardingProvider'
import { EditMode, SettingsSection } from '@/types/Dashboard'

const DashboardOnboardingGauge: FC = () => {
  const { currentAccount } = useContext(AccountContext)
  const onboardingContext = useContext(OnboardingContext)

  const [progress, setProgress] = useState(0)
  const [accountDetailsComplete, setAccountDetailsComplete] = useState(false)
  const [calendarsConnected, setCalendarsConnected] = useState(false)
  const [availabilitiesSet, setAvailabilitiesSet] = useState(false)
  const [onboardComplete, setOnboardComplete] = useState(true)

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
  const handleOnboardLoad = async () => {
    await Promise.all([
      defineAccountDetailsComplete(),
      defineCalendarsConnected(),
      defineAvailabilitiesSet(),
      defineProgress(),
      defineOnboardComplete(),
    ])
  }
  useEffect(() => {
    void handleOnboardLoad()
  }, [currentAccount, onboardingContext])

  const links = [
    {
      enabled: accountDetailsComplete,
      label: 'Add a display name',
      link: `/dashboard/settings/${SettingsSection.DETAILS}`,
    },
    {
      enabled: calendarsConnected,
      label: 'Connect a calendar',
      link: `/dashboard/settings/${SettingsSection.CONNECTED_CALENDARS}`,
    },
    {
      enabled: availabilitiesSet,
      label: 'Set availabilities',
      link: `/dashboard/${EditMode.AVAILABILITY}`,
    },
  ]

  const activeColor = useColorModeValue('primary.400', 'primary.200')
  const completeColor = useColorModeValue('neutral.400', 'neutral.400')
  const borderColor = useColorModeValue('neutral.100', 'neutral.700')

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
            <Text
              color={completeColor}
              style={{ textDecoration: 'line-through' }}
            >
              {label}
            </Text>
            <Icon as={CheckCircleIcon} color="green.500" />
          </>
        ) : (
          <Link as={NextLink} color={activeColor} href={link}>
            {label}
          </Link>
        )}
      </HStack>
    )
  }

  return (
    <Box width="100%">
      <Collapse
        in={onboardingContext.isLoaded && !onboardComplete}
        animateOpacity
      >
        <VStack
          border="1px solid"
          borderColor={borderColor}
          borderRadius={6}
          p={4}
          alignItems="flex-start"
        >
          <HStack mb={4}>
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
      </Collapse>
    </Box>
  )
}

export default DashboardOnboardingGauge
