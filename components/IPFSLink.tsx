import { Link, Text, Spinner, VStack, HStack, Icon } from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { FaExternalLinkAlt } from 'react-icons/fa'

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
    <VStack my={4} alignItems="start" justifyContent="center">
      {title && <Text fontSize="sm">{title}</Text>}

      <HStack minH="24px" width="100%">
        <Link
          href={`https://ipfs.io/ipfs/${ipfsHash}`}
          target="_blank"
          rel="noopener noreferrer"
          display="flex"
          width="100%"
          alignItems="center"
          justifyContent="center"
        >
          <HStack
            display={loading ? 'none' : 'flex'}
            flexWrap="nowrap"
            flex={1}
          >
            <Text
              fontSize="0.8rem"
              flex={1}
              textOverflow="ellipsis"
              textAlign="start"
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
