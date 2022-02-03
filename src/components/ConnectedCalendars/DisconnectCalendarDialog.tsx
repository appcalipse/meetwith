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
import { useRef } from 'react'

interface DisconnectCalendarProps {
  isOpen: boolean
  onClose: () => void
}

const DisconnectCalendarDialog: React.FC<DisconnectCalendarProps> = ({
  isOpen,
  onClose,
}) => {
  const cancelRef = useRef(null)

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
            <Button colorScheme="red" onClick={onClose} ml={3}>
              Disconnect
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  )
}

export default DisconnectCalendarDialog
