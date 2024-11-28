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
import { messengerAsString } from '../../src/utils/messenger-utils'

import { Worker } from 'worker_threads'

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
  it('should get an instance', async () => {
    const messagingService = await MessagingService.getInstance()
    expect(messagingService).toBeInstanceOf(MessagingService)
    expect(messengerAsString(messagingService['messenger'])).toBe('/')
  })

  it('should add a worker and set the listener', async () => {
    const workerMessenger = '/echo'
    const worker = new Worker('./__mocks__/echo-worker.js', {
      workerData: { name: workerMessenger },
    })

    let rootCallback = (message: GeneralMessage<any>) => {}

    const callbackPromise = new Promise<void>((resolve) => {
      rootCallback = jest.fn((message: GeneralMessage<any>) => {
        console.log('[TEST] Message received in root callback:', message)
        resolve()
      })
    })

    const rootMessagingService = await MessagingService.getInstance()
    expect(rootMessagingService).toBeInstanceOf(MessagingService)

    rootMessagingService.messageReceivedCallback = rootCallback

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

    // cleanup worker
    worker.terminate()
  })

  
  it('should remove a worker and its listener', async () => {
    const workerMessenger = '/echo'
    const worker = new Worker('./__mocks__/echo-worker.js', {
      workerData: { name: workerMessenger },
    })

    // Add and then remove the worker
    const messagingService = await MessagingService.getInstance()
    expect(messagingService).toBeInstanceOf(MessagingService)

    messagingService.addWorker(workerMessenger, worker)
    expect(messagingService['workers'].size).toBe(1)

    messagingService.removeWorker(workerMessenger)

    // Verify worker is removed
    expect(messagingService['workers'].size).toBe(0)

    // cleanup worker
    worker.terminate()
  })

  it('should send a message and handle responses', async () => {
    const workerMessenger = '/root/response-worker'
    const worker = new Worker('./__mocks__/response-worker.js', {
      workerData: { name: workerMessenger },
    })

    const rootCallback = jest.fn((message: GeneralMessage<any>) => {
      console.log('[TEST] Message received in root callback:', message)
    })

    const messagingService = await MessagingService.getInstance()
    messagingService.messageReceivedCallback = rootCallback

    messagingService.addWorker(workerMessenger, worker)

    // Mock the worker to simulate sending a response
    const request = new ConcreteRequestMessageMock(workerMessenger)

    // Send the message and check the response
    const response = await messagingService.sendMessage(request)

    console.log('[TEST] response:', response)

    expect(response ? response['requestId'] : null).toBe('mock-uuid')
    expect(rootCallback).not.toHaveBeenCalled()

    // clean up worker
    worker.terminate()
  })

  it('should handle invalid worker removal gracefully', async () => {
    const workerMessenger = '/echo'
    const worker = new Worker('./__mocks__/echo-worker.js', {
      workerData: { name: workerMessenger },
    })

    const messagingService = await MessagingService.getInstance()

    // Add worker and try removing it
    messagingService.addWorker(workerMessenger, worker)
    messagingService.removeWorker(workerMessenger)

    // Attempt to remove the same worker again (should not throw or cause issues)
    expect(() => messagingService.removeWorker(workerMessenger)).not.toThrow()

    // clean up worker
    worker.terminate()
  })
  
})
