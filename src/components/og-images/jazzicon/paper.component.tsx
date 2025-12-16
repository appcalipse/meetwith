import Color from 'color'
import React from 'react'

export const BASE_STYLES = {
  display: 'flex',
  borderRadius: '50%',
  overflow: 'hidden',
  padding: 0,
  margin: 0,
  width: '100%',
  height: '100%',
}

export interface PaperProps {
  color: Color
  className?: string
}

export function Paper(props: React.PropsWithChildren<PaperProps>) {
  const style = Object.assign({}, BASE_STYLES, {
    backgroundColor: props.color.hex(),
  })

  return (
    <div className={props.className} style={{ display: 'flex' }}>
      <div style={style}>{props.children}</div>
    </div>
  )
}
