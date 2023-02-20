import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  useColorModeValue,
} from '@chakra-ui/react'
import { useRef, useState } from 'react'

import { Account } from '../../types/Account'
import MeetingTypeConfig from './components/MeetingTypeConfig'

interface IProps {
  isDialogOpen: boolean
  cancelDialogRef: React.MutableRefObject<any>
  onDialogClose: () => void
  currentAccount: Account | null | undefined
}

const NewMeetingTypeDialog: React.FC<IProps> = ({
  isDialogOpen,
  cancelDialogRef,
  onDialogClose,
  currentAccount,
}) => {
  const [loading, setLoading] = useState<boolean>(false)

  const childRef = useRef(null)

  const createMeetingType = async () => {
    setLoading(true)
    await (childRef!.current as any).refSaveType()
    setLoading(false)
    onDialogClose()
  }

  return (
    <Box>
      <AlertDialog
        size="2xl"
        isOpen={isDialogOpen}
        leastDestructiveRef={cancelDialogRef}
        onClose={onDialogClose}
        blockScrollOnMount={false}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              New Meeting Type
            </AlertDialogHeader>

            <AlertDialogBody>
              <MeetingTypeConfig
                currentAccount={currentAccount}
                ref={childRef}
              />
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button
                color={useColorModeValue('gray.700', 'gray.300')}
                ref={cancelDialogRef}
                disabled={loading}
                onClick={onDialogClose}
              >
                Cancel
              </Button>
              <Button
                colorScheme="orangeButton"
                onClick={() => createMeetingType()}
                ml={3}
                isLoading={loading}
              >
                Create
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  )
}

export default NewMeetingTypeDialog
