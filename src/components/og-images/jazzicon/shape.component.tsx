import MersenneTwister from 'mersenne-twister'

import { Colors } from './colors'

export function Shape(props: {
  generator: MersenneTwister
  total: number
  index: number
  colors: Colors
}) {
  const diameter = 100

  const firstRot = props.generator.random()
  const angle = Math.PI * 2 * firstRot
  const velocity =
    (diameter / props.total) * props.generator.random() +
    (props.index * diameter) / props.total
  const tx = Math.cos(angle) * velocity
  const ty = Math.sin(angle) * velocity
  const secondRot = props.generator.random()
  const rot = (firstRot * 360 + secondRot * 180).toFixed(1)
  const translate = `translate(${tx.toFixed(3)}px, ${ty.toFixed(3)}px)`
  const rotate = `rotate(${rot}deg)`
  return (
    <div
      style={{
        width: '100px',
        height: '100px',
        transform: `${translate} ${rotate}`,
        backgroundColor: props.colors.next().hex(),
        position: 'absolute',
      }}
    />
  )
}
