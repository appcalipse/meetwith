export class EmailQueue {
  private queue: Array<() => Promise<boolean>> = []
  private processing = false
  private readonly rateLimit = 500 // 500ms between emails (2 per second)

  async add(emailFunction: () => Promise<boolean>): Promise<boolean> {
    return new Promise(resolve => {
      this.queue.push(async () => {
        const result = await emailFunction()
        resolve(result)
        return result
      })
      this.process()
    })
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return

    this.processing = true
    while (this.queue.length > 0) {
      // eslint-disable-next-line no-restricted-syntax
      console.info('Processing email queue, remaining:', this.queue.length)
      const emailFunction = this.queue.shift()!
      await emailFunction()
      await new Promise(resolve => setTimeout(resolve, this.rateLimit))
    }
    this.processing = false
  }
}
