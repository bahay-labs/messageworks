# MessageWorks

MessageWorks is a flexible messaging framework for Node.js that handles message requests and responses in an efficient and scalable manner. It is designed to allow seamless communication between services, utilizing worker threads or external workers to handle message processing.

## Features

- **Request-Response Messaging**: Easily handle request/response patterns with worker threads or external workers.
- **Worker Thread Support**: Use worker threads for background task processing.
- **Event-Driven**: Built on an event-driven architecture to ensure efficient message handling.
- **Async Messaging**: Supports asynchronous message handling, perfect for microservices and distributed systems.
- **TypeScript Support**: Fully written in TypeScript, providing type safety and autocompletion.
- **Message Broadcasting**: Supports broadcasting messages to multiple workers or services.

## Installation

To install `messageworks`, you can use npm or yarn:

```bash
npm install messageworks
```

or

```bash
yarn add messageworks
```

## Usage

### Basic Usage Example

1. **TODO: Create a new messaging service:**

```ts
import { MessagingService } from 'messageworks'

// Initialize the messaging service with a root messenger and callback function
const rootMessenger = '/root'
const rootCallback = (message) => {
  console.log('Message received in root callback:', message)
}

const messagingService = new MessagingService(rootMessenger, rootCallback)
```

2. **TODO: Send a message:**

```ts
import { GeneralMessage } from 'messageworks'

const workerMessenger = '/root/echo'
const generalMessage = new GeneralMessage(workerMessenger)

// Send the message and handle response asynchronously
messagingService.sendMessage(requestMessage).then((response) => {
  console.log('Received response:', response)
})
```

### Handling Worker Responses

**TODO:** If you're working with worker threads, you can add workers to the messaging service to handle incoming requests and send responses.

```ts
const workerScript = createResponseWorkerScript(workerMessenger)
const worker = new WorkerMock(URL.createObjectURL(new Blob([workerScript])))

// Add worker to the messaging service
messagingService.addWorker(workerMessenger, worker)

// Send a request and wait for the response
const request = new ConcreteRequestMessageMock(workerMessenger)
messagingService.sendMessage(request).then((response) => {
  console.log('Worker Response:', response)
})
```

## API

### `MessagingService`

#### `sendMessage<T>(message: GeneralMessage<T>, worker?: Worker): Promise<ResponseMessage<T> | null>`

- **message**: The message to be sent. This could be a request or response message.
- **worker** (optional): The worker to send the message to. If omitted, the message will be sent to the appropriate worker.
- **returns**: A promise that resolves to a response message if the message is a request; otherwise, resolves to `null`.

### `WorkerMock`

**TODO:** A mock worker implementation for testing purposes.

```ts
const worker = new WorkerMock(URL.createObjectURL(new Blob([workerScript])));
```

## Contributing

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Make your changes.
4. Run tests (`npm test`).
5. Commit your changes (`git commit -am 'Add new feature'`).
6. Push to the branch (`git push origin feature-branch`).
7. Open a pull request.

## License

```
Apache License 2.0

Copyright 2024 Bahay Labs, LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
