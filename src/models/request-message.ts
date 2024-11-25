import { GeneralMessage } from './general-message'
import { MessageType } from '../types/message-type'
import { Messenger } from '../types/messenger'

/**
 * Represents a request message in the messaging system.
 * This class extends the GeneralMessage class and overrides the message type to `REQUEST`.
 *
 * @template T The type of data this request message may contain. This is typically used for passing data in the request.
 */
export abstract class RequestMessage<T> extends GeneralMessage<T> {
  /**
   * Creates an instance of the RequestMessage.
   *
   * This constructor sets the message type to `REQUEST` and passes the name, destination, and optional data
   * to the parent class `GeneralMessage` constructor.
   *
   * @param name The name of the request message, typically identifying the purpose of the request.
   * @param destination The destination(s) for the request, typically an address or a set of addresses.
   * @param data Optional data that the request message may contain.
   */
  constructor(name: string, destination: Messenger, data?: T) {
    super(name, destination, data)
    this._type = MessageType.REQUEST
  }
}
