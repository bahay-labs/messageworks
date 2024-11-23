export class WebWorkerMock {
  constructor(url: string | URL, options?: WorkerOptions) {}

  errorListeners: (EventListener | EventListenerObject)[] = []
  onerror(event: ErrorEvent) {
    this.errorListeners.forEach((listener) => {
      if (typeof listener === 'function') {
        ;(listener as unknown as EventListener)(event)
      } else if (
        typeof listener === 'object' &&
        listener !== null &&
        typeof listener.handleEvent === 'function'
      ) {
        ;(listener as unknown as EventListenerObject).handleEvent(event)
      }
    })
  }

  messageListeners: (EventListener | EventListenerObject)[] = []
  onmessage(event: MessageEvent) {
    this.messageListeners.forEach((listener) => {
      if (typeof listener === 'function') {
        ;(listener as unknown as EventListener)(event)
      } else if (
        typeof listener === 'object' &&
        listener !== null &&
        typeof listener.handleEvent === 'function'
      ) {
        ;(listener as unknown as EventListenerObject).handleEvent(event)
      }
    })
  }

  messageErrorListeners: (EventListener | EventListenerObject)[] = []
  onmessageerror(event: MessageEvent) {
    this.messageErrorListeners.forEach((listener) => {
      if (typeof listener === 'function') {
        ;(listener as unknown as EventListener)(event)
      } else if (
        typeof listener === 'object' &&
        listener !== null &&
        typeof listener.handleEvent === 'function'
      ) {
        ;(listener as unknown as EventListenerObject).handleEvent(event)
      }
    })
  }

  addEventListener(
    type: string,
    callback: EventListener | EventListenerObject | null,
    options?: AddEventListenerOptions | boolean
  ): void {
    if (type === 'error') {
      if (callback) {
        this.errorListeners.push(callback)
      }
    } else if (type === 'message') {
      if (callback) {
        this.messageListeners.push(callback)
      }
    } else if (type === 'messageerror') {
      if (callback) {
        this.messageErrorListeners.push(callback)
      }
    }
  }

  removeEventListener(
    type: string,
    callback: EventListener | EventListenerObject | null,
    options?: EventListenerOptions | boolean
  ): void {
    if (type === 'error') {
      if (callback) {
        const index = this.errorListeners.indexOf(callback)
        this.errorListeners.splice(index, 1)
      }
    } else if (type === 'message') {
      if (callback) {
        const index = this.messageListeners.indexOf(callback)
        this.messageListeners.splice(index, 1)
      }
    } else if (type === 'messageerror') {
      if (callback) {
        const index = this.messageErrorListeners.indexOf(callback)
        this.messageErrorListeners.splice(index, 1)
      }
    }
  }

  dispatchEvent(event: Event): boolean {
    if (event.type === 'message') {
      this.onmessage(event as MessageEvent)
    } else if (event.type === 'messageerror') {
      this.onmessageerror(event as MessageEvent)
    } else if (event.type === 'error') {
      this.onerror(event as ErrorEvent)
    }
    return true
  }

  postMessage(message: any): void {
    this.dispatchEvent(new MessageEvent('message', { data: message }))
  }

  terminate(): void {
    console.log('Worker terminated')
  }

  simulate
}
