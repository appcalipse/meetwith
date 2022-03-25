import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  FormControl,
  HStack,
  Input,
  Select,
  Text,
} from '@chakra-ui/react'
import { useState } from 'react'
import { v4 } from 'uuid'

import { Account } from '../../types/Account'
import { saveAccountChanges } from '../../utils/api_helper'
import { getSlugFromText } from '../../utils/generic_utils'

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
  const [title, setTitle] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState<boolean>(false)
  const [duration, setDuration] = useState<number>(30)
  const [minAdvanceTime, setMinAdvanceTime] = useState<any>({
    offset: '1',
    amount: 30,
  })

  const createMeetingType = async () => {
    setLoading(true)
    const minAdvanceMinutes =
      Number(minAdvanceTime.offset) * minAdvanceTime.amount
    currentAccount?.preferences?.availableTypes.push({
      id: v4(),
      title: title as string,
      url: getSlugFromText(title as string),
      duration: duration,
      minAdvanceTime: minAdvanceMinutes,
    })
    const updatedAccount = await saveAccountChanges(currentAccount as Account)
    onDialogClose()
  }

  return (
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
            <FormControl>
              <Text pt={2}>Title</Text>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                type="text"
                placeholder="Title"
              />
            </FormControl>
            <FormControl pt={5}>
              <Text>Meeting Duration</Text>
              <Select
                width="160px"
                defaultValue={duration}
                onChange={e => setDuration(Number(e.target.value))}
              >
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
              </Select>
            </FormControl>
            <FormControl pt={5}>
              <Text>Minimum Notice Time</Text>
              <HStack>
                <Input
                  width="140px"
                  type="number"
                  value={minAdvanceTime.amount}
                  onChange={e => {
                    setMinAdvanceTime({
                      amount: Number(e.target.value),
                      offset: minAdvanceTime.type,
                    })
                  }}
                />
                <Select
                  width="160px"
                  defaultValue={minAdvanceTime.type}
                  onChange={e => {
                    setMinAdvanceTime({
                      amount: minAdvanceTime.amount,
                      offset: e.target.value,
                    })
                  }}
                >
                  <option value="1">minutes</option>
                  <option value="60">hours</option>
                  <option value="1440">days</option>
                </Select>
              </HStack>
            </FormControl>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button
              color="black"
              ref={cancelDialogRef}
              disabled={loading}
              onClick={onDialogClose}
            >
              Cancel
            </Button>
            <Button
              colorScheme="orange"
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
  )
}

export default NewMeetingTypeDialog
