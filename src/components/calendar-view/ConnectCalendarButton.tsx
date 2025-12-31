import { Button } from '@chakra-ui/button'
import { useDisclosure } from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { type FC, useMemo } from 'react'

import ConnectCalendarModal from '../ConnectedCalendars/ConnectCalendarModal'

const ConnectCalendarButton: FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { asPath } = useRouter()
  const state = useMemo(
    () =>
      Buffer.from(
        JSON.stringify({
          redirectTo: asPath,
          ignoreState: true,
        })
      ).toString('base64'),
    [asPath]
  )
  return (
    <>
      <ConnectCalendarModal isOpen={isOpen} onClose={onClose} state={state} />
      <Button colorScheme="primary" mx="auto" w="100%" onClick={onOpen}>
        Connect new calendar
      </Button>
    </>
  )
}

export default ConnectCalendarButton
