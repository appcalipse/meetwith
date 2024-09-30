import styled from 'styled-components'

import { colors } from '../../../styles/theme'

export const MonthDays = styled.ul`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: repeat(6, 1fr);
  grid-gap: 0;
  font-size: 1.2em;
  font-weight: 300;
  margin: 0;
  padding: 0;
`

export const MonthDay = styled.li`
  list-style: none;
  display: grid;
  align-items: center;
  margin: 0;
  padding: 0;
  padding: 1em 0;
  border-radius: 50%;
  transition: all 0.25s ease;
  font-weight: ${props => (props.isToday ? 'bold' : '500')};
  color: ${props => {
    const todayColor = props.isDarkMode
      ? colors.primary['400']
      : colors.primary['600']
    const isWeekendColor = props.isDarkMode
      ? colors.neutral['300']
      : colors.neutral['400']
    const isNotValidColor = props.isDarkMode
      ? colors.neutral['100']
      : colors.neutral['500']
    return props.isToday
      ? todayColor
      : props.isWeekend
      ? isWeekendColor
      : isNotValidColor
  }};
  opacity: ${props => (props.isValid ? 1 : 0.5)};

  :hover {
    cursor: ${props => (props.isValid ? 'pointer' : 'inherit')};
    color: ${props => (props.isValid ? '#F46739' : 'inherit')};
  }
`
