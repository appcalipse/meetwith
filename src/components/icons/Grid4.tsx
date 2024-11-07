import { createIcon } from '@chakra-ui/react'

export const Grid4 = createIcon({
  displayName: 'Grid4',
  viewBox: '0 0 24 24',

  // path can also be an array of elements, if you have multiple paths, lines, shapes, etc.
  path: [
    <path
      key="first-path"
      d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z"
      stroke="#7B8794"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />,
    <path
      key="second-path"
      d="M9 2V22"
      stroke="#7B8794"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />,
  ],
})
