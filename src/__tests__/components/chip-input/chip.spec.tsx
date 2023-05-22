import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import { BadgeChip, BadgeChipProps } from '@/components/chip-input/chip'

describe('Time Selector', () => {
  it('should correctly render child content', () => {
    // given
    const textChild = 'Text Child'
    const rawComponent = <BadgeChip>{textChild}</BadgeChip>

    // when
    render(rawComponent)

    // then
    expect(screen.getByText(textChild)).toBeInTheDocument()
  })

  it('should not display remove link if not explicitly asked', () => {
    // given
    const onRemove: BadgeChipProps['onRemove'] = jest.fn()
    const textChild = 'Text Child'
    const rawComponent = (
      <BadgeChip allowRemove={false} onRemove={onRemove}>
        {textChild}
      </BadgeChip>
    )

    // when
    render(rawComponent)

    // then
    expect(screen.queryByLabelText('Remove Entry')).not.toBeInTheDocument()
  })

  it('should call onRemove if provided', () => {
    // given
    const onRemove: BadgeChipProps['onRemove'] = jest.fn()
    const textChild = 'Text Child'
    const rawComponent = (
      <BadgeChip allowRemove={true} onRemove={onRemove}>
        {textChild}
      </BadgeChip>
    )

    // when
    const { getByLabelText } = render(rawComponent)
    fireEvent.click(getByLabelText('Remove Entry'))

    // then
    expect(onRemove).toHaveBeenCalled()
  })
})
