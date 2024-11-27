import { GeneralMessage } from '../src/models/general-message'
import { RequestMessage } from '../src/models/request-message'
import { ResponseMessage } from '../src/models/response-message'
import { MessageType } from '../src/types/message-type'
import { ConcreteRequestMessageMock } from './concrete-request-message-mock'
import { ConcreteResponseMessageMock } from './concrete-response-message-mock'

export class WorkerMock {
  private insideErrorListeners: ((event: ErrorEvent) => void)[] = []
  private insideMessageListeners: ((event: MessageEvent) => void)[] = []
  private outsideErrorListeners: ((event: ErrorEvent) => void)[] = []
  private outsideMessageListeners: ((event: MessageEvent) => void)[] = []
  private terminated: boolean = false
  private messageQueue: any[] = []
  private scope: any = null
  private scopeFunction: any = null
  private started: boolean = false

  constructor(url: string | URL, options?: WorkerOptions) {
    // Define the worker's scope
    this.scope = {
      MessageType: MessageType,
      GeneralMessage: GeneralMessage,
      RequestMessage: RequestMessage,
      ResponseMessage: ResponseMessage,
      ConcreteRequestMessageMock: ConcreteRequestMessageMock,
      ConcreteResponseMessageMock: ConcreteResponseMessageMock,
      onmessage: null,
      onmessageerror: null,
      onerror: null,
      testVar: null,
      terminated: false,
      window: {},
      self: { name: options?.name },
      postMessage: (data: any) => {
        console.log('[WORKER-INSIDE] Post Message to Outside - data: ', data)
        // worker thread calls postMessage -> calls mainThreadEmitter('message')
        this.dispatchOutsideMessageEvent(new MessageEvent('message', { data: data }))
      },
      addEventListener: (type: string, callback: EventListener) => {
        console.log('[WORKER-INSIDE] Add Inside Event Listener')
        if (type === 'message') {
          this.insideMessageListeners.push(callback as (event: MessageEvent) => void)
        } else if (type === 'error') {
          this.insideErrorListeners.push(callback as (event: ErrorEvent) => void)
        }
      },
      on: (type: string, callback: EventListener) => {
        console.log('[WORKER-INSIDE] Inside ON Event Listener')
        if (type === 'message') {
          this.insideMessageListeners.push(callback as (event: MessageEvent) => void)
        } else if (type === 'error') {
          this.insideErrorListeners.push(callback as (event: ErrorEvent) => void)
        }
      },
      removeEventListener: (type: string, callback: EventListener) => {
        console.log('[WORKER-INSIDE] Remove Inside EventListener')
        if (type === 'message') {
          const index = this.insideMessageListeners.indexOf(
            callback as (event: MessageEvent) => void
          )
          if (index !== -1) this.insideMessageListeners.splice(index, 1)
        } else if (type === 'error') {
          const index = this.insideErrorListeners.indexOf(callback as (event: ErrorEvent) => void)
          if (index !== -1) this.insideErrorListeners.splice(index, 1)
        }
      },
      dispatchEvent: (event: Event) => {
        console.log('[WORKER-INSIDE] Dispatch Event to Outside - event: ', event)
        this.dispatchOutsideMessageEvent(event)
      },
      terminate: () => {
        this.terminated = true
        this.messageQueue = []
        console.log('Worker terminated')
      },
      fetch: globalThis.fetch || (() => {}), // Use globalThis.fetch or mock it if needed
      importScripts: () => {}, // No-op for mock
    }

    // Handle incoming messages from the main thread
    this.onmessage = null // Default is no message handler
    this.onmessageerror = null
    this.onerror = null

    // Simulate loading the worker script
    ;(globalThis.fetch as typeof fetch)(url)
      .then((r) => r.text())
      .then((code) => {
        console.log('[WORKER-MOCK] code:', code)
        // Execute the worker code with the appropriate scope
        const workerFunc = new Function(
          `var self = this, global = self; ${Object.keys(this.scope)
            .map((k) => `var ${k} = self.${k};`)
            .join(' ')}; ${code}; return onmessage;`
        )
        this.scopeFunction = workerFunc.call(this.scope)
        // After worker script loads, process any queued messages
        this.started = true
        this.processMessageQueue()
      })
      .catch((e) => {
        this.dispatchErrorEvent(e)
        console.error(e)
      })
  }

