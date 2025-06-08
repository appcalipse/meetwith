import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  useColorModeValue,
} from '@chakra-ui/react'
import { useRef, useState } from 'react'

import QueryKeys from '@/utils/query_keys'
import { queryClient } from '@/utils/react_query'

interface DisconnectCalendarProps {
  isOpen: boolean
  onClose: () => void
  onDelete: () => Promise<void>
}

const DisconnectCalendarDialog: React.FC<DisconnectCalendarProps> = ({
  isOpen,
  onClose,
  onDelete,
}) => {
  const cancelRef = useRef(null)
  const [busy, setBusy] = useState(false)

  const onDeleteWrapper = async () => {
    setBusy(true)
    await queryClient.invalidateQueries(QueryKeys.connectedCalendars())
    await onDelete()
    setBusy(false)
    onClose()
  }

  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
      blockScrollOnMount={false}
      size="xl"
      isCentered
    >
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Remove calendar connection
          </AlertDialogHeader>

          <AlertDialogBody>
            Are you sure you want to remove this connection?
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button
              color={useColorModeValue('gray.700', 'gray.300')}
              ref={cancelRef}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={onDeleteWrapper}
              ml={3}
              isLoading={busy}
            >
              Disconnect
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  )
}

export default DisconnectCalendarDialog
