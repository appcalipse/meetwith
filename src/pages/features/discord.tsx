import {
  Box,
  Button,
  DarkMode,
  Flex,
  Heading,
  Icon,
  Image,
  LightMode,
  Link,
  ListItem,
  OrderedList,
  Text,
  VStack,
} from '@chakra-ui/react'
import type { NextPage } from 'next'
import React from 'react'
import { FaCalendarCheck, FaShieldAlt } from 'react-icons/fa'

import { MWW_DISCORD_SERVER } from '@/utils/constants'

const DiscordBot: NextPage = () => {
  return (
    <main>
      <Box
        bg={'neutral.900'}
        bgImage={{
          base: `none`,
          md: `url('/assets/bg-abstract.svg')`,
        }}
        bgRepeat="no-repeat"
        bgSize="cover"
      >
        <Box
          px={{ base: 2, md: 10 }}
          pt={{ base: '10', md: '20' }}
          color="neutral.100"
        >
          <VStack
            maxW="1360px"
            px={{ base: 4, md: 16 }}
            mx="auto"
            alignItems="flex-start"
          >
            <Heading fontSize={{ base: '3xl', md: '5xl' }} mt={12}>
              Save time scheduling with{' '}
              <Text as="span" color="primary.400">
                /meet
              </Text>{' '}
            </Heading>

            <LightMode>
              <Text fontSize="xl" mb={8} fontWeight="500">
                Empower your Discord community to schedule meetings with our
                Discord bot.
              </Text>
            </LightMode>
            <VStack alignItems={{ base: 'center', md: 'flex-start' }} w="100%">
              <LightMode>
                <Button
                  size="lg"
                  colorScheme="primary"
                  as="a"
                  href="https://discord.com/oauth2/authorize?client_id=1039594066486247465&permissions=380104607744&redirect_uri=https%3A%2F%2Fmeetwithwallet.xyz%2Fdashboard%2Fdetails%3FdiscordResult%3Dtrue&scope=bot"
                >
                  Install Meet with Wallet bot
                </Button>
              </LightMode>
              <Text textAlign="center">
                Please make sure you have the rights to add bots in your Discord
                server
              </Text>
            </VStack>

            <Box mt={8} p={8} bgColor="rgba(255,255,255,0.1)">
              <Flex
                direction={{ base: 'column', lg: 'row' }}
                gridGap={{ base: '1', md: '6' }}
              >
                <Box flex={1} mb={{ base: 4, md: 0 }}>
                  <Text fontSize="2xl" fontWeight="500" mb={2}>
                    Step-by-step instructions:
                  </Text>
                  <Text>
                    <OrderedList p={2} fontWeight="500" spacing={2}>
                      <ListItem>
                        Install the Meet with Wallet bot to your community (you
                        need admin rights on your Discord server to do it).
                      </ListItem>
                      <ListItem>
                        Go to Discord settings and give the bot access to the
                        channels you desire (in case some are restricted).
                      </ListItem>
                      <ListItem>
                        Invite your community members to create an account in{' '}
                        <Box textDecoration="underline" as="span">
                          meetwithwallet.xyz
                        </Box>{' '}
                        and connect their Calendar and Discord.
                      </ListItem>
                      <ListItem>
                        Now any member in the community can type /meet in a
                        Discord channel, select participants, and our tool
                        automatically finds the next available slot for all!
                      </ListItem>
                    </OrderedList>
                  </Text>
                </Box>
                <Box flex={1}>
                  <Image
                    src="/assets/discord.gif"
                    width="100%"
                    alt="Discord bot example"
                  />
                </Box>
              </Flex>
            </Box>

            <Box mt={8} w="100%">
              <Flex direction={{ base: 'column', lg: 'row' }} gridGap={6}>
                <Box flex={1} p={8} bgColor="rgba(255,255,255,0.1)">
                  <Icon as={FaShieldAlt} color="white" w={7} h={7} mb={2} />
                  <Text fontSize="2xl" fontWeight="500">
                    Our tool encrypts members&apos; data so their privacy is
                    fully protected.
                  </Text>
                </Box>
                <Box flex={1} p={8} bgColor="rgba(255,255,255,0.1)">
                  <Icon as={FaCalendarCheck} color="white" w={7} h={7} mb={2} />
                  <Text fontSize="2xl" fontWeight="500">
                    Save time. Empower your community members with lightning
                    scheduling.
                  </Text>
                </Box>
              </Flex>
            </Box>

            <VStack my={8} justifyContent="center" w="100%">
              <LightMode>
                <Button
                  size="lg"
                  colorScheme="primary"
                  as="a"
                  href="https://discord.com/oauth2/authorize?client_id=1039594066486247465&permissions=380104607744&redirect_uri=https%3A%2F%2Fmeetwithwallet.xyz%2Fdashboard%2Fdetails%3FdiscordResult%3Dtrue&scope=bot"
                >
                  Install Meet with Wallet bot
                </Button>
              </LightMode>
              <Text mt={2}>
                Need help?{' '}
                <Link isExternal href={MWW_DISCORD_SERVER}>
                  <a>Reach out to our Discord</a>
                </Link>{' '}
                or{' '}
                <Link isExternal href={'https://meetwithwallet.xyz/parsa'}>
                  <a>book some time</a>
                </Link>{' '}
                with the team
              </Text>
            </VStack>
          </VStack>
        </Box>
      </Box>
    </main>
  )
}

export default DiscordBot
