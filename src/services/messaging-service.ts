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
  private workerListeners: Map<string, (event: MessageEvent) => void> = new Map()
  private responseHandlers: Map<UUIDTypes, (message: ResponseMessage<any>) => void> = new Map()
  private messageReceivedCallback: (message: GeneralMessage<any>) => void
  private workerThreads: typeof import('worker_threads') | undefined = undefined

  /**
   * Creates an instance of the MessagingService.
   * @param {Messenger} messenger The messenger identifier for this instance.
   * @param {Function} messageReceivedCallback Callback function to handle received messages.
   */
  constructor(
    messenger: Messenger,
    messageReceivedCallback: (message: GeneralMessage<any>) => void = () => {}
  ) {
    this.messenger = messenger
    this.messageReceivedCallback = messageReceivedCallback

    // Conditionally import worker_threads for Node.js environments
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      import('worker_threads')
        .then((module) => {
          this.workerThreads = module
          if (!this.workerThreads?.isMainThread) {
            this.setupWorkerThreadListener()
          }
        })
        .catch((err) => {
          console.error(`SERVICE[${this.messenger}] Failed to load worker_threads:`, err)
        })
    } else {
      // Browser or Web Worker environment logic
      this.setupWebWorkerListener()
    }
  }

  private setupWorkerThreadListener() {
    console.log(`SERVICE[${this.messenger}] setupWorkerThreadListener`)
    if (this.workerThreads) {
      const { parentPort } = this.workerThreads
      parentPort?.on('message', (message: GeneralMessage<any>) => {
        this.handleMessage(message)
      })
    }
  }

  private setupWebWorkerListener() {
    console.log(`SERVICE[${this.messenger}] setupWebWorkerListener`)
    if (typeof self !== 'undefined' && self.addEventListener) {
      self.addEventListener('message', (event) => {
        this.handleMessage(event.data)
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

    // Create a listener to handle messages from the worker
    const workerListener = (event: MessageEvent) => {
      console.log(`SERVICE[${this.messenger}] workerListener - message from worker:`, event)
      const message: GeneralMessage<any> = event.data
      this.handleMessage(message)
    }

    if (this.workerThreads) {
      const { parentPort } = worker
      if (parentPort) {
        parentPort?.on('message', workerListener)
      } else {
        console.error(`SERVICE[${this.messenger}] "${messenger}".parentPort is invalid.`)
      }
    } else {
      // Add the listener to the web worker
      worker.addEventListener('message', workerListener)
    }

    // Store the worker and its listener in the service
    this.workers.set(workerKey, worker)
    this.workerListeners.set(workerKey, workerListener)
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
        if (isWorkerThreads()) {
          if (this.workerThreads) {
            const { parentPort } = worker
            parentPort?.off('message', workerListener)
          }
        } else {
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
    const destinations: ((message: GeneralMessage<T>) => void)[] = []

    // Determine where to send the message (worker, upstream, or other workers)
    if (worker) {
      destinations.push(worker.postMessage.bind(worker))
    } else if (messengerIsUpstream(this.messenger, message.destination)) {
      destinations.push(postMessage.bind(this))
    } else {
      this.workers.forEach((worker, key) => {
        if (message.broadcast) {
          destinations.push(worker.postMessage.bind(worker))
        } else {
          if (messengersAreEqual(message.destination, key)) {
            destinations.push(worker.postMessage.bind(worker))
          }
        }
      })
    }

    // If destinations are found, send the message
    if (destinations.length > 0) {
      const sendMessagePromises = destinations.map((destination) => {
        message.source = this.messenger
        message.id = generateUUID()

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
            destination(message)
          }).then((responseMessage) => {
            console.log(`SERVICE[${this.messenger}] responseHandler then:`, responseMessage)
            return responseMessage
          })
        } else {
          // If it's not a request, just send the message without expecting a response
          destination(message)
          return Promise.resolve(null)
        }
      })

      // Await all promises and return the first valid response found
      const responses = await Promise.all(sendMessagePromises)
      return responses.find((response) => response !== null) || null
    }

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
        this.forwardUpstream(message)
      } else {
        this.forwardDownstream(message)
      }
    }
  }

  /**
   * Forwards a message upstream (to the parent or higher level).
   * @param {GeneralMessage<any>} message The message to forward upstream.
   */
  private forwardUpstream(message: GeneralMessage<any>) {
    if (isWorkerThreads()) {
      // In Worker Threads, use `parentPort.postMessage`
      if (this.workerThreads?.parentPort) {
        this.workerThreads.parentPort.postMessage(message)
      }
    } else {
      // In Web Workers, use `self.postMessage`
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
        if (isWorkerThreads()) {
          // For Worker Threads, use `worker.parentPort.postMessage`
          const { parentPort } = worker
          if (parentPort) {
            parentPort.postMessage(message)
          }
        } else {
          // For Web Workers, use `worker.postMessage`
          worker.postMessage(message)
        }
      }
    })
  }
}
