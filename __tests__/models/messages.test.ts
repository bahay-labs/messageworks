import { GeneralMessage } from '../../src/models/general-message'
import { RequestMessage } from '../../src/models/request-message'
import { ResponseMessage } from '../../src/models/response-message'
import { MessageType } from '../../src/types/message-type'
import { Messenger } from '../../src/types/messenger'

// Concrete class for testing GeneralMessage extension
class ConcreteGeneralMessage extends GeneralMessage<null> {
  constructor(name: string, destination: Messenger) {
    super(name, destination)
  }

  public setBroadcast(broadcast: boolean) {
    this.broadcast = broadcast
  }
}

// Concrete class for testing RequestMessage extension
class ConcreteRequestMessage extends RequestMessage<any> {
  constructor(name: string, destination: Messenger, data?: any) {
    super(name, destination, data)
  }

  public setCustomData(customData: string) {
    this.data = { custom: customData }
  }
}

// Concrete class for testing ResponseMessage extension
class ConcreteResponseMessage extends ResponseMessage<any> {
  constructor(name: string, request: RequestMessage<any>, data?: any) {
    super(name, request, data)
  }

  public setRequestId(id: any) {
    this.requestId = id
  }
}

describe('GeneralMessage, RequestMessage, and ResponseMessage with Extensions', () => {
  // Test GeneralMessage extension functionality
  describe('GeneralMessage Extension', () => {
    it('should allow extension and customization of GeneralMessage', () => {
      const destination: Messenger = ['destination']
      const concreteMessage = new ConcreteGeneralMessage('TestMessage', destination)

      concreteMessage.setBroadcast(true)

      expect(concreteMessage.broadcast).toBe(true)
      expect(concreteMessage.name).toBe('TestMessage')
      expect(concreteMessage.destination).toEqual(['destination'])
    })

    it('should have access to all GeneralMessage getters', () => {
      const destination: Messenger = ['destination']
      const concreteMessage = new ConcreteGeneralMessage('TestMessage', destination)

      expect(concreteMessage.type).toBe(MessageType.GENERAL)
      expect(concreteMessage.source).toEqual([])
    })
  })

  // Test RequestMessage extension functionality
  describe('RequestMessage Extension', () => {
    it('should allow extension and customization of RequestMessage', () => {
      const destination: Messenger = ['system', 'destination']
      const concreteRequest = new ConcreteRequestMessage('RequestMessage', destination)

      concreteRequest.setCustomData('customData')

      expect(concreteRequest.type).toBe(MessageType.REQUEST)
      expect(concreteRequest.data).toEqual({ custom: 'customData' })
      expect(concreteRequest.destination).toEqual(['system', 'destination'])
    })

    it('should have access to all RequestMessage methods', () => {
      const destination: Messenger = ['destination']
      const concreteRequest = new ConcreteRequestMessage('RequestMessage', destination)

      expect(concreteRequest.type).toBe(MessageType.REQUEST)
      expect(concreteRequest.name).toBe('RequestMessage')
    })
  })

  // Test ResponseMessage extension functionality
  describe('ResponseMessage Extension', () => {
    it('should allow extension and customization of ResponseMessage', () => {
      const destination: Messenger = ['destination']
      const requestMessage = new ConcreteRequestMessage('RequestMessage', destination)
      const concreteResponse = new ConcreteResponseMessage('ResponseMessage', requestMessage)

      concreteResponse.setRequestId('customRequestId')

      expect(concreteResponse.type).toBe(MessageType.RESPONSE)
      expect(concreteResponse.requestId).toBe('customRequestId')
      expect(concreteResponse.source).toEqual(requestMessage.source)
    })

    it('should allow overriding of base class methods', () => {
      const destination: Messenger = ['destination']
      const requestMessage = new ConcreteRequestMessage('RequestMessage', destination)
      const concreteResponse = new ConcreteResponseMessage('ResponseMessage', requestMessage)

      concreteResponse.setRequestId('newRequestId')

      expect(concreteResponse.requestId).toBe('newRequestId')
      expect(concreteResponse.source).toEqual(requestMessage.source)
    })
  })

  // Test edge cases
  describe('Edge Cases for Extended Messages', () => {
    it('should handle missing data in extended GeneralMessage', () => {
      const destination: Messenger = ['destination']
      const concreteMessage = new ConcreteGeneralMessage('TestMessage', destination)

      expect(concreteMessage.data).toBeUndefined()
    })

    it('should handle malformed messenger types in extended classes', () => {
      const concreteRequest = new ConcreteRequestMessage('RequestMessage', 'destination' as any)
      expect(concreteRequest.destination).toEqual('destination')
    })

    it('should handle extended ResponseMessage with empty or malformed data', () => {
      const destination: Messenger = ['destination']
      const requestMessage = new ConcreteRequestMessage('RequestMessage', destination)
      const concreteResponse = new ConcreteResponseMessage('ResponseMessage', requestMessage, null)

      expect(concreteResponse.data).toBeNull()
    })
  })
})
