import {
  Accordion,
  FormControl,
  FormHelperText,
  Text,
  VStack,
} from '@chakra-ui/react'
import React from 'react'

import Loading from '@/components/Loading'
import useAccountContext from '@/hooks/useAccountContext'
import { useParticipants } from '@/providers/schedule/ParticipantsContext'

import ContactsCard from './ContactsCard'

const AddFromContact = () => {
  const currentAccount = useAccountContext()
  const { contacts, isContactsPrefetching } = useParticipants()
  return isContactsPrefetching ? (
    <VStack mb={6} w="100%" justifyContent="center">
      <Loading />
    </VStack>
  ) : (
    <FormControl gap={0}>
      <Text>Add from Contact list</Text>
      <Accordion gap={0} w="100%" allowToggle>
        <ContactsCard currentAccount={currentAccount} contacts={contacts} />
      </Accordion>
      <FormHelperText fontSize="12px" color="neutral.400" mt={-2}>
        Select members from your contact list
      </FormHelperText>
    </FormControl>
  )
}

export default AddFromContact
