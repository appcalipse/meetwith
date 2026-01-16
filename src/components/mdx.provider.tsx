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
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <Heading as="h1" size="2xl" mt="1rem" {...props}>
      {props.children}
    </Heading>
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <Heading as="h2" size="xl" mt="1rem" {...props}>
      {props.children}
    </Heading>
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <Heading as="h3" size="lg" mt="3rem" {...props}>
      {props.children}
    </Heading>
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <Text fontSize="md" {...props}>
      {props.children}
    </Text>
  ),
  ul: UnorderedList,
  ol: OrderedList,
  li: (props: React.LiHTMLAttributes<HTMLLIElement>) => (
    <ListItem {...props}>{props.children}</ListItem>
  ),
}

export const ChakraMDXProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <MDXProvider components={components}>{children}</MDXProvider>
}
