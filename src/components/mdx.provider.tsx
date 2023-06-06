import {
  Heading,
  ListItem,
  OrderedList,
  Text,
  UnorderedList,
} from '@chakra-ui/react'
import { MDXProvider } from '@mdx-js/react'
import React from 'react'

const components = {
  h1: ({ children }: any) => (
    <Heading as="h1" size="2xl" mt="1rem">
      {children}
    </Heading>
  ),
  h2: ({ children }: any) => (
    <Heading as="h2" size="xl" mt="1rem">
      {children}
    </Heading>
  ),
  h3: ({ children }: any) => (
    <Heading as="h3" size="lg" mt="3rem">
      {children}
    </Heading>
  ),
  p: ({ children }: any) => <Text fontSize="md">{children}</Text>,
  ul: UnorderedList,
  ol: OrderedList,
  li: ({ children }: any) => <ListItem>{children}</ListItem>,
}

export const ChakraMDXProvider: React.FC<{ children: any }> = ({
  children,
}) => {
  return <MDXProvider components={components}>{children}</MDXProvider>
}
