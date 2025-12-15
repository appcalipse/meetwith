import { createIcon } from '@chakra-ui/react'

const ImageIcon = createIcon({
  displayName: 'ImageIcon',
  viewBox: '0 0 50 50',
  path: [
    <path
      key="image-landscape"
      d="M45.1676 35.3336L38.6467 20.1044C36.4384 14.9377 32.3759 14.7294 29.6467 19.6461L25.7092 26.7502C23.7092 30.3544 19.9801 30.6669 17.3967 27.4377L16.9384 26.8544C14.2509 23.4794 10.4592 23.8961 8.52174 27.7502L4.9384 34.9377C2.41757 39.9377 6.0634 45.8336 11.6467 45.8336H38.2301C43.6467 45.8336 47.2926 40.3127 45.1676 35.3336Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />,
    <path
      key="image-sun"
      d="M14.5195 16.666C17.9713 16.666 20.7695 13.8678 20.7695 10.416C20.7695 6.96424 17.9713 4.16602 14.5195 4.16602C11.0678 4.16602 8.26953 6.96424 8.26953 10.416C8.26953 13.8678 11.0678 16.666 14.5195 16.666Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />,
  ],
})

export default ImageIcon
