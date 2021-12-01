import {ReactElement} from 'react';
import {
  Container,
  Link,
  Box,
  SimpleGrid,
  Icon,
  Text,
  Stack,
  Flex,
  useColorModeValue
} from '@chakra-ui/react';
import {FcCalendar, FcPrivacy, FcWorkflow} from 'react-icons/fc';

interface FeatureProps {
  title: string;
  text: string | ReactElement;
  icon: ReactElement;
}

const Feature = ({title, text, icon}: FeatureProps) => {
  return (
    <Stack>
      <Flex
        w={16}
        h={16}
        align={'center'}
        justify={'center'}
        color={'white'}
        rounded={'full'}
        bg={'gray.100'}
        mb={1}
      >
        {icon}
      </Flex>
      <Text fontWeight={600}>{title}</Text>
      <Text color={useColorModeValue('gray.500','gray.300')}>{text}</Text>
    </Stack>
  );
};

export default function SimpleThreeColumns() {
  return (
    <Container maxW="container.xl">
      <Box p={4}>
        <SimpleGrid columns={{base: 1, md: 3}} spacing={10}>
          <Feature
            icon={<Icon as={FcCalendar} w={10} h={10} />}
            title={'Fast and simple'}
            text={
              'Enough of Discord conversations to find a good time to meet. Just share your link and let the other participant pick the best time.'
            }
          />
          <Feature
            icon={<Icon as={FcPrivacy} w={10} h={10} />}
            title={'Privacy first'}
            text={
              'Your private data is only accessible by you. Information is encrypted and only your wallet can decrypt it. Only meeting participants have access to meeting private info.'
            }
          />
          <Feature
            icon={<Icon as={FcWorkflow} w={10} h={10} />}
            title={'Integrated'}
            text={
              <>
                Integration with state of the art technology on the web3 space:{' '}
                <Link
                  href="https://ethereum.org/?source=meetwithwallet"
                  target="_blank"
                >
                  Ethereum Blockchain
                </Link>
                ,{' '}
                <Link
                  href="https://arbitrum.io/?source=meetwithwallet"
                  target="_blank"
                >
                  Arbitrum
                </Link>
                ,{' '}
                <Link
                  href="https://ipfs.io/?source=meetwithwallet"
                  target="_blank"
                >
                  IPFS
                </Link>
                ,{' '}
                <Link
                  href="https://ens.domains/?source=meetwithwallet"
                  target="_blank"
                >
                  ENS
                </Link>{' '}
                and{' '}
                <Link
                  href="https://epns.io/?source=meetwithwallet"
                  target="_blank"
                >
                  EPNS
                </Link>
                . Much more to come.
              </>
            }
          />
        </SimpleGrid>
      </Box>
    </Container>
  );
}
