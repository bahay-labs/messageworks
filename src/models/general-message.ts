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
  protected _id: any

  /**
   * The name of the message, typically used to identify the message type or purpose (e.g. start-process, stop-process).
   * @type {string}
   */
  protected _name: string

  /**
   * The type of the message (e.g., GENERAL, REQUEST, RESPONSE). Default is GENERAL.
   * @type {MessageType}
   */
  protected _type: MessageType = MessageType.GENERAL

  /**
   * A flag indicating whether the message is a broadcast message.
   * @type {boolean}
   */
  protected _broadcast: boolean = false

  /**
   * The source of the message, usually represented as a path or address. This will be set automatically by MessagingService.sendMessage().
   * @type {Messenger}
   */
  protected _source: Messenger = []

  /**
   * The destination of the message. This can be in '/system/middleware/destination' or ['system', 'middleware', 'destination'] format.
   * @type {Messenger}
   */
  protected _destination: Messenger

  /**
   * Optional data associated with the message.
   * @type {T | undefined}
   */
  protected _data?: T

  /**
   * Creates an instance of the GeneralMessage.
   * 
   * @param name The name of the message.
   * @param destination The destination of the message (can be in string or string[] format).
   * @param data Optional data that the message may contain.
   */
  constructor(name: string, destination: Messenger, data?: T) {
    this._name = name
    this._destination = destination
    this._data = data
  }

  /**
   * Gets the unique identifier of the message.
   * 
   * @returns {any} The unique identifier for this message.
   */
  public get id(): any {
    return this._id
  }

  /**
   * Sets the unique identifier for the message.
   * 
   * @param id The unique identifier to be set for this message.
   */
  public set id(id: any) {
    this._id = id
  }

  /**
   * Gets the name of the message.
   * 
   * @returns {string} The name of the message.
   */
  public get name(): string {
    return this._name
  }

  /**
   * Gets the type of the message (e.g., GENERAL, REQUEST, RESPONSE).
   * 
   * @returns {MessageType} The type of the message.
   */
  public get type(): MessageType {
    return this._type
  }

  /**
   * Gets whether the message is a broadcast message.
   * 
   * @returns {boolean} True if the message is a broadcast, false otherwise.
   */
  public get broadcast(): boolean {
    return this._broadcast
  }

  /**
   * Gets the source of the message.
   * 
   * @returns {Messenger} The source of the message.
   */
  public get source(): Messenger {
    return this._source
  }

  /**
   * Sets the source of the message.
   * 
   * @param source The source to be set for this message.
   */
  public set source(source: Messenger) {
    this._source = source
  }

  /**
   * Gets the destination of the message.
   * 
   * @returns {Messenger} The destination of the message.
   */
  public get destination(): Messenger {
    return this._destination
  }

  /**
   * Sets the destination of the message.
   * 
   * @param destination The destination to be set for this message.
   */
  public set destination(destination: Messenger) {
    this._destination = destination
  }

  /**
   * Gets the data associated with the message.
   * 
   * @returns {T | undefined} The data of the message, or undefined if no data is present.
   */
  public get data(): T | undefined {
    return this._data
  }

  /**
   * Sets the data associated with the message.
   * 
   * @param data The data to be set for this message.
   */
  public set data(data: T) {
    this._data = data
  }
}
