import {
  Box,
  Button,
  Flex,
  Heading,
  Icon,
  SlideFade,
  Text,
  VStack,
} from '@chakra-ui/react'
import { BsArrowRight, BsBell, BsShieldShaded } from 'react-icons/bs'
import { FaRegCalendarCheck, FaRegHandshake } from 'react-icons/fa'
import { useInView } from 'react-intersection-observer'

export function Why() {
  const { ref: whyContainer, inView: isWhyContainerVisible } = useInView()

  return (
    <Box
      background="linear-gradient(359.95deg, rgba(31, 41, 51, 0.85) 0.04%, rgba(50, 63, 75, 0.85) 57.61%);"
      px={{ base: 2, md: 10 }}
      py={{ base: '10', md: '20' }}
      height="100%"
    >
      <Flex
        ref={whyContainer}
        px={{ base: 2, lg: 40 }}
        gap={{ base: '1', lg: '6' }}
        maxW="1360px"
        //minH={{base: "unset", md: "960px", xl: "unset"}}
        mx="auto"
        direction={{ base: 'column', lg: 'row' }}
      >
        <Flex direction="column" gap={{ base: '1', lg: '6' }}>
          <Text
            color="neutral.100"
            fontSize="4xl"
            fontWeight="bold"
            lineHeight="10"
            mb={{ base: '6', lg: 'unset' }}
          >
            <Text as="span" color="primary.400" fontSize="4xl">
              Why
            </Text>
            <br />
            Meet With Wallet
          </Text>

          <SlideFade
            in={isWhyContainerVisible}
            delay={0.5}
            offsetY={-50}
            unmountOnExit={true}
          >
            <VStack
              p={6}
              background="rgba(255, 255, 255, 0.05)"
              alignItems="flex-start"
              gap={2}
            >
              <Icon as={FaRegHandshake} color="neutral.100" w={8} h={8} />

              <Heading fontSize="xl" color="primary.400">
                Meet at your own convenience
              </Heading>
              <Text fontSize="" color="neutral.100">
                Choose how and when you want others to meet you — Meet With
                Wallet lets you manage your time on your terms (including any
                external calendars you want to link).
              </Text>
            </VStack>
          </SlideFade>

          <SlideFade
            in={isWhyContainerVisible}
            delay={0.5}
            offsetY={-50}
            unmountOnExit={true}
          >
            <VStack
              p={6}
              background="rgba(255, 255, 255, 0.05)"
              alignItems="flex-start"
              gap={2}
            >
              <Icon as={BsBell} color="neutral.100" w={8} h={8} />

              <Heading fontSize="xl" color="primary.400">
                Stay informed with meeting reminders and follow ups
              </Heading>
              <Text fontSize="" color="neutral.100">
                Meet with Wallet automatically notifies you of upcoming meetings
                over email, push, Discord or Push protocol so that you don’t
                miss a beat. Only if you want it, of course.
              </Text>
            </VStack>
          </SlideFade>
        </Flex>
        <Flex direction="column" gap={{ base: '1', lg: '6' }}>
          <SlideFade
            in={isWhyContainerVisible}
            delay={0.5}
            offsetY={-50}
            unmountOnExit={true}
          >
            <VStack
              p={6}
              background="rgba(255, 255, 255, 0.05)"
              alignItems="flex-start"
              gap={2}
            >
              <Icon as={BsShieldShaded} color="neutral.100" w={8} h={8} />

              <Heading fontSize="xl" color="primary.400">
                Meet at your own convenience
              </Heading>
              <Text fontSize="" color="neutral.100">
                Choose how and when you want others to meet you — Meet With
                Wallet lets you manage your time on your terms (including any
                external calendars you want to link).
              </Text>
            </VStack>
          </SlideFade>

          <SlideFade
            in={isWhyContainerVisible}
            delay={0.5}
            offsetY={-50}
            unmountOnExit={true}
          >
            <VStack
              p={6}
              background="rgba(255, 255, 255, 0.05)"
              alignItems="flex-start"
              gap={2}
            >
              <Icon as={FaRegCalendarCheck} color="neutral.100" w={8} h={8} />

              <Heading fontSize="xl" color="primary.400">
                Stay informed with meeting reminders and follow ups
              </Heading>
              <Text fontSize="" color="neutral.100">
                Meet with Wallet automatically notifies you of upcoming meetings
                over email, push, Discord or Push protocol so that you don’t
                miss a beat. Only if you want it, of course.
              </Text>
            </VStack>
          </SlideFade>
          <Box flex={1}>
            <SlideFade
              in={isWhyContainerVisible}
              delay={0.5}
              offsetY={-50}
              unmountOnExit={true}
            >
              <Button
                colorScheme="orange"
                rightIcon={<BsArrowRight />}
                display={{ base: 'none', lg: 'unset' }}
                w="100%"
                h="80px"
              >
                Ready control your time Web3 style?
              </Button>
            </SlideFade>
          </Box>
        </Flex>
        <Button
          colorScheme="orange"
          rightIcon={<BsArrowRight />}
          display={{ base: 'unset', lg: 'none' }}
          height="72px"
          borderTopRadius="none"
        >
          Ready control your time Web3 style?
        </Button>
      </Flex>
    </Box>
  )
}

