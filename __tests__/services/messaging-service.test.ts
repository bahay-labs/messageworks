import { MessagingService } from '../../src/services'
import { GeneralMessage } from '../../src/models/general-message'
import { ResponseMessage } from '../../src/models/response-message'
import { RequestMessage } from '../../src/models/request-message'
import { ExtendedGeneralMessageMock } from '../../__mocks__/extended-general-message-mock'
import { ConcreteRequestMessageMock } from '../../__mocks__/concrete-request-message-mock'
import { ConcreteResponseMessageMock } from '../../__mocks__/concrete-response-message-mock'
import { MessageType } from '../../src/types/message-type'
import { Messenger } from '../../src/types/messenger'

import { WorkerMock } from '../../__mocks__/worker-mock'

function createEchoWorkerScript(workerMessenger: string): string {
  return `
    onmessage = e => {
      console.log('[WORKER-SCRIPT] onmessage e.data:', e.data);
      let message = e.data;

      // Modify the message
      message._name = 'worker-changed-' + message.name;
      message._destination = message.source;
      message._source = '${workerMessenger}';

      // Send the modified message back
      postMessage(message);
    };
  `
}

function createResponseWorkerScript(workerMessenger: string): string {
  return `
    onmessage = e => {
      console.log('[WORKER-SCRIPT] onmessage e.data:', e.data);
      let request = e.data;

      // Create the response directly using the ConcreteResponseMessageMock
      let response = new ConcreteResponseMessageMock(request);

      // Override properties for the response
      response._id = 'worker-uuid';
      response._source = '${workerMessenger}';

      // Send the modified message back
      postMessage(response);
    };
  `
}

function createErrorWorkerScript(workerMessenger: string): string {
  return `
    onmessage = e => {
      console.log('[WORKER-SCRIPT] onmessage e.data:', e.data);
      let request = e.data;

      let response = new ConcreteResponseMessageMock(request, '${workerMessenger}');

      // Send the modified message back
      postMessage(response);
    };
  `
}

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}))

describe('MessagingService', () => {
  let rootMessenger: Messenger = ['root']

  it('should create an instance with the given messenger', () => {
    const rootMessagingService = new MessagingService(rootMessenger)
    expect(rootMessagingService).toBeInstanceOf(MessagingService)
    expect(rootMessagingService['messenger']).toBe(rootMessenger)
  })

  it('should add a worker and set the listener', async () => {
    const workerMessenger = '/root/echo-worker'
    const workerScript = createEchoWorkerScript(workerMessenger)
    const worker = new WorkerMock(URL.createObjectURL(new Blob([workerScript])))

    let rootCallback = (message: GeneralMessage<any>) => {}

    const callbackPromise = new Promise<void>((resolve) => {
      rootCallback = jest.fn((message: GeneralMessage<any>) => {
        console.log('[TEST] Message received in root callback:', message)
        resolve()
      })
    })

    const rootMessagingService = new MessagingService(rootMessenger, rootCallback)

    // Add the worker to the service
    rootMessagingService.addWorker(workerMessenger, worker)

    // Verify worker is added
    expect(rootMessagingService['workers'].size).toBe(1)

    // Simulate worker sending a message
    const testMessage = new GeneralMessage('general-message', workerMessenger)

    // Mock the message event
    rootMessagingService.sendMessage(testMessage)

    // wait for the callback to resolve
    await callbackPromise

    // Assert that the messageReceivedCallback was called
    expect(rootCallback).toHaveBeenCalled()
  })

  it('should remove a worker and its listener', () => {
    const workerMessenger = '/root/echo-worker'
    const workerScript = createEchoWorkerScript(workerMessenger)
    const worker = new WorkerMock(URL.createObjectURL(new Blob([workerScript])))

    // Add and then remove the worker
    const messagingService = new MessagingService(rootMessenger)
    messagingService.addWorker(workerMessenger, worker)
    messagingService.removeWorker(workerMessenger)

    // Verify worker is removed
    expect(messagingService['workers'].size).toBe(0)
  })

  it('should send a message and handle responses', async () => {
    const workerMessenger = '/root/echo-worker'
    const workerScript = createResponseWorkerScript(workerMessenger)
    const worker = new WorkerMock(URL.createObjectURL(new Blob([workerScript])))

    const rootCallback = jest.fn((message: GeneralMessage<any>) => {
      console.log('[TEST] Message received in root callback:', message)
    })

    const messagingService = new MessagingService(rootMessenger, rootCallback)

    messagingService.addWorker(workerMessenger, worker)

    // Mock the worker to simulate sending a response
    const request = new ConcreteRequestMessageMock(workerMessenger)

    // Send the message and check the response
    const response = await messagingService.sendMessage(request)

    console.log('[TEST] response:', response)

    expect(response ? response['_requestId'] : null).toBe('mock-uuid')
    expect(rootCallback).not.toHaveBeenCalled()
  })

  it('should handle invalid worker removal gracefully', () => {
    const workerMessenger = '/root/echo-worker'
    const workerScript = createResponseWorkerScript(workerMessenger)
    const worker = new WorkerMock(URL.createObjectURL(new Blob([workerScript])))

    const messagingService = new MessagingService(rootMessenger)

    // Add worker and try removing it
    messagingService.addWorker(workerMessenger, worker)
    messagingService.removeWorker(workerMessenger)

    // Attempt to remove the same worker again (should not throw or cause issues)
    expect(() => messagingService.removeWorker(workerMessenger)).not.toThrow()
  })
})
