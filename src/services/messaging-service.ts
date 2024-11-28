import { UUIDTypes, v4 as generateUUID } from 'uuid'
import { MessageType } from '../types/message-type'
import { Messenger } from '../types/messenger'
import { GeneralMessage } from '../models/general-message'
import { ResponseMessage } from '../models/response-message'
import {
  messengerAsString,
  messengersAreEqual,
  messengerIsUpstream,
  messengerAsArray,
} from '../utils'

/**
 * A service for handling messaging between different workers and instances.
 * It provides functionality to send messages, handle responses, and manage workers.
 */
export class MessagingService {
  private static instance: MessagingService | null = null
  private static instancePromise: Promise<MessagingService> | null = null

  private workerThreads: typeof import('worker_threads') | undefined = undefined

  private messenger: Messenger
  public messageReceivedCallback: (message: GeneralMessage<any>) => void = (
    message: GeneralMessage<any>
  ) => {}

  private workers: Map<string, any> = new Map()
  private workerListeners: Map<string, (message: any) => void> = new Map()

  private responseHandlers: Map<UUIDTypes, (message: ResponseMessage<any>) => void> = new Map()

  /**
   * Creates an instance of the MessagingService.
   * @param {Messenger} messenger The messenger identifier for this instance.
   * @param {Function} messageReceivedCallback Callback function to handle received messages.
   */
  private constructor(messenger: Messenger) {
    this.messenger = messenger
  }

  public static async getInstance(): Promise<MessagingService> {
    if (!MessagingService.instance) {
      MessagingService.instancePromise = new Promise(async (resolve, reject) => {
        try {
          if (typeof process !== 'undefined' && process.versions && process.versions.node) {
            try {
              const workerThreadsModule = await import('worker_threads')
              const { isMainThread, workerData } = workerThreadsModule

              let messenger: Messenger = '/'

              if (!isMainThread) {
                console.log(`SERVICE[${workerData.name}] Using workerData.name for messenger.`)
                messenger = workerData.name
              }

              MessagingService.instance = new MessagingService(messenger)
              MessagingService.instance.workerThreads = workerThreadsModule

              if (!isMainThread) {
                MessagingService.instance.setupWorkerThreadListener()
              }

              console.log(`SERVICE[${messenger}] Is Worker Threads.`)
            } catch (err) {
              console.error(`SERVICE[???] Failed to import worker_threads:`, err)
              throw err
            }
          } else if (typeof self !== 'undefined') {
            let messenger: Messenger = '/'

            if (typeof window === 'undefined') {
              console.log(`SERVICE[${self.name}] Using self.name for messenger.`)
              messenger = self.name
            }

            MessagingService.instance = new MessagingService(messenger)

            if (typeof window === 'undefined') {
              MessagingService.instance.setupWebWorkerListener()
            }

            console.log(`SERVICE[${messenger}] Is Web Worker.`)
          } else {
            console.error(`SERVICE[???] Unknown worker environment.`)
            throw new Error(`SERVICE[???] Unknown worker environment.`)
          }

          console.log(
            `SERVICE[${MessagingService.instance.messenger}] MessagingService initialized.`
          )
          resolve(MessagingService.instance)
        } catch (err) {
          console.error(`SERVICE[???] Unable to create instance:`, err)
          reject(err)
        }
      })
    }

    return MessagingService.instancePromise!
  }

  private setupWorkerThreadListener() {
    console.log(`SERVICE[${this.messenger}] Setting up Worker Thread Listener.`)
    if (this.workerThreads) {
      if (!this.workerThreads.isMainThread) {
        this.workerThreads.parentPort?.on('message', (message) => {
          this.handleMessage(message as GeneralMessage<any>)
        })
      }
    }
  }

  private setupWebWorkerListener() {
    console.log(`SERVICE[${this.messenger}] Setting up Web Worker Listener.`)
    if (typeof self !== 'undefined' && self.addEventListener) {
      self.addEventListener('message', (event) => {
        this.handleMessage(event.data as GeneralMessage<any>)
      })
    }
  }

