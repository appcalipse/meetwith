import styled from 'styled-components'

export const PopupWrapper = styled.div`
  position: relative;
  text-align: center;
  margin: auto;

  @media (max-width: 500px) {
    width: 100%;
  }
`

export const Popup = styled.div`
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  margin: auto;
  width: 100%;
  height: 100%;
  z-index: 3;
  font-size: 1.1em;
`

export const PopupHeader = styled.header`
  padding: 1em 0;
  text-align: left;
`

export const PopupClose = styled.button`
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  font-size: 1em;
  text-decoration: underline;

  :hover {
    cursor: pointer;
  }

  :disabled {
    cursor: not-allowed;
  }
`
