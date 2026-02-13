import {
  Button,
  Flex,
  Heading,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from '@chakra-ui/react'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { FaPlus } from 'react-icons/fa'
import { LuCalendarCheck2 } from 'react-icons/lu'
import { MdOutlineCalendarMonth } from 'react-icons/md'

import { Account } from '@/types/Account'

import CalendarView from '../calendar-view'
import MeetingBase from '../meeting/Base'

const NavigationTab = () => (
  <TabList
    w={{ base: '100%', md: 'auto' }}
    bg="tab-bg"
    p={1}
    borderWidth={1}
    rounded={6}
  >
    <Tab
      alignItems="center"
      gap={1}
      _selected={{
        bg: 'tab-button-bg',
      }}
      flex={{ base: 1, md: 'auto' }}
    >
      <MdOutlineCalendarMonth size={24} />
      My Calendar
    </Tab>
    <Tab
      flex={{ base: 1, md: 'auto' }}
      alignItems="center"
      gap={1}
      _selected={{
        bg: 'tab-button-bg',
      }}
    >
      <LuCalendarCheck2 size={24} />
      My meetings
    </Tab>
  </TabList>
)
const Meetings: React.FC<{ currentAccount: Account }> = ({
  currentAccount,
}) => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const [currentTab, setCurrentTab] = useState(1)
  const { push } = useRouter()

  return (
    <Tabs
      w="100%"
      variant="unstyled"
      colorScheme="primary"
      index={currentTab}
      onChange={index => setCurrentTab(index)}
    >
      <Flex direction={'column'} w="100%">
        <Flex
          flexDir={{
            base: 'column',
            md: 'row',
          }}
          justifyContent="space-between"
          alignItems="flex-start"
          mb={4}
          gap={{
            base: 4,
            md: 0,
          }}
        >
          <Heading fontSize="2xl">
            My Meetings
            <Text fontSize="sm" fontWeight={100} mt={1}>
              Timezone: {timezone}
            </Text>
          </Heading>
          <NavigationTab />
          <Button
            onClick={() => push(`/dashboard/schedule`)}
            colorScheme="primary"
            mt={{ base: 4, md: 0 }}
            mb={{ base: 4, md: 0 }}
            leftIcon={<FaPlus />}
            width={{ base: '100%', md: 'auto' }}
          >
            New meeting
          </Button>
        </Flex>
        <TabPanels>
          <TabPanel p={0}>
            <CalendarView />
          </TabPanel>
          <TabPanel p={0}>
            <MeetingBase currentAccount={currentAccount} />
          </TabPanel>
        </TabPanels>
      </Flex>
    </Tabs>
  )
}

export default Meetings
