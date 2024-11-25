import { UUIDTypes, v4 as generateUUID } from 'uuid'
import { MessageType } from '../types/message-type'
import { Messenger } from '../types/messenger'
import { GeneralMessage } from '../models/general-message'
import { ResponseMessage } from '../models/response-message'
import {
  messengerAsString,
  messengersAreEqual,
  messengerIsUpstream,
  isWorkerThreads,
} from '../utils'

/**
 * A service for handling messaging between different workers and instances.
 * It provides functionality to send messages, handle responses, and manage workers.
 */
export class MessagingService {
  private messenger: Messenger
  private workers: Map<string, any> = new Map()
  private workerListeners: Map<string, (message: any) => void> = new Map()
  private responseHandlers: Map<UUIDTypes, (message: ResponseMessage<any>) => void> = new Map()
  private messageReceivedCallback: (message: GeneralMessage<any>) => void
  private workerThreads: typeof import('worker_threads') | undefined = undefined
  private isInitialized: Promise<void>

  /**
   * Creates an instance of the MessagingService.
   * @param {Messenger} messenger The messenger identifier for this instance.
   * @param {Function} messageReceivedCallback Callback function to handle received messages.
   */
  constructor(
    messenger: Messenger,
    messageReceivedCallback: (message: GeneralMessage<any>) => void
  ) {
    this.messenger = messenger
    this.messageReceivedCallback = messageReceivedCallback

    this.isInitialized = this.initialize().catch((err) => {
      console.error(`WORKFLOW[???] Failed to initialize WorkflowWorker:`, err)
    })
  }

