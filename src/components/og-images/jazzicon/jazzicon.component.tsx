import MersenneTwister from 'mersenne-twister'

import { Colors } from './colors'
import { Shape } from './shape.component'

const DEFAULT_SHAPE_COUNT = 3

export interface JazziconProps {
  address: string
  className?: string
}

function times(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i)
}

export function Jazzicon(props: JazziconProps) {
  const seed = parseInt(props.address.toLowerCase().slice(2, 10), 16)
  const generator = new MersenneTwister(seed)
  const colors = new Colors(generator)
  const paperColor = colors.next()

  return (
    <div
      style={{
        display: 'flex', // Satori needs this on almost everything
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        backgroundColor: paperColor.hex(),
        overflow: 'hidden',
      }}
    >
      {times(DEFAULT_SHAPE_COUNT).map(i => (
        <Shape
          key={`shape-${i}`}
          generator={generator}
          total={DEFAULT_SHAPE_COUNT}
          index={i}
          colors={colors}
        />
      ))}
    </div>
  )
}
