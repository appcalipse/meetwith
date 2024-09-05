import { createIcon } from '@chakra-ui/react'

export const Availability = createIcon({
  displayName: 'Availability',
  viewBox: '0 0 56 72',

  // path can also be an array of elements, if you have multiple paths, lines, shapes, etc.
  path: [
    <path
      key="first-path"
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M35 28H34V26H32V28H24V26H22V28H21C19.89 28 19 28.9 19 30V44C19 45.1 19.89 46 21 46H35C36.1 46 37 45.1 37 44V30C37 28.9 36.1 28 35 28ZM35 44H21V33H35V44Z"
      fill="currentColor"
    />,
    <path
      key="second-path"
      d="M29.25 38.5C29.25 39.1225 28.6917 39.625 28 39.625C27.3083 39.625 26.75 39.1225 26.75 38.5C26.75 37.8775 27.3083 37.375 28 37.375C28.6917 37.375 29.25 37.8775 29.25 38.5ZM28 35.5C25.725 35.5 23.7833 36.745 23 38.5C23.7833 40.255 25.725 41.5 28 41.5C30.275 41.5 32.2167 40.255 33 38.5C32.2167 36.745 30.275 35.5 28 35.5ZM28 40.375C26.85 40.375 25.9167 39.535 25.9167 38.5C25.9167 37.465 26.85 36.625 28 36.625C29.15 36.625 30.0833 37.465 30.0833 38.5C30.0833 39.535 29.15 40.375 28 40.375Z"
      fill="currentColor"
    />,
  ],
})
