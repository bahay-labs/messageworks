import { MessageType } from '../types/message-type'
import { Messenger } from '../types/messenger'

/**
 * Represents a general message in the messaging system.
 * This class can be extended to create more specific types of messages (e.g., start, stop, status).
 *
 * @template T The type of data that this message may contain. Can be any type or undefined if no data is provided.
 */
export class GeneralMessage<T> {
  /**
   * The unique identifier for this message. This will be set automatically in MessagingService.sendMessage().
   * @type {any}
   */
  public id: any

  /**
   * The name of the message, typically used to identify the message type or purpose (e.g. start-process, stop-process).
   * @type {string}
   */
  public name: string

  /**
   * The type of the message (e.g., GENERAL, REQUEST, RESPONSE). Default is GENERAL.
   * @type {MessageType}
   */
  public type: MessageType = MessageType.GENERAL

  /**
   * A flag indicating whether the message is a broadcast message.
   * @type {boolean}
   */
  public broadcast: boolean = false

  /**
   * The source of the message, usually represented as a path or address. This will be set automatically by MessagingService.sendMessage().
   * @type {Messenger}
   */
  public source: Messenger = []

  /**
   * The destination of the message. This can be in '/system/middleware/destination' or ['system', 'middleware', 'destination'] format.
   * @type {Messenger}
   */
  public destination: Messenger

  /**
   * Optional data associated with the message.
   * @type {T | undefined}
   */
  public data?: T

  /**
   * Creates an instance of the GeneralMessage.
   *
   * @param name The name of the message.
   * @param destination The destination of the message (can be in string or string[] format).
   * @param data Optional data that the message may contain.
   */
  constructor(name: string, destination: Messenger, data?: T) {
    this.name = name
    this.destination = destination
    this.data = data
  }
}
