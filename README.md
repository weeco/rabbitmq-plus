# RabbitMQ Plus

An opinioniated library which abstracts away the required business code for working with RabbitMQ.
This library allows you to use RabbitMQ without caring too much about the implementation of the communication patterns.
Currently the only implemented communication pattern is the RPC communication with direct replies.

### Features

- [x] Promise based methods for RPC requests
- [x] Fully OOP and typesafe communication
- [x] Throws exceptions if exceeding predefined timeouts
- [x] Written in TypeScript (provides always up to date type definitions)

**And coming up on the roadmap...**

I am waiting for suggestions on what to add :).

## Table of contents
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [RPC Sample usage](#rpc-sample-usage)  
- [License](#license)

## Getting started
### Prerequisites
- [Node.js 8.0+](http://nodejs.org)
- RabbitMQ v3+ server running

### Installation
`$ npm install --save rabbitmq-plus`

### RPC sample usage
The below example shows a producer which publishes messages to a queue called 'exampleQueueName'. It consumes response messages
with a prefetch count of 100 which is not meant to be a global prefetch.

Publisher:
```typescript
import { RabbitMQPlus, RpcPublisher } from 'rabbitmq-plus';

const connectOptions: Options.Connect = {
  hostname: '127.0.0.1',
  username: 'rabbit',
  password: 'mq123'
};

async function bootstrap(): Promise<void> {
  try {
    const rabbit: RabbitMQPlus = await RabbitMQPlus.CREATE(connectOptions);
    const publisher: RpcPublisher = await RpcPublisher.CREATE(rabbit.connection, 'exampleQueueName', 100, false);
    const message: ProfileRequest = new ProfileRequest(userId);
    const response: ProfileResponse = await this.publisher.dispatchMessage<ProfileResponse>(message);
  } catch (err) {
    console.error(err);
  }
}

bootstrap();
```

Consumer:
```ts
import { RpcConsumer, RpcConsumerMessage } from 'rabbitmq-plus';

async function bootstrap(): Promise<void> {
  const consumer: RpcConsumer = await RpcConsumer.CREATE(rabbitPlus.connection, 'exampleQueueName', 5, false);

  // Now let's attach a Rpc consumer and start listening for messages
  consumer.on<ExampleMessage, ExampleResponseMessage>(
    'exampleMessageId',
    (msg: RpcConsumerMessage<ProfileRequest, ProfileResponse>) => {
      // Respond to the request with the userId's email address
      const response: ProfileResponse = new ProfileResponse('john@doe.com');
      msg.reply(response);
    }
  );
  consumer.startConsumingQueue();
}
```

Shared models:
```ts
export class ProfileRequest implements IHasContext {
  public readonly context: string = MessageContext.PlayerProfileRequest;

  constructor(public userId: number) {}
}

export class ProfileResponse {
  constructor(public userEmail: string) {}
}
```


## License
The MIT License (MIT)

Copyright (c) 2018 Weeco

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
