import { Box, FormLabel, Input } from '@chakra-ui/react'
import React, { FC } from 'react'
import { RiSearch2Line } from 'react-icons/ri'

interface IProps {
  setValue: (value: string) => void
  value: string
  placeholder?: string
}

const SearchInput: FC<IProps> = ({ setValue, value, placeholder }) => {
  return (
    <Box w={{ base: '100%', md: 'fit-content' }} pos="relative" h="100%">
      <FormLabel
        display="flex"
        htmlFor="search"
        pos="absolute"
        left={3}
        insetY={0}
        h="100%"
        justifyContent="center"
        alignItems="center"
      >
        <RiSearch2Line color="#7B8794" />
      </FormLabel>
      <Input
        pl={10}
        w={{ base: '100%', md: 'fit-content' }}
        h={12}
        type="search"
        placeholder={placeholder}
        id="search"
        defaultValue={value}
        rounded={6}
        onChange={e => setValue(e.target.value)}
        autoComplete="off"
        _placeholder={{
          color: 'neutral.400',
        }}
      />
    </Box>
  )
}

export default SearchInput
