import { HStack, Icon, Link, Spinner, Text, VStack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { FaExternalLinkAlt } from 'react-icons/fa'

import { logEvent } from '../utils/analytics'

interface IPFSLinkProps {
  ipfsHash: string
  title?: string
}

const IPFSLink: React.FC<IPFSLinkProps> = ({ ipfsHash, title }) => {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
    }, 500)
  }, [ipfsHash])

  return (
    <VStack my={4} alignItems="start" justifyContent="center" maxWidth="100%">
      {title && <Text fontSize="sm">{title}</Text>}

      <HStack mt={0} maxWidth="100%">
        <Link
          href={`https://mww.infura-ipfs.io/ipfs/${ipfsHash}`}
          isExternal
          target="_blank"
          overflow="hidden"
          rel="noopener noreferrer"
          display="flex"
          alignItems="center"
          justifyContent="center"
          onClick={() => logEvent('Clicked IPFS link', { title })}
        >
          <HStack
            display={loading ? 'none' : 'flex'}
            flexWrap="nowrap"
            flex={1}
            wordBreak="break-all"
          >
            <Text
              fontSize="sm"
              flex={1}
              textOverflow="ellipsis"
              textAlign="start"
              whiteSpace="nowrap"
              overflow="hidden"
              color="primary.400"
            >
              {ipfsHash}
            </Text>
            <Icon name="ipfs link" size="16px" as={FaExternalLinkAlt} />
          </HStack>
          <Spinner display={!loading ? 'none' : 'flex'} />
        </Link>
      </HStack>
    </VStack>
  )
}

export default IPFSLink
