import amplitude from 'amplitude-js'
import { isProduction } from './constants'

const initAnalytics = async () => {
  if (isProduction) {
    await amplitude.getInstance().init(process.env.NEXT_PUBLIC_AMPLITUDE_KEY!)
    ;(window as any).amplitude = amplitude
  }
}

const logEvent = (eventName: string, properties?: object) => {
  isProduction && amplitude.getInstance().logEvent(eventName, properties)
}

const pageView = (path: string) => {
  isProduction && amplitude.getInstance().logEvent('Page viewed', { path })
}

export { initAnalytics, logEvent, pageView }
