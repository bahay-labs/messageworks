import { RequestMessage } from '../src/models/request-message'
import { Messenger } from '../src/types/messenger'

export class ConcreteRequestMessageMock extends RequestMessage<null> {
    constructor(destination: Messenger) {
        super('concrete-request-message-mock', destination)
    }
}
