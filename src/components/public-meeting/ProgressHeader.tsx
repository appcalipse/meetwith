import { Box, HStack } from '@chakra-ui/react'
import { PublicScheduleContext } from '@components/public-meeting/index'
import ProgressHeaderItem from '@components/public-meeting/ProgressHeaderItem'
import { PublicSchedulingSteps } from '@utils/constants/meeting-types'
import React, { Fragment, useContext } from 'react'

const _items = [
  {
    label: 'Pick a slot ',
    activeSteps: [
      PublicSchedulingSteps.BOOK_SESSION,
      PublicSchedulingSteps.PAY_FOR_SESSION,
    ],
  },
  {
    label: 'Pay and Complete Scheduling',
    activeSteps: [PublicSchedulingSteps.PAY_FOR_SESSION],
  },
]
const ProgressHeader = () => {
  const { currentStep } = useContext(PublicScheduleContext)

  return <HStack w={'100%'} gap={0} alignItems="center"></HStack>
}

export default ProgressHeader
