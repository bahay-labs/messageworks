import { EventEmitter } from 'events'

type ResourceLimits = {
    maxOldGenerationSizeMb?: number
    maxYoungGenerationSizeMb?: number
    codeRangeSizeMb?: number
    stackSizeMb?: number
}

type WorkerOptions = {
    argv?: any[]
    env?: Object
    eval?: boolean
    execArgv?: string[]
    stdin?: boolean
    stdout?: boolean
    stderr?: boolean
    workerData?: any
    trackUnmanagedFds?: boolean
    transferList?: Object[]
    resourceLimits?: ResourceLimits
    name?: string
}

export class WorkerThreadsWorkerMock {
    constructor(filename: string | URL, options?: WorkerOptions) {}
/*
    [EventEmitter.captureRejectionSymbol]?<K>(error: Error, event: string | symbol, ...args: any[]): void {
        throw new Error('Method not implemented.');
    }
    addListener<K>(eventName: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error('Method not implemented.');
    }
    on<K>(eventName: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error('Method not implemented.');
    }
    once<K>(eventName: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error('Method not implemented.');
    }
    removeListener<K>(eventName: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error('Method not implemented.');
    }
    off<K>(eventName: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error('Method not implemented.');
    }
    removeAllListeners(eventName?: string | symbol | undefined): this {
        throw new Error('Method not implemented.');
    }
    setMaxListeners(n: number): this {
        throw new Error('Method not implemented.');
    }
    getMaxListeners(): number {
        throw new Error('Method not implemented.');
    }
    listeners<K>(eventName: string | symbol): Function[] {
        throw new Error('Method not implemented.');
    }
    rawListeners<K>(eventName: string | symbol): Function[] {
        throw new Error('Method not implemented.');
    }
    emit<K>(eventName: string | symbol, ...args: any[]): boolean {
        throw new Error('Method not implemented.');
    }
    listenerCount<K>(eventName: string | symbol, listener?: Function | undefined): number {
        throw new Error('Method not implemented.');
    }
    prependListener<K>(eventName: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error('Method not implemented.');
    }
    prependOnceListener<K>(eventName: string | symbol, listener: (...args: any[]) => void): this {
        throw new Error('Method not implemented.');
    }
    eventNames(): (string | symbol)[] {
        throw new Error('Method not implemented.');
    }
*/
/*  
import { EventEmitter } from 'events'
import { WorkerOptions } from 'worker_threads'

export class WorkerThreadsMock extends EventEmitter {
  constructor(filename: string, options?: WorkerOptions) {
    super()
    // Simulate worker creation with the provided file and options
    console.log(`Worker created with file: ${filename}`)
  }

  errorListeners: (EventListener | EventListenerObject)[] = []
  messageListeners: (EventListener | EventListenerObject)[] = []

  // Simulate onerror event for worker threads
  onerror(event: ErrorEvent) {
    this.errorListeners.forEach((listener) => {
      if (typeof listener === 'function') {
        listener(event)
      } else if (listener && typeof listener.handleEvent === 'function') {
        listener.handleEvent(event)
      }
    })
  }

  // Simulate onmessage event for worker threads
  onmessage(event: MessageEvent) {
    this.messageListeners.forEach((listener) => {
      if (typeof listener === 'function') {
        listener(event)
      } else if (listener && typeof listener.handleEvent === 'function') {
        listener.handleEvent(event)
      }
    })
  }

  // Add event listeners for message or error events
  addEventListener(
    type: string,
    callback: EventListener | EventListenerObject | null,
    options?: AddEventListenerOptions | boolean
  ): void {
    if (type === 'error' && callback) {
      this.errorListeners.push(callback)
    } else if (type === 'message' && callback) {
      this.messageListeners.push(callback)
    }
  }

  // Remove event listeners for message or error events
  removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean
  ): void {
    if (type === 'error' && callback) {
      const index = this.errorListeners.indexOf(callback)
      if (index !== -1) {
        this.errorListeners.splice(index, 1)
      }
    } else if (type === 'message' && callback) {
      const index = this.messageListeners.indexOf(callback)
      if (index !== -1) {
        this.messageListeners.splice(index, 1)
      }
    }
  }

  // Simulate dispatching an event to listeners
  dispatchEvent(event: Event): boolean {
    if (event.type === 'message') {
      this.onmessage(event as MessageEvent)
    } else if (event.type === 'error') {
      this.onerror(event as ErrorEvent)
    }
    return true
  }

  // Simulate posting a message to the worker
  postMessage(message: any): void {
    // Dispatch the 'message' event when postMessage is called
    this.dispatchEvent(new MessageEvent('message', { data: message }))
  }

  // Simulate terminating the worker
  terminate(): void {
    console.log('Worker terminated')
    this.emit('exit')  // Emit exit event to simulate worker termination
  }

  // Simulate the behavior of the worker emitting an exit event
  simulateExit(code: number): void {
    this.emit('exit', code)
  }
}
*/
}
  