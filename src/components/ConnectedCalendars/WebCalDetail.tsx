import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useContext, useRef, useState } from 'react'
import { RiFileUploadLine } from 'react-icons/ri'
import { OnboardingContext } from '@/providers/OnboardingProvider'
import { QuickPollBySlugResponse } from '@/types/QuickPoll'
import { addOrUpdateWebcal } from '@/utils/api_helper'
import QueryKeys from '@/utils/query_keys'
import { queryClient } from '@/utils/react_query'
import { useToastHelpers } from '@/utils/toasts'
import { isValidUrl } from '@/utils/validations'
import InfoTooltip from '../profile/components/Tooltip'

interface WebCalDetailProps {
  payload?: {
    url: string
    username: string
    password: string
  }
  onSuccess: () => Promise<void>
  isQuickPoll?: boolean
  participantId?: string
  pollData?: QuickPollBySlugResponse
}

const WebCalDetail: React.FC<WebCalDetailProps> = ({
  onSuccess,
  isQuickPoll,
  participantId,
}) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [icsFile, setIcsFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { showErrorToast, showSuccessToast } = useToastHelpers()
  const onboardingContext = useContext(OnboardingContext)

  const onSaveOrUpdate = async () => {
    try {
      setLoading(true)
      if (!icsFile || !title || (!icsFile && !isValidUrl(url))) {
        showErrorToast('Validation Error', 'Calendar Resource is required.')
        return
      }
      const formdata = new FormData()
      formdata.append('title', title)
      if (icsFile) {
        formdata.append('resource', icsFile)
      } else {
        formdata.append('url', url)
      }
      if (isQuickPoll && participantId) {
      } else {
        await addOrUpdateWebcal(formdata)
      }

      await queryClient.invalidateQueries(QueryKeys.connectedCalendars(false))
      onboardingContext.reload()

      !!onSuccess && (await onSuccess())
      showSuccessToast(
        'Calendar connected',
        "You've just connected a new calendar provider."
      )
    } catch (_: unknown) {
      showErrorToast(
        'Something went wrong',
        'An error occurred while connecting the calendar.'
      )
    } finally {
      setLoading(false)
    }
  }
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIcsFile(file)
    setUrl(file.name)
  }

  const handleSelectFile = () => {
    fileInputRef.current?.click()
  }
  return (
    <VStack gap={5} w="100%">
      <FormControl display={'block'}>
        <FormLabel>Calendar title</FormLabel>
        <input
          ref={fileInputRef}
          type="file"
          accept=".ics,text/calendar"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <Input
          value={title}
          type="text"
          placeholder="Enter calendar title"
          onChange={event => setTitle(event.target.value)}
        />
      </FormControl>
      <FormControl display={'block'}>
        <FormLabel
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
        >
          ICS Resource{' '}
          <Box mb={-1}>
            <InfoTooltip text="Use your ICS file/link to connect your calendar to Meetwith." />
          </Box>
        </FormLabel>
        <InputGroup>
          <Input
            value={url}
            type="text"
            placeholder="Enter ICS Link or Upload ICS file"
            onChange={event => setUrl(event.target.value)}
          />
          <InputRightElement onClick={handleSelectFile} cursor="pointer">
            <RiFileUploadLine />
          </InputRightElement>
        </InputGroup>
      </FormControl>
      <Box w="100%">
        <Button
          isLoading={loading}
          isDisabled={loading || (!url && !icsFile) || !title}
          colorScheme="primary"
          onClick={onSaveOrUpdate}
          w="100%"
        >
          Save calendar
        </Button>
      </Box>
    </VStack>
  )
}

export default WebCalDetail
