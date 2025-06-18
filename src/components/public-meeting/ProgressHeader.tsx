import { Box, HStack } from '@chakra-ui/react'
import { PublicScheduleContext } from '@components/public-meeting/index'
import ProgressHeaderItem from '@components/public-meeting/ProgressHeaderItem'
import { PublicSchedulingSteps } from '@utils/constants/meeting-types'
import React, { useContext } from 'react'
const items = [
  {
    label: 'Pay for Session',
    activeSteps: [
      PublicSchedulingSteps.PAY_FOR_SESSION,
      PublicSchedulingSteps.BOOK_SESSION,
    ],
  },
  {
    label: 'Schedule with Host',
    activeSteps: [PublicSchedulingSteps.BOOK_SESSION],
  },
]
const ProgressHeader = () => {
  const { currentStep } = useContext(PublicScheduleContext)

  return (
    <HStack w={'100%'} gap={0} alignItems="center">
      {items.map((item, index) => (
        <>
          <ProgressHeaderItem
            key={item.label}
            currentStep={currentStep}
            {...item}
          />
          {index < items.length - 1 && (
            <Box flex={0.6} borderBottomWidth={3} borderStyle="dotted" />
          )}
        </>
      ))}
    </HStack>
  )
}

export default ProgressHeader
