import styled, { css, keyframes } from 'styled-components'

const prev = keyframes`
  0% {
    transform: translateX(-110%);
  }
  100% {
    transform: translateX(0);
  }
`

const fakePrev = keyframes`
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(110%);
  }
`

const next = keyframes`
  0% {
    transform: translateX(110%);
  }
  100% {
    transform: translateX(0);
  }
`

const fakeNext = keyframes`
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-110%);
  }
`

const fadeIn = keyframes`
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
`

const fadeOut = keyframes`
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
`

const ANIM_TIME_SEC = 0.4
const FADE_TIME_SEC = 0.8
const _makeAnimation = type => css`
  ${type} ${ANIM_TIME_SEC}s ease-in-out normal both;
`
const _makeFadeAnimation = type => css`
  ${type} ${FADE_TIME_SEC}s ease-in-out normal both;
`

const animation = props => {
  const { animation } = props

  if (animation === 'prev') {
    return _makeAnimation(prev)
  }

  if (animation === 'next') {
    return _makeAnimation(next)
  }

  if (animation === 'fade') {
    return _makeFadeAnimation(fadeIn)
  }
}

const fakeAnimation = props => {
  const { animation } = props

  if (animation === 'prev') {
    return _makeAnimation(fakePrev)
  }

  if (animation === 'next') {
    return _makeAnimation(fakeNext)
  }

  if (animation === 'fade') {
    return _makeFadeAnimation(fadeOut)
  }
}

export const Calendar = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  animation: ${animation};
  z-index: 1;
`

export const FakeCalendar = styled.div`
  animation: ${fakeAnimation};
  opacity: ${props => (props.animation ? 1 : 0)};
  z-index: 0;
`
