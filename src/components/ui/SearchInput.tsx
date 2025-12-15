import { Box, FormLabel, Input } from '@chakra-ui/react'
import React, { FC } from 'react'
import { RiSearch2Line } from 'react-icons/ri'

interface IProps {
  setValue: (value: string) => void
  value: string
  placeholder?: string
}

const SearchInput: FC<IProps> = ({ setValue, value, placeholder }) => {
  const [search, setSearch] = React.useState('')
  React.useEffect(() => {
    setValue(search)
  }, [search, setValue])
  return (
    <Box
      w={{ base: '100%', md: 'fit-content' }}
      minW={{ md: '370px' }}
      pos="relative"
      h="100%"
    >
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
        w={'100%'}
        h={12}
        type="search"
        placeholder={placeholder}
        id="search"
        value={search}
        rounded={6}
        onChange={e => setSearch(e.target.value)}
        autoComplete="off"
        _placeholder={{
          color: 'neutral.400',
        }}
      />
    </Box>
  )
}

export default SearchInput
