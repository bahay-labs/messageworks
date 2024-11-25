import { GeneralMessage } from './general-message'
import { RequestMessage } from './request-message'
import { MessageType } from '../types/message-type'

/**
 * Represents a response message in the messaging system.
 * This class extends the GeneralMessage class and overrides the message type to `RESPONSE`.
 *
 * It is typically used as a reply to a `RequestMessage`, containing the result or information
 * in response to the request. This class includes a `requestId` that references the original
 * request message to correlate the response.
 *
 * @template T The type of data this response message may contain. This is typically used for passing data
 *              related to the response (such as success, failure, or result data).
 */
export abstract class ResponseMessage<T> extends GeneralMessage<T> {
  /**
   * The ID of the original request this response is related to.
   * This property is used to link the response back to the originating request message.
   *
   * @protected
   */
  protected _requestId: any

  /**
   * Creates an instance of the ResponseMessage.
   *
   * This constructor sets the message type to `RESPONSE`, assigns the `requestId` from the incoming request,
   * and passes the source of the request (to be used as the destination in the response) and optional data
   * to the parent class `GeneralMessage`.
   *
   * @param name The name of the response message, typically identifying the purpose of the response.
   * @param request The original request message to which this is responding. The `requestId` and `source`
   *                are extracted from this request.
   * @param data Optional data that the response message may contain (e.g., result, success/failure data).
   */
  constructor(name: string, request: RequestMessage<any>, data?: T) {
    super(name, request.source, data)
    this._type = MessageType.RESPONSE
    this._requestId = request.id
  }

  /**
   * Returns the ID of the original request message that this response is related to.
   *
   * @returns The request ID associated with the original request message.
   */
  public get requestId(): any {
    return this._requestId
  }
}
