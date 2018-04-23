import { Channel, Connection, Message, Options } from 'amqplib';
import { v4 as uuid } from 'uuid';
import { Deferred } from '../../util/deferred';
import { MessageStatus } from '../enums/message-status';
import { IHasContext } from '../interfaces/has-context.interface';
import { IPreSerializedResponseFormat } from '../interfaces/serialized-response-format.interface';
import { PromiseMessageMap } from './promise-message-map';

export class RpcPublisher {
  private messageMap: PromiseMessageMap;
  private readonly directReplyQueueName: string = 'amq.rabbitmq.reply-to';

  private constructor(
    public channel: Channel,
    private queueName: string,
    private prefetchCount: number,
    private isGlobalPrefetchCount: boolean
  ) {
    this.messageMap = new PromiseMessageMap();
  }

  public static async CREATE(
    connection: Connection,
    queueName: string,
    prefetchCount: number = 1,
    isGlobalPrefetchCount: boolean,
    queueOptions: Options.AssertQueue = {},
    exchangeOptions: Options.AssertExchange = {},
    exchangeName?: string,
    exchangeType?: string
  ): Promise<RpcPublisher> {
    const channel: Channel = await connection.createChannel();
    await channel.assertQueue(queueName, queueOptions);
    if (exchangeType != null) {
      await channel.assertExchange(exchangeName, exchangeType, exchangeOptions);
      await channel.bindQueue(queueName, exchangeName, exchangeType);
    }

    const instance: RpcPublisher = new RpcPublisher(channel, queueName, prefetchCount, isGlobalPrefetchCount);
    await instance.init();

    return instance;
  }

  /**
   * Setup prefetch and bind events for consuming the directly replied messages
   */
  public async init(): Promise<void> {
    // Start listening responses on the direct reply to queue
    await this.channel.prefetch(this.prefetchCount, this.isGlobalPrefetchCount);
    await this.channel.consume(this.directReplyQueueName, this.receiveMessage, { noAck: true });
  }

  // tslint:disable-next-line:no-any
  public async dispatchMessage<T>(
    requestMessage: IHasContext,
    publishOptions: Options.Publish = {},
    timeoutMs?: number
  ): Promise<T> {
    const serialized: string = JSON.stringify(requestMessage);
    const message: Buffer = Buffer.from(serialized);

    const deferred: Deferred = new Deferred();
    const correlationId: string = uuid();
    this.messageMap.addDispatchedMessage(correlationId, deferred);
    this.channel.sendToQueue(this.queueName, message, {
      ...publishOptions,
      correlationId,
      replyTo: this.directReplyQueueName
    });

    // Reject promise after timeout
    if (timeoutMs != null) {
      setTimeout(() => {
        deferred.reject(new Error(`Timeout of ${timeoutMs}ms exceeded`));
        this.messageMap.deleteDispatchedMessage(correlationId);
      }, timeoutMs);
    }

    return deferred.promise;
  }

  /**
   * Resolves or rejects the deferred promise
   */
  private receiveMessage = (msg: Message): void => {
    const correlationId: string = <string>msg.properties.correlationId;

    const deferred: Deferred = this.messageMap.getDispatchedMessage(correlationId);
    if (deferred == null) {
      return;
    }

    try {
      // Check if response is an error
      const messageContent: string = msg.content.toString();
      // tslint:disable-next-line:no-any
      const response: IPreSerializedResponseFormat = <IPreSerializedResponseFormat>JSON.parse(messageContent);
      if (response.messageStatus !== MessageStatus.Success) {
        const err: Error = <Error>JSON.parse(response.error);
        deferred.reject(err);

        return;
      }

      deferred.resolve(response.payload);
    } catch (err) {
      deferred.reject(err);
    }
  };
}