// import { useInView } from "react-intersection-observer";
// import { Box, Button, Flex, Heading, Icon, SlideFade, Text, VStack } from "@chakra-ui/react";
// import { FaRegHandshake, FaRegCalendarCheck } from 'react-icons/fa'
// import { BsBell, BsShieldShaded, BsArrowRight } from 'react-icons/bs'

// export function Why() {

//     //const { ref: whyContainer, inView: isWhyContainerVisible } = useInView()

//     return (
//       <Box
//         background="linear-gradient(359.95deg, rgba(31, 41, 51, 0.85) 0.04%, rgba(50, 63, 75, 0.85) 57.61%);"
//         px={{ base: 2, md: 10 }}
//         py={{ base: "10", md: "20" }}
//       >
//         <Flex
//           //ref={whyContainer}
//           px={{ base: 2, md: 40 }}
//           gap={{ base: "1", md: "6" }}
//           maxW="1360px"
//           mx="auto"
//           direction={{ base: "column", md: "row" }}
//         >
//           <Flex direction="column" gap={{ base: "1", md: "6" }}>
//             <Text
//               color="neutral.100"
//               fontSize="4xl"
//               fontWeight="bold"
//               lineHeight="10"
//               mb={{ base: "6", md: "unset" }}
//             >
//               <Text as="span" color="primary.400" fontSize="4xl">
//                 Why
//               </Text>
//               <br />
//               Meet With Wallet
//             </Text>

//               <VStack
//                 p={6}
//                 background="rgba(255, 255, 255, 0.05)"
//                 alignItems="flex-start"
//                 gap={2}
//               >
//                 <Icon as={FaRegHandshake} color="neutral.100" w={8} h={8} />

//                 <Heading fontSize="xl" color="primary.400">
//                   Meet at your own convenience
//                 </Heading>
//                 <Text fontSize="" color="neutral.100">
//                   Choose how and when you want others to meet you — Meet With
//                   Wallet lets you manage your time on your terms (including any
//                   external calendars you want to link).
//                 </Text>
//               </VStack>

//               <VStack
//                 p={6}
//                 background="rgba(255, 255, 255, 0.05)"
//                 alignItems="flex-start"
//                 gap={2}
//               >
//                 <Icon as={BsBell} color="neutral.100" w={8} h={8} />

//                 <Heading fontSize="xl" color="primary.400">
//                   Stay informed with meeting reminders and follow ups
//                 </Heading>
//                 <Text fontSize="" color="neutral.100">
//                   Meet with Wallet automatically notifies you of upcoming
//                   meetings over email, push, Discord or Push protocol so that
//                   you don’t miss a beat. Only if you want it, of course.
//                 </Text>
//               </VStack>

//           </Flex>
//           <Flex direction="column" gap={{ base: "1", md: "6" }}>

//               <VStack
//                 p={6}
//                 background="rgba(255, 255, 255, 0.05)"
//                 alignItems="flex-start"
//                 gap={2}
//               >
//                 <Icon as={BsShieldShaded} color="neutral.100" w={8} h={8} />

//                 <Heading fontSize="xl" color="primary.400">
//                   Meet at your own convenience
//                 </Heading>
//                 <Text fontSize="" color="neutral.100">
//                   Choose how and when you want others to meet you — Meet With
//                   Wallet lets you manage your time on your terms (including any
//                   external calendars you want to link).
//                 </Text>
//               </VStack>

//               <VStack
//                 p={6}
//                 background="rgba(255, 255, 255, 0.05)"
//                 alignItems="flex-start"
//                 gap={2}
//               >
//                 <Icon as={FaRegCalendarCheck} color="neutral.100" w={8} h={8} />

//                 <Heading fontSize="xl" color="primary.400">
//                   Stay informed with meeting reminders and follow ups
//                 </Heading>
//                 <Text fontSize="" color="neutral.100">
//                   Meet with Wallet automatically notifies you of upcoming
//                   meetings over email, push, Discord or Push protocol so that
//                   you don’t miss a beat. Only if you want it, of course.
//                 </Text>
//               </VStack>

//             <Box flex={1}>
//                 <Button
//                   colorScheme="orange"
//                   rightIcon={<BsArrowRight />}
//                   display={{ base: "none", md: "unset" }}
//                   w="100%"
//                   h="80px"
//                 >
//                   Ready control your time Web3 style?
//                 </Button>

//             </Box>
//           </Flex>
//           <Button
//             colorScheme="orange"
//             rightIcon={<BsArrowRight />}
//             display={{ base: "unset", md: "none" }}
//             height="72px"
//             borderTopRadius="none"
//           >
//             Ready control your time Web3 style?
//           </Button>
//         </Flex>
//       </Box>
//     );
// }
