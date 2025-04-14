import * as Sentry from '@sentry/nextjs'
import NextErrorComponent from 'next/error'

const MyError = props => {
  return <NextErrorComponent {...props} />
}

MyError.getInitialProps = async contextData => {
  await Sentry.captureUnderscoreErrorException(contextData)

  return NextErrorComponent.getInitialProps(contextData)
}
export default MyError
