import { Text, HStack, Box, Image, Flex } from '@chakra-ui/react'
import { Account } from '../../types/Account'
import { Jazzicon } from '@ukstv/jazzicon-react'
import { getAccountDisplayName } from '../../utils/user_manager'
import router from 'next/router'
import { useColorModeValue } from '@chakra-ui/color-mode'
import { logEvent } from '../../utils/analytics'

interface NavBarLoggedProfileProps {
  account: Account
}
const NavBarLoggedProfile: React.FC<NavBarLoggedProfileProps> = props => {
  const accountName = getAccountDisplayName(props.account, true)

  const goToDashboard = () => {
    logEvent('Clicked menu account container')
    router.push('/dashboard')
  }
  return (
    <Flex
      borderRadius={6}
      px={4}
      py={2}
      shadow={'md'}
      justifyContent="center"
      alignItems="center"
      onClick={goToDashboard}
      cursor="pointer"
      _hover={{
        bg: useColorModeValue('gray.100', 'gray.500'),
        boxShadow: 'lg',
      }}
      transition="all 0.3s"
      backgroundColor={useColorModeValue('white', 'gray.600')}
    >
      <Text
        mr={2}
        fontSize={'sm'}
        display={{ base: 'none', md: 'inline-block' }}
      >
        {accountName}
      </Text>
      <Box width="24px" height="24px">
        {props.account.avatar ? (
          <Image
            src={props.account.avatar}
            width="24px"
            height="24px"
            borderRadius="50%"
            objectFit="cover"
          />
        ) : (
          <Jazzicon address={props.account.address} />
        )}
      </Box>
    </Flex>
  )
}

export default NavBarLoggedProfile
