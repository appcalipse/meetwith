import {
  Button,
  Heading,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
} from '@chakra-ui/react'
import React, { FC, useContext } from 'react'

import Loading from '@/components/Loading'
import ScheduleGroup from '@/components/schedule/ScheduleGroup'
import { ScheduleContext } from '@/pages/dashboard/schedule'
import { EditMode } from '@/types/Dashboard'

interface IScheduleGroupModal {
  onClose: () => void
  isOpen: boolean
}

const ScheduleGroupModal: FC<IScheduleGroupModal> = props => {
  const { groups, isGroupPrefetching } = useContext(ScheduleContext)
  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      blockScrollOnMount={false}
      size={'lg'}
      isCentered
    >
      <ModalOverlay />
      <ModalContent
        p="6"
        bgColor="#2F3847"
        maxW={{ base: '90%', md: '480px' }}
        maxH="80%"
        overflowY="scroll"
        className="no-scrollbar"
      >
        <ModalHeader
          p={'0'}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Heading size={'lg'}>Scheduling Groups</Heading>
          <ModalCloseButton />
        </ModalHeader>
        <ModalBody p={'0'} mt={'6'}>
          <VStack w={'100%'}>
            <VStack w={'100%'} gap={0}>
              {isGroupPrefetching ? (
                <Loading />
              ) : groups.length > 0 ? (
                groups.map(group => <ScheduleGroup {...group} key={group.id} />)
              ) : (
                <Text>
                  You are not in any Groups currently. To create Groups, click
                  <Link
                    fontWeight={'700'}
                    color="inherit"
                    href={`/dashboard/${EditMode.GROUPS}`}
                    textDecoration="underline"
                    textUnderlineOffset={4}
                  >
                    {' '}
                    here
                  </Link>
                  .{' '}
                </Text>
              )}
            </VStack>
            <Button
              colorScheme="primary"
              onClick={props.onClose}
              ml={'auto'}
              right={0}
              px={6}
              mt={4}
            >
              Ok
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default ScheduleGroupModal
