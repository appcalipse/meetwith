import React from 'react'
import { ComponentStory, ComponentMeta } from '@storybook/react'

import { ChipInput } from '.'

// More on default export: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
export default {
  title: 'MWW/Chip Input',
  component: ChipInput,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {
    initialItems: {},
    onChange: {
      action: 'content changed',
    },
  },
} as ComponentMeta<typeof ChipInput>

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
const Template: ComponentStory<typeof ChipInput> = args => (
  <ChipInput {...args} />
)

export const Empty = Template.bind({})
// More on args: https://storybook.js.org/docs/react/writing-stories/args
Empty.args = {}

export const Filled = Template.bind({})
Filled.args = {
  initialItems: ['Meet', 'with', 'WaLlEt'],
}

export const ReadOnly = Template.bind({})
ReadOnly.args = {
  initialItems: ['Meet', 'with', 'WaLlEt'],
  isReadOnly: true,
}
