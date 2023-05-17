import { Button, Flex } from '@chakra-ui/react'

export interface ToggleSelectorProps<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: T
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (v: T) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: { label: string; value: T }[]
}

export const ToggleSelector = <T,>({
  value,
  onChange,
  options,
}: ToggleSelectorProps<T>) => {
  return (
    <Flex bg="neutral.900" padding={1} borderRadius={8} gap={1}>
      {options.map((option, index) => (
        <Button
          flexGrow={1}
          flexShrink={0}
          flexBasis={0}
          key={index}
          variant={value === option.value ? 'solid' : 'ghost'}
          onClick={() => onChange(option.value)}
          colorScheme="primary"
        >
          {option.label}
        </Button>
      ))}
    </Flex>
  )
}