  // Post messages from the worker to the main thread
  postMessage(message: any) {
    console.log('[WORKER-OUTSIDE] Post Message to Inside: ', message)
    if (this.terminated) return
    if (!this.started) {
      console.log('[WORKER-OUTSIDE] Post Message Queued')
      this.messageQueue.push(message)
    } else {
      console.log('[WORKER-OUTSIDE] Post Message Dispatching')
      this.dispatchInsideMessageEvent(new MessageEvent('message', { data: message }))
    }
  }

  // Worker sends a message to the main thread
  private dispatchInsideMessageEvent(event: Event) {
    console.log('[WORKER-OUTSIDE] Dispatch Message Event to Inside - event: ', event)

    if (event.type === 'message') {
      console.log(
        '[WORKER-OUTSIDE] Dispatch Message Event to Inside - event.data: ',
        (event as MessageEvent).data
      )
      if (this.scope?.onmessage || this.scopeFunction) {
        let f = this.scope.onmessage || this.scopeFunction
        console.log('[WORKER-OUTSIDE] Calling Inside Scope On Message: ', f)
        f.call(this.scope, event as MessageEvent)
      }
      this.insideMessageListeners.forEach((listener) => listener(event as MessageEvent))
    } else if (event.type === 'error') {
      this.insideErrorListeners.forEach((listener) => listener(event as ErrorEvent))
    }
  }

  private dispatchOutsideMessageEvent(event: Event) {
    console.log('[WORKER-INSIDE] Dispatch Message Event to Outside - event: ', event)

    if (event.type === 'message') {
      console.log(
        '[WORKER-OUTSIDE] Dispatch Message Event to Outside - event.data: ',
        (event as MessageEvent).data
      )
      this.outsideMessageListeners.forEach((listener) => listener(event as MessageEvent))
    } else if (event.type === 'error') {
      this.outsideErrorListeners.forEach((listener) => listener(event as ErrorEvent))
    }
  }

  private dispatchErrorEvent(error: Error) {
    console.log('[WORKER-OUTSIDE] Dispatch Error Event to Inside - error: ', error)
    const errorEvent = new Event('error', { error } as ErrorEvent)
    this.dispatchEvent(errorEvent)
  }

  // Process any queued messages that were sent before the script finished loading
  private processMessageQueue() {
    console.log('[WORKER-MOCK] BEGIN Processing Message Queue')
    if (this.messageQueue.length > 0) {
      this.messageQueue.forEach((message) => this.postMessage(message))
      this.messageQueue = []
    }
    console.log('[WORKER-MOCK]   END Processing Message Queue')
  }

  // This is a placeholder for the onmessage callback in the main thread.
  onmessage: ((event: MessageEvent) => void) | null = null
  onmessageerror: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null

  // Add event listener for message events
  addEventListener(type: string, callback: EventListener) {
    console.log('[WORKER-OUTSIDE] Add Outside Event Listener')
    if (type === 'message') {
      this.outsideMessageListeners.push(callback as (event: MessageEvent) => void)
    } else if (type === 'error') {
      this.outsideErrorListeners.push(callback as (event: ErrorEvent) => void)
    }
  }
  
  // Add event listener for message events
  on(type: string, callback: EventListener) {
    console.log('[WORKER-OUTSIDE] Outside ON Event Listener')
    if (type === 'message') {
      this.outsideMessageListeners.push(callback as (event: MessageEvent) => void)
    } else if (type === 'error') {
      this.outsideErrorListeners.push(callback as (event: ErrorEvent) => void)
    }
  }

  // Remove event listener for message events
  removeEventListener(type: string, callback: EventListener) {
    console.log('[WORKER-OUTSIDE] Remove Outside Event Listener')
    if (type === 'message') {
      const index = this.outsideMessageListeners.indexOf(callback as (event: MessageEvent) => void)
      if (index !== -1) this.outsideMessageListeners.splice(index, 1)
    } else if (type === 'error') {
      const index = this.outsideErrorListeners.indexOf(callback as (event: ErrorEvent) => void)
      if (index !== -1) this.outsideErrorListeners.splice(index, 1)
    }
  }

  // Dispatch event (mainly used for sending events to listeners)
  dispatchEvent(event: Event): boolean {
    console.log('[WORKER-OUTSIDE] Dispatch Event to Inside - event: ', event)
    this.dispatchInsideMessageEvent(event)
    return true
  }

  // Terminate the worker (stop it from processing any further events)
  terminate() {
    this.dispatchEvent(new ErrorEvent('error', { message: 'Worker terminated' }))
    this.terminated = true
  }

  test() {
    let scope = {
      testVar: null,
      onmessage: null,
    }
  }
}