  private async initialize() {
    // Conditionally import worker_threads for Node.js environments
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      console.log(`SERVICE[${this.messenger}] running in node.`)

      try {
        const workerThreadsModule = await import('worker_threads')
        this.workerThreads = workerThreadsModule

        if (!this.workerThreads?.isMainThread) {
          this.setupWorkerThreadListener()
        } else {
          console.log(`SERVICE[${this.messenger}] is main thread`)
        }
      } catch (err) {
        console.error(`SERVICE[${this.messenger}] Failed to load worker_threads:`, err)
      }
    } else if (typeof self !== 'undefined' && self.name) {
      console.log(`SERVICE[${this.messenger}] is web worker`)
      this.setupWebWorkerListener()
    } else {
      console.error(`SERVICE[${this.messenger}] unknown worker environment.`)
    }
  }

  private setupWorkerThreadListener() {
    console.log(`SERVICE[${this.messenger}] setupWorkerThreadListener`)
    if (this.workerThreads) {
      const { parentPort } = this.workerThreads
      parentPort?.on('message', (message) => {
        console.log(`SERVICE[${this.messenger}] worker listener message:`, message)
        this.handleMessage(message as GeneralMessage<any>)
      })
    }
  }

  private setupWebWorkerListener() {
    console.log(`SERVICE[${this.messenger}] setupWebWorkerListener`)
    if (typeof self !== 'undefined' && self.addEventListener) {
      self.addEventListener('message', (event) => {
        console.log(`SERVICE[${this.messenger}] worker listener message:`, event.data)
        this.handleMessage(event.data as GeneralMessage<any>)
      })
    }
  }

  /**
   * Adds a worker to the service, associating it with the given messenger.
   * @param {Messenger} messenger The messenger identifier for the worker.
   * @param {Worker} worker The worker to be added.
   */
  public async addWorker(messenger: Messenger, worker: any) {
    const workerKey = messengerAsString(messenger)

    // If the worker or messenger is invalid, return early
    if (!messenger || !worker || !workerKey) {
      return
    }

    if (this.workerThreads) {
      console.log(`SERVICE[${this.messenger}] listening to "${messenger}" worker thread.`)

      // Create a listener to handle messages from the worker
      const workerThreadListener = (message: GeneralMessage<any>) => {
        console.log(`SERVICE[${this.messenger}] workerListener - message from worker:`, message)
        this.handleMessage(message)
      }

      worker.on('message', workerThreadListener)
      this.workerListeners.set(workerKey, workerThreadListener)
    } else {
      console.log(`SERVICE[${this.messenger}] listening to "${messenger}" web worker.`)

      // Create a listener to handle messages from the worker
      const workerListener = (event: MessageEvent) => {
        console.log(`SERVICE[${this.messenger}] workerListener - message from worker:`, event)
        console.log(`SERVICE[${this.messenger}] workerListener - message.data from worker:`, event.data)
        this.handleMessage(event.data as GeneralMessage<any>)
      }

      worker.addEventListener('message', workerListener)
      this.workerListeners.set(workerKey, workerListener)
    }

    // Store the worker and its listener in the service
    this.workers.set(workerKey, worker)
    console.log(`SERVICE[${this.messenger}] "${messenger}" worker added.`)
  }

  /**
   * Removes a worker from the service and cleans up associated resources.
   * @param {Worker} worker The worker to be removed.
   */
  public removeWorker(messenger: Messenger): void {
    const workerKey = messengerAsString(messenger)

    if (workerKey) {
      const worker = this.workers.get(workerKey)
      const workerListener = this.workerListeners.get(workerKey)

      // Remove the worker's message listener if it exists
      if (workerListener) {
        if (this.workerThreads) {
          console.log(`SERVICE[${this.messenger}] removing "${messenger}" worker thread listener.`)
          worker.off('message', workerListener)
        } else {
          console.log(`SERVICE[${this.messenger}] removing "${messenger}" web worker listener.`)
          worker.removeEventListener('message', workerListener)
        }
      }

      // Clean up the worker from the internal maps
      this.workerListeners.delete(workerKey)
      this.workers.delete(workerKey)
      console.log(`SERVICE[${this.messenger}] "${messenger}" worker removed.`)
    }
  }

  /**
   * Cleans up all workers, listeners, and response handlers.
   */
  public cleanUp(): void {
    // Remove all workers
    this.workers.forEach((worker, key) => this.removeWorker(key))

    // Clear internal maps
    this.workerListeners.clear()
    this.responseHandlers.clear()

    // Reset the message received callback
    this.messageReceivedCallback = () => {}
  }

  /**
   * Sends a message to one or more destinations (workers or upstream).
   * @param {GeneralMessage<T>} message The message to be sent.
   * @param {Worker} [worker] Optionally specify a specific worker to send the message to.
   * @returns {Promise<ResponseMessage<T> | null>} A promise that resolves with the response message, or null if no response is expected.
   */
  public async sendMessage<T>(
    message: GeneralMessage<T>,
    worker?: any
  ): Promise<ResponseMessage<T> | null> {
    await this.isInitialized

    message.source = this.messenger
    message.id = generateUUID()

    console.log(`SERVICE[${this.messenger}] send message received:`, message)

    const destinations: ((message: GeneralMessage<T>) => void)[] = []

    // Determine where to send the message (worker, upstream, or other workers)
    if (worker) {
      console.log(
        `SERVICE[${this.messenger}] sending message directly to worker "${message.destination}".`
      )
      destinations.push(worker.postMessage.bind(worker))
    } else if (messengerIsUpstream(this.messenger, message.destination)) {
      console.log(
        `SERVICE[${this.messenger}] sending message upstream to "${message.destination}":`,
        message
      )
      if (this.workerThreads) {
        if (this.workerThreads.parentPort) {
          console.log(
            `SERVICE[${this.messenger}] using parent port to send to "${message.destination}".`
          )
          destinations.push(
            this.workerThreads.parentPort.postMessage.bind(this.workerThreads.parentPort)
          )
        } else {
          console.error(
            `SERVICE[${this.messenger}] no parent port to send to "${message.destination}".`
          )
        }
      } else if (typeof self !== 'undefined' && self) {
        console.log(`SERVICE[${this.messenger}] using self to send to "${message.destination}".`)
        destinations.push(self.postMessage.bind(self))
      } else {
        console.error(
          `SERVICE[${this.messenger}] no postMessage available to send to "${message.destination}".`
        )
      }
    } else {
      console.log(`SERVICE[${this.messenger}] looking for worker "${message.destination}".`)

      this.workers.forEach((worker, key) => {
        if (message.broadcast) {
          console.log(
            `SERVICE[${this.messenger}] broadcasting message to worker "${message.destination}".`
          )
          destinations.push(worker.postMessage.bind(worker))
        } else {
          if (messengersAreEqual(message.destination, key)) {
            console.log(
              `SERVICE[${this.messenger}] sending message directly to worker "${message.destination}".`
            )
            destinations.push(worker.postMessage.bind(worker))
          }
        }
      })
    }

    // If destinations are found, send the message
    if (destinations.length > 0) {
      const sendMessagePromises = destinations.map((destination) => {
        // If the message is a request, setup the response handle
        if (message.type === MessageType.REQUEST) {
          return new Promise<ResponseMessage<T>>((resolve, reject) => {
            const responseHandler = (responseMessage: ResponseMessage<T>) => {
              console.log(
                `SERVICE[${this.messenger}] responseHandler responseMessage:`,
                responseMessage
              )
              // Resolve the promise with the correct response message
              if (responseMessage.requestId === message.id) {
                this.responseHandlers.delete(responseMessage.requestId)
                console.log(`SERVICE[${this.messenger}] responseHandler resolving`)
                resolve(responseMessage)
              } else {
                console.log(`SERVICE[${this.messenger}] responseHandler NOT RESOLVED`)
              }
            }

            this.responseHandlers.set(message.id, responseHandler)

            console.log(
              `SERVICE[${this.messenger}] postMessage for request message "${message.destination}".`,
              destination
            )
            destination(message)
          }).then((responseMessage) => {
            console.log(`SERVICE[${this.messenger}] responseHandler then:`, responseMessage)
            return responseMessage
          })
        } else {
          // If it's not a request, just send the message without expecting a response
          console.log(
            `SERVICE[${this.messenger}] postMessage for non-request message "${message.destination}".`,
            destination
          )
          destination(message)
          return Promise.resolve(null)
        }
      })

      // Await all promises and return the first valid response found
      const responses = await Promise.all(sendMessagePromises)
      return responses.find((response) => response !== null) || null
    } else {
      console.error(
        `SERVICE[${this.messenger}] unable to find worker "${message.destination}" for message:`,
        message
      )
    }

    console.log(`SERVICE[${this.messenger}] default return null for message:`, message)
    return null
  }

  /**
   * Handles an incoming message.
   * @param {GeneralMessage<any>} message The message to handle.
   */
  private handleMessage(message: GeneralMessage<any>) {
    console.log(`SERVICE[${this.messenger}] handleMessage message:`, message)
    console.log(`SERVICE[${this.messenger}] message.broadcast:`, message.broadcast)
    console.log(
      `SERVICE[${this.messenger}] areEqual():`,
      messengersAreEqual(message.destination, this.messenger)
    )
    console.log(`SERVICE[${this.messenger}] isResponse?:`, message.type === MessageType.RESPONSE)

    if (message.broadcast || messengersAreEqual(message.destination, this.messenger)) {
      console.log(`SERVICE[${this.messenger}] isBroadcast or intended destination:`, message)
      // Handle broadcast or message for this instance
      if (message.type === MessageType.RESPONSE) {
        const responseHandler = this.responseHandlers.get(
          (message as ResponseMessage<any>).requestId
        )
        if (responseHandler) {
          console.log(
            `SERVICE[${this.messenger}] calling responseHandler requestId[${
              (message as ResponseMessage<any>).requestId
            }].`
          )
          responseHandler(message as ResponseMessage<any>)
        } else {
          console.log(`SERVICE[${this.messenger}] responseHandler is not truthful.`)
        }
      } else {
        console.log(`SERVICE[${this.messenger}] NOT A Response:`, message)
        this.messageReceivedCallback(message)
      }
    } else {
      // Forward the message if it isn't for this instance
      console.log(`SERVICE[${this.messenger}] Forwarding:`, message)
      this.forwardMessage(message)
    }
  }

  /**
   * Forwards a message to its correct destination (upstream or downstream).
   * @param {GeneralMessage<any>} message The message to forward.
   */
  private forwardMessage(message: GeneralMessage<any>) {
    if (message.destination) {
      if (messengerIsUpstream(this.messenger, message.destination)) {
        console.log(`SERVICE[${this.messenger}] forwarding upstream:`, message)
        this.forwardUpstream(message)
      } else {
        console.log(`SERVICE[${this.messenger}] forwarding downstream:`, message)
        this.forwardDownstream(message)
      }
    }
  }

  /**
   * Forwards a message upstream (to the parent or higher level).
   * @param {GeneralMessage<any>} message The message to forward upstream.
   */
  private forwardUpstream(message: GeneralMessage<any>) {
    if (this.workerThreads) {
      if (this.workerThreads.parentPort) {
        console.log(`SERVICE[${this.messenger}] Forwarding Upstream as worker_threads:`, message)
        this.workerThreads.parentPort?.postMessage(message)
      } else {
        console.error(
          `SERVICE[${this.messenger}] No parentPort to postMessage for forward:`,
          message
        )
      }
    } else {
      console.log(`SERVICE[${this.messenger}] Forwarding Upstream as web worker:`, message)
      self.postMessage(message)
    }
  }

  /**
   * Forwards a message downstream (to the worker or lower level).
   * @param {GeneralMessage<any>} message The message to forward downstream.
   */
  private forwardDownstream(message: GeneralMessage<any>) {
    this.workers.forEach((worker, key) => {
      if (messengersAreEqual(message.destination, key)) {
        console.log(`SERVICE[${this.messenger}] Forwarding Downstream to worker "${key}":`, message)
        worker.postMessage(message)
      }
    })
  }
}
