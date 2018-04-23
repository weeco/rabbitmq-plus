import { Channel, Replies } from 'amqplib';
import { expect } from 'chai';
import { describe, it } from 'mocha';
import { IHasContext, RabbitMQPlus, RpcPublisher } from '../../src/index';
import { sleep } from '../util/sleep';
import { rabbitOptions } from './init.spec';

describe('RPC Publisher', () => {
  const testQueueName: string = 'rpc-publisher-spec';
  let rabbitPlus: RabbitMQPlus;
  let publisher: RpcPublisher;
  let controlChannel: Channel;

  before(async () => {
    rabbitPlus = await RabbitMQPlus.CREATE(rabbitOptions);
    controlChannel = await rabbitPlus.connection.createChannel();
  });

  beforeEach(async () => {
    await controlChannel.deleteQueue(testQueueName);
    publisher = await RpcPublisher.CREATE(rabbitPlus.connection, testQueueName, 1, false, { durable: false });
  });

  after(async () => {
    await controlChannel.deleteQueue(testQueueName);
  });

  it('should schedule a new RPC request message', async () => {
    class ExampleMessage implements IHasContext {
      public context: string = 'exampleMessageId';
      constructor(public userId: number) {}
    }
    const message: ExampleMessage = new ExampleMessage(4);
    publisher.dispatchMessage(message);

    // As the node implementation uses a writeable buffer under the hood and only returns a boolean upon writing, we have no
    // way to know when our message has been received by the broker. Therefore we sleep for 1000ms here.
    await sleep(1000);

    const queueInfo: Replies.AssertQueue = await controlChannel.checkQueue(testQueueName);
    expect(queueInfo.messageCount).to.equal(1);
  });
});
