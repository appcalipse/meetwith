import { QueryClient } from '@tanstack/react-query'

import { ApiFetchError } from './errors'

export const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      retry: (failureCount, error) => {
        if (error instanceof ApiFetchError) {
          const status = error.status
          if (status >= 400 && status < 500) {
            return false
          }
        }
        return failureCount < 2
      },
    },
    queries: {
      networkMode: 'online',
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiFetchError) {
          const status = error.status
          if (status >= 400 && status < 500) {
            return false
          }
        }
        return failureCount < 3
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 1000 * 60 * 2, // 2 minutes stale
    },
  },
})
