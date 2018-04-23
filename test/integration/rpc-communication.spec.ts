import { Channel } from 'amqplib';
import { expect } from 'chai';
import { describe, it } from 'mocha';
import {
  IHasContext,
  MessageStatus,
  RabbitMQPlus,
  RpcConsumer,
  RpcConsumerMessage,
  RPCPublisher
} from '../../src/index';
import { rabbitOptions } from './init.spec';

// Response data model
class ExampleResponseMessage {
  constructor(public receivedUserId: number) {}
}

// Request data model
class ExampleMessage implements IHasContext {
  public context: string = 'exampleMessageId';
  constructor(public userId: number) {}
}

describe('RPC communication', () => {
  const testQueueName: string = 'rpc-communication-spec';
  let rabbitPlus: RabbitMQPlus;
  let publisher: RPCPublisher;
  let consumer: RpcConsumer;
  let controlChannel: Channel;
  before(async () => {
    rabbitPlus = await RabbitMQPlus.CREATE(rabbitOptions);
    controlChannel = await rabbitPlus.connection.createChannel();
  });

  beforeEach(async () => {
    await controlChannel.deleteQueue(testQueueName);
    publisher = await RPCPublisher.CREATE(rabbitPlus.connection, testQueueName, 1, false, { durable: false });
    consumer = await RpcConsumer.CREATE(rabbitPlus.connection, testQueueName, 5, false, { durable: false });
  });

  after(async () => {
    await controlChannel.deleteQueue(testQueueName);
  });

  // tslint:disable-next-line:mocha-no-side-effect-code
  it('should schedule a new RPC request message which will be processed and responded to by a RPC consumer', async () => {
    const message: ExampleMessage = new ExampleMessage(4);

    // Now let's attach a Rpc consumer and start listening for messages
    consumer.on<ExampleMessage, ExampleResponseMessage>(
      'exampleMessageId',
      (msg: RpcConsumerMessage<ExampleMessage, ExampleResponseMessage>) => {
        expect(msg.requestMessagePayload.userId).to.be.equal(4);
        const confirmResponse: ExampleResponseMessage = new ExampleResponseMessage(msg.requestMessagePayload.userId);
        msg.reply(confirmResponse);
      }
    );
    consumer.startConsumingQueue();

    const response: ExampleResponseMessage = await publisher.dispatchMessage<ExampleResponseMessage>(message);
    expect(response).to.be.an('object');
    expect(response.receivedUserId).to.be.equal(4);
  }).timeout(4 * 1000);

  // tslint:disable-next-line:mocha-no-side-effect-code
  it('should reject a scheduled message after a predefined timeout', async () => {
    const message: ExampleMessage = new ExampleMessage(4);
    consumer.startConsumingQueue();
    await expect(publisher.dispatchMessage<ExampleResponseMessage>(message, {}, 2 * 1000)).to.be.rejected;
  }).timeout(4 * 1000);

  // tslint:disable-next-line:mocha-no-side-effect-code
  it('should schedule a new RPC request message which will be errored by the consumer', async () => {
    const message: ExampleMessage = new ExampleMessage(4);

    // Now let's attach a Rpc consumer and start listening for messages
    consumer.on<ExampleMessage, ExampleResponseMessage>(
      'exampleMessageId',
      (msg: RpcConsumerMessage<ExampleMessage, ExampleResponseMessage>) => {
        msg.reply(null, MessageStatus.UnprocessableEntity, new Error('Arguments are not valid'));
      }
    );
    consumer.startConsumingQueue();
    try {
      await publisher.dispatchMessage<ExampleResponseMessage>(message, {}, 2 * 1000);
      expect.fail(
        'No error thrown',
        'Throw an error',
        'Dispatch message has succeded, but it was expected to throw an error'
      );
    } catch (err) {
      expect(err).to.be.an('object');
      expect(err.message).to.be.equal('Arguments are not valid');
    }
  }).timeout(4 * 1000);
});
