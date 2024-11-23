import { ResponseMessage } from '../src/models/response-message'
import { PayloadDataMock } from './payload-data-mock'

export class ConcreteResponseMessageMock extends ResponseMessage<PayloadDataMock> {
  constructor(request: ConcreteResponseMessageMock) {
    super('concrete-response-message-mock', request, { mockData: 'Mock Response Message' })
  }
}
