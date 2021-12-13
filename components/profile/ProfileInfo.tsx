import { Box, Flex, Text, HStack, Spacer, Link } from '@chakra-ui/layout'
import { Account, SpecialDomainType } from '../../types/Account'
import { Jazzicon } from '@ukstv/jazzicon-react'
import {
  ellipsizeAddress,
  getAccountDisplayName,
  getCustomDomainName,
} from '../../utils/user_manager'
import { FaDiscord, FaTelegram, FaTwitter } from 'react-icons/fa'
import { Image } from '@chakra-ui/image'
import { useColorModeValue } from '@chakra-ui/react'

interface ProfileInfoProps {
  account: Account
}
const ProfileInfo: React.FC<ProfileInfoProps> = props => {
  return (
    <Flex direction="column" alignItems="center">
      <Box width="80px" height="80px" mb={4}>
        <Jazzicon address={props.account.address} />
      </Box>
      <Box>{getAccountDisplayName(props.account)}</Box>
      <HStack my={6}>
        <Link
          color={useColorModeValue('gray.600', 'white')}
          isExternal
          href={'https://uol.clm.br'}
        >
          <FaTelegram size={24} />
        </Link>
        <Spacer />
        <Link
          color={useColorModeValue('gray.600', 'white')}
          isExternal
          href={`https://${getCustomDomainName(
            props.account.address,
            SpecialDomainType.ENS
          )}`}
        >
          <FaTwitter size={24} />
        </Link>
        <Spacer />
        <Link
          color={useColorModeValue('gray.600', 'white')}
          isExternal
          href={`https://${getCustomDomainName(
            props.account.address,
            SpecialDomainType.ENS
          )}`}
        >
          <FaDiscord size={24} />
        </Link>
      </HStack>
      {props.account.preferences?.description && (
        <Box position="relative">
          <Image
            src="/assets/quotes.svg"
            position="absolute"
            top="-6px"
            left="-24px"
          />
          <Text position="relative" textAlign="justify">
            <em>{props.account.preferences.description}</em>
          </Text>
        </Box>
      )}
    </Flex>
  )
}

export default ProfileInfo