  /**
   * Adds a worker to the service, associating it with the given messenger.
   * @param {Messenger} messenger The messenger identifier for the worker.
   * @param {Worker} worker The worker to be added.
   */
  public addWorker(name: string, worker: any) {
    // If the worker or messenger is invalid, return early
    if (!name || !worker) {
      console.error(`SERVICE[${this.messenger}] Unable to add worker "${name}".`)
      return
    }

    const workerKey = this.getWorkerKey(name)

    if (this.workerThreads) {
      const workerListener = (message: GeneralMessage<any>) => {
        console.log(`SERVICE[${this.messenger}] Message received from worker:`, message)
        this.handleMessage(message)
      }
      worker.on('message', workerListener)
      this.workerListeners.set(workerKey, workerListener)
    } else {
      const workerListener = (event: MessageEvent) => {
        console.log(`SERVICE[${this.messenger}] Message received from worker:`, event.data)
        this.handleMessage(event.data as GeneralMessage<any>)
      }
      worker.addEventListener('message', workerListener)
      this.workerListeners.set(workerKey, workerListener)
    }

    this.workers.set(workerKey, worker)

    console.log(`SERVICE[${this.messenger}] Added worker "${name}".`)
  }

  /**
   * Removes a worker from the service and cleans up associated resources.
   * @param {Worker} worker The worker to be removed.
   */
  public removeWorker(name: string): void {
    const workerKey = this.getWorkerKey(name)
    const worker = this.workers.get(workerKey)
    const workerListener = this.workerListeners.get(workerKey)

    if (workerListener) {
      if (this.workerThreads) {
        worker.off('message', workerListener)
      } else {
        worker.removeEventListener('message', workerListener)
      }

      this.workerListeners.delete(workerKey)
      this.workers.delete(workerKey)
      console.log(`SERVICE[${this.messenger}] Removed worker "${name}".`)
    }
  }

  /**
   * Cleans up all workers, listeners, and response handlers.
   */
  public cleanUp(): void {
    this.workers.forEach((worker, key) => this.removeWorker(key))
    this.workerListeners.clear()
    this.responseHandlers.clear()
    this.messageReceivedCallback = () => {}
  }

