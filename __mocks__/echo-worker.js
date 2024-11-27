import { parentPort, workerData } from 'worker_threads'

if (parentPort) {
  parentPort.on('message', (e) => {
    console.log('[ECHO-WORKER] onmessage e:', e)
    let message = e

    // Modify the message
    message.name = 'worker-changed-' + message.name
    message.destination = message.source
    message.source = `${workerData.name}`

    // Send the modified message back
    parentPort.postMessage(message)
  })
}
