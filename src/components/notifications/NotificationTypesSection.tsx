import {
  Box,
  Checkbox,
  Heading,
  HStack,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'

type NotificationTypesSectionProps = {
  hasEmail: boolean
  isLoading: boolean
  isError: boolean
  segments:
    | {
        productUpdates: boolean
        tipsAndEducation: boolean
        researchAndFeedbackRequests: boolean
      }
    | undefined
  productUpdates: boolean
  tipsAndEducation: boolean
  researchAndFeedback: boolean
  onProductUpdatesChange: (value: boolean) => void
  onTipsAndEducationChange: (value: boolean) => void
  onResearchAndFeedbackChange: (value: boolean) => void
}

const NotificationTypesSection: React.FC<NotificationTypesSectionProps> = ({
  hasEmail,
  isLoading,
  isError,
  segments,
  productUpdates,
  tipsAndEducation,
  researchAndFeedback,
  onProductUpdatesChange,
  onTipsAndEducationChange,
  onResearchAndFeedbackChange,
}) => {
  if (!hasEmail) {
    return (
      <Box>
        <Heading fontSize="2xl" mb={6}>
          Notification types
        </Heading>
        <Text>
          Add an email in the section above to manage notification types.
        </Text>
      </Box>
    )
  }
  if (isLoading) {
    return (
      <Box>
        <Heading fontSize="2xl" mb={6}>
          Notification types
        </Heading>
        <HStack>
          <Spinner size="sm" />
          <Text>Loading notification types…</Text>
        </HStack>
      </Box>
    )
  }
  if (isError) {
    return (
      <Box>
        <Heading fontSize="2xl" mb={6}>
          Notification types
        </Heading>
        <Text color="text-secondary">
          There was an error loading your notification preferences. Please try
          again.
        </Text>
      </Box>
    )
  }
  if (!segments) return null

  return (
    <Box>
      <Heading fontSize="2xl" mb={6}>
        Notification types
      </Heading>
      <VStack align="stretch" spacing={6}>
        <Checkbox
          colorScheme="primary"
          isChecked={productUpdates}
          onChange={e => onProductUpdatesChange(e.target.checked)}
        >
          Product updates and announcements
        </Checkbox>
        <Checkbox
          colorScheme="primary"
          isChecked={tipsAndEducation}
          onChange={e => onTipsAndEducationChange(e.target.checked)}
        >
          Tips and educational content
        </Checkbox>
        <Checkbox
          colorScheme="primary"
          isChecked={researchAndFeedback}
          onChange={e => onResearchAndFeedbackChange(e.target.checked)}
        >
          Research and feedback requests
        </Checkbox>
      </VStack>
    </Box>
  )
}

export default NotificationTypesSection
