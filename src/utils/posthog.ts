import { PostHog } from 'posthog-node'

class PostHogClientSingleton {
  private static instance: PostHog | null = null

  private constructor() {}

  public static getInstance(): PostHog {
    if (PostHogClientSingleton.instance === null) {
      PostHogClientSingleton.instance = new PostHog(
        process.env.NEXT_PUBLIC_POSTHOG_KEY!,
        {
          host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
          flushAt: 1,
          flushInterval: 0,
        }
      )
    }
    return PostHogClientSingleton.instance
  }
}

export default function PostHogClient(): PostHog {
  return PostHogClientSingleton.getInstance()
}
