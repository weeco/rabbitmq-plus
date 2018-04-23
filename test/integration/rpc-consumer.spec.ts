import { Channel } from 'amqplib';
import { expect } from 'chai';
import { describe, it } from 'mocha';
import { RabbitMQPlus, RpcConsumer, RpcPublisher } from '../../src/index';
import { rabbitOptions } from './init.spec';

describe('RPC Consumer', () => {
  const testQueueName: string = 'rpc-consumer-spec';
  let rabbitPlus: RabbitMQPlus;
  let controlChannel: Channel;

  before(async () => {
    rabbitPlus = await RabbitMQPlus.CREATE(rabbitOptions);
    controlChannel = await rabbitPlus.connection.createChannel();
  });

  beforeEach(async () => {
    await controlChannel.deleteQueue(testQueueName);
    await RpcPublisher.CREATE(rabbitPlus.connection, testQueueName, 1, false, { durable: false });
  });

  after(async () => {
    await controlChannel.deleteQueue(testQueueName);
  });

  it('should consume an existing queue', async () => {
    const consumer: RpcConsumer = await RpcConsumer.CREATE(rabbitPlus.connection, testQueueName);
    expect(consumer).to.be.an('object');
  });
});
