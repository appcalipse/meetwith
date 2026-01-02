import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Text,
} from '@chakra-ui/react'
import { useContext, useState } from 'react'

import { OnboardingContext } from '@/providers/OnboardingProvider'
import { addOrUpdateWebcal } from '@/utils/api_helper'
import QueryKeys from '@/utils/query_keys'
import { queryClient } from '@/utils/react_query'
import { useToastHelpers } from '@/utils/toasts'

interface WebCalDetailProps {
  payload?: {
    url: string
    username: string
    password: string
  }
  onSuccess: () => Promise<void>
  isQuickPoll?: boolean
  participantId?: string
  pollData?: any
}

const GENERIC_DISCLAIMER = (
  <Text>Your credentials will be encrypted and then stored.</Text>
)

const WebCalDetail: React.FC<WebCalDetailProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [url, setUrl] = useState('')

  const { showErrorToast, showSuccessToast } = useToastHelpers()
  const onboardingContext = useContext(OnboardingContext)

  const onSaveOrUpdate = async () => {
    try {
      setLoading(true)
      if (!url) {
        showErrorToast('Validation Error', 'Calendar URL is required.')
        return
      }
      await addOrUpdateWebcal(url)

      await queryClient.invalidateQueries(QueryKeys.connectedCalendars(false))
      onboardingContext.reload()

      !!onSuccess && (await onSuccess())
      showSuccessToast(
        'Calendar connected',
        "You've just connected a new calendar provider."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box w="100%">
      {GENERIC_DISCLAIMER}
      <FormControl pt={2} display={'block'}>
        <FormLabel>URL</FormLabel>
        <Input
          value={url}
          type="Calendar URL"
          placeholder="https://example.com/calendar.ics"
          onChange={event => setUrl(event.target.value)}
        />
      </FormControl>
      <Box
        style={{
          display: 'flex',
          alignItems: 'end',
          flexDirection: 'column',
        }}
      >
        <Button
          mt="10"
          isLoading={loading}
          isDisabled={loading || !url}
          colorScheme="primary"
          onClick={onSaveOrUpdate}
        >
          Connect
        </Button>
      </Box>
    </Box>
  )
}

export default WebCalDetail
