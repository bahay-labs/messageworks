import { parentPort, workerData } from 'worker_threads'

if (parentPort) {
  parentPort.on('message', (e) => {
    console.log('[RESPONSE-WORKER] onmessage e:', e)

    let request = e

    // Create the response directly using the ConcreteResponseMessageMock
    let response = {
      id: 'worker-uuid',
      name: 'concrete-response-message-mock',
      type: 'response',
      broadcast: false,
      source: `${workerData.name}`,
      destination: request.source,
      data: undefined,
      requestId: request.id,
    }

    // Send the modified message back
    parentPort.postMessage(response)
  })
}
