import {
  Accordion,
  Button,
  Divider,
  FormControl,
  FormHelperText,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import React, { Fragment, useContext } from 'react'

import Loading from '@/components/Loading'
import useAccountContext from '@/hooks/useAccountContext'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'
import { useParticipants } from '@/providers/schedule/ParticipantsContext'

import ContactsCard from './ContactsCard'

interface AddFromContactProps {
  isQuickPoll?: boolean
  onRequestSignIn?: () => void
}

const AddFromContact: React.FC<AddFromContactProps> = ({
  isQuickPoll = false,
  onRequestSignIn,
}) => {
  const currentAccount = useAccountContext()
  const router = useRouter()
  const { openConnection } = useContext(OnboardingModalContext)
  const { contacts, isContactsPrefetching } = useParticipants()

  const handleSignIn = () => {
    onRequestSignIn?.()
    openConnection(router.asPath, true)
  }

  if (isContactsPrefetching) {
    return (
      <VStack mb={6} w="100%" justifyContent="center">
        <Loading />
      </VStack>
    )
  }

  // Show sign-in button for non-authenticated users in quickpoll context
  if (isQuickPoll && !currentAccount) {
    return (
      <Fragment>
        <Divider my={6} borderColor="neutral.400" />
        <FormControl gap={0}>
          <Text>Add from Contact list</Text>
          <Button mt={2} colorScheme="primary" w="100%" onClick={handleSignIn}>
            Sign in to see contacts
          </Button>
          <FormHelperText fontSize="12px" color="neutral.400" mt={2}>
            Sign in to access your contact list
          </FormHelperText>
        </FormControl>
      </Fragment>
    )
  }

  return (
    <Fragment>
      <Divider my={6} borderColor="neutral.400" />
      <FormControl gap={0}>
        <Text>Add from Contact list</Text>
        <Accordion gap={0} w="100%" allowToggle>
          <ContactsCard currentAccount={currentAccount} contacts={contacts} />
        </Accordion>
        <FormHelperText fontSize="12px" color="neutral.400" mt={-2}>
          Select members from your contact list
        </FormHelperText>
      </FormControl>
    </Fragment>
  )
}

export default AddFromContact