  /**
   * Sends a message to one or more destinations (workers or upstream).
   * @param {GeneralMessage<T>} message The message to be sent.
   * @param {Worker} [worker] Optionally specify a specific worker to send the message to.
   * @returns {Promise<ResponseMessage<T> | null>} A promise that resolves with the response message, or null if no response is expected.
   */
  public async sendMessage<T, V>(
    message: GeneralMessage<T>,
    worker?: any
  ): Promise<ResponseMessage<V> | null> {
    message.source = this.messenger
    message.id = generateUUID()

    const destinations: ((message: GeneralMessage<T>) => void)[] = []

    if (worker) {
      console.log(
        `SERVICE[${this.messenger}] Sending message directly to worker "${message.destination}".`
      )
      destinations.push(worker.postMessage.bind(worker))
    } else if (messengerIsUpstream(this.messenger, message.destination)) {
      console.log(
        `SERVICE[${this.messenger}] Sending message upstream to "${message.destination}".`
      )
      if (this.workerThreads) {
        if (this.workerThreads.parentPort) {
          console.log(
            `SERVICE[${this.messenger}] Using parentPort to send to "${message.destination}".`
          )
          destinations.push(
            this.workerThreads.parentPort.postMessage.bind(this.workerThreads.parentPort)
          )
        } else {
          console.error(
            `SERVICE[${this.messenger}] No parentPort to send to "${message.destination}".`
          )
        }
      } else if (typeof self !== 'undefined' && self) {
        console.log(`SERVICE[${this.messenger}] Using self to send to "${message.destination}".`)
        destinations.push(self.postMessage.bind(self))
      } else {
        console.error(
          `SERVICE[${this.messenger}] No postMessage available to send to "${message.destination}".`
        )
      }
    } else {
      console.log(
        `SERVICE[${this.messenger}] Sending message downstream to "${message.destination}".`
      )
      const here = messengerAsArray(this.messenger)
      const there = messengerAsArray(message.destination)
      const nextHop = there.slice(0, here.length + 1)
      this.workers.forEach((worker, key) => {
        if (message.broadcast) {
          console.log(`SERVICE[${this.messenger}] Broadcasting message to worker "${key}".`)
          destinations.push(worker.postMessage.bind(worker))
        } else {
          if (messengersAreEqual(message.destination, key)) {
            console.log(`SERVICE[${this.messenger}] Sending message directly to worker "${key}".`)
            destinations.push(worker.postMessage.bind(worker))
          } else if (messengersAreEqual(nextHop, key)) {
            console.log(`SERVICE[${this.messenger}] Sending message indirectly to worker "${key}" through next hop "${messengerAsString(nextHop)}".`)
            destinations.push(worker.postMessage.bind(worker))
          }
        }
      })
    }

    if (destinations.length > 0) {
      const sendMessagePromises = destinations.map((destination) => {
        // If the message is a request, setup the response handle
        if (message.type === MessageType.REQUEST) {
          return new Promise<ResponseMessage<V>>((resolve, reject) => {
            const responseHandler = (responseMessage: ResponseMessage<V>) => {
              console.log(`SERVICE[${this.messenger}] Response message received:`, responseMessage)
              // Resolve the promise with the correct response message
              if (responseMessage.requestId === message.id) {
                this.responseHandlers.delete(responseMessage.requestId)
                resolve(responseMessage)
              }
            }

            this.responseHandlers.set(message.id, responseHandler)

            destination(message)
          }).then((responseMessage) => {
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
    } else {
      console.error(
        `SERVICE[${this.messenger}] Unable to find worker "${message.destination}" for message:`,
        message
      )
    }

    return null
  }

  /**
   * Handles an incoming message.
   * @param {GeneralMessage<any>} message The message to handle.
   */
  private handleMessage(message: GeneralMessage<any>) {
    // TODO: Broadcast Message Handling
    if (message.broadcast || messengersAreEqual(message.destination, this.messenger)) {
      if (message.type === MessageType.RESPONSE) {
        const responseMessage = message as ResponseMessage<any>
        const responseHandler = this.responseHandlers.get(responseMessage.requestId)

        if (responseHandler) {
          console.log(
            `SERVICE[${this.messenger}] Calling response handler for requestId:`,
            responseMessage.requestId
          )
          responseHandler(responseMessage)
        } else {
          console.log(
            `SERVICE[${this.messenger}] No response handler for requestId:`,
            responseMessage.requestId
          )
        }

        this.responseHandlers.delete(responseMessage.requestId)
      } else {
        this.messageReceivedCallback(message)
      }
    } else {
      console.log(`SERVICE[${this.messenger}] Forwarding message:`, message)
      this.forwardMessage(message)
    }
  }

  /**
   * Forwards a message to its correct destination (upstream or downstream).
   * @param {GeneralMessage<any>} message The message to forward.
   */
  private forwardMessage(message: GeneralMessage<any>) {
    if (messengerIsUpstream(this.messenger, message.destination)) {
      console.log(`SERVICE[${this.messenger}] Forwarding message upstream:`, message)
      this.forwardUpstream(message)
    } else if (messengersAreEqual(this.messenger, message.destination)) {
      console.log(
        `SERVICE[${this.messenger}] Forwarding message to message received callback:`,
        message
      )
      this.messageReceivedCallback(message)
    } else {
      console.log(`SERVICE[${this.messenger}] Forwarding message downstream:`, message)
      this.forwardDownstream(message)
    }
  }

  /**
   * Forwards a message upstream (to the parent or higher level).
   * @param {GeneralMessage<any>} message The message to forward upstream.
   */
  private forwardUpstream(message: GeneralMessage<any>) {
    if (this.workerThreads) {
      if (this.workerThreads.parentPort) {
        console.log(`SERVICE[${this.messenger}] Forwarding upstream as worker_threads.`)
        this.workerThreads.parentPort?.postMessage(message)
      } else {
        console.error(
          `SERVICE[${this.messenger}] No upstream parentPort to forward message:`,
          message
        )
      }
    } else {
      console.log(`SERVICE[${this.messenger}] Forwarding upstream as web worker.`)
      self.postMessage(message)
    }
  }

  /**
   * Forwards a message downstream (to the worker or lower level).
   * @param {GeneralMessage<any>} message The message to forward downstream.
   */
  private forwardDownstream(message: GeneralMessage<any>) {
    const here = messengerAsArray(this.messenger) // [w] = 1 vs [w,s,i]
    const next = messengerAsArray(message.destination).slice(0, here.length + 1)

    console.log(`SERVICE[${this.messenger}] Forward downstream here:`, here)
    console.log(`SERVICE[${this.messenger}] Forward downstream next:`, next)

    this.workers.forEach((worker, key) => {
      console.log(`SERVICE[${this.messenger}] Forward downstream key:`, messengerAsArray(key))
      if (messengersAreEqual(message.destination, key)) {
        console.log(`SERVICE[${this.messenger}] Forwarding downstream to worker "${key}".`)
        worker.postMessage(message)
      } else if (messengersAreEqual(next, key)) {
        console.log(`SERVICE[${this.messenger}] Forwarding downstream to next worker "${key}".`)
        worker.postMessage(message)
      }
    })
  }

  private getWorkerKey(name: string) {
    const workerMessenger = messengerAsArray(this.messenger)
    workerMessenger.push(name)
    return messengerAsString(workerMessenger)
  }
}
