import { useCallback } from 'react'

const usePoller = () => {
  const poller = useCallback(
    async (
      pollFn: () => Promise<{
        completed: boolean
      }>,
      abortSignal: AbortSignal,
      delayMs = 2000
    ) => {
      while (!abortSignal.aborted) {
        const result = await pollFn()
        if (result.completed) {
          return
        }

        await new Promise(resolve => {
          const timeout = setTimeout(resolve, delayMs)
          abortSignal.addEventListener('abort', () => clearTimeout(timeout), {
            once: true,
          })
        })
      }

      throw new Error('Polling aborted')
    },
    []
  )
  return poller
}

export default usePoller
