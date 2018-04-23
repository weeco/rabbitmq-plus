import { Channel, Connection, Message, Options, Replies } from 'amqplib';
import { EventEmitter } from 'events';
import { MessageStatus } from '../enums/message-status';
import { IHasContext } from '../interfaces/has-context.interface';
import { IHasResponseFormat } from '../interfaces/has-response-format.interface';
import { RpcConsumerMessage } from './rpc-consumer-message';

export class RpcConsumer {
  private emitter: EventEmitter = new EventEmitter();
  private readonly exceptionEventName: string = 'internalException';

  private constructor(private channel: Channel, private queueName: string) {}

  public static async CREATE(
    connection: Connection,
    queueName: string,
    prefetchCount: number = 1,
    isGlobalPrefetchCount: boolean = false,
    queueOptions: Options.AssertQueue = {},
    exchangeOptions: Options.AssertExchange = {},
    exchangeName?: string, // Default exchange name is identified by an empty string
    exchangeType?: string // Default exchange type is identified by an empty string
  ): Promise<RpcConsumer> {
    const channel: Channel = await connection.createChannel();

    // Assert the queue if non existent
    const queueInfo: Replies.AssertQueue = await channel.checkQueue(queueName);
    const isQueueExistent: boolean = queueInfo != null ? true : false;
    if (!isQueueExistent) {
      await channel.assertQueue(queueName, queueOptions);
      if (exchangeType != null) {
        await channel.assertExchange(exchangeName, exchangeType, exchangeOptions);
        await channel.bindQueue(queueName, exchangeName, exchangeType);
      }
    }

    channel.prefetch(prefetchCount, isGlobalPrefetchCount);

    return new RpcConsumer(channel, queueName);
  }

  public on<TRequestData extends IHasContext, TResponseData>(
    context: string,
    listener: (msg: RpcConsumerMessage<TRequestData, TResponseData>) => void
  ): void {
    this.emitter.on(context, listener);
  }

  public once<TRequestData extends IHasContext, TResponseData extends IHasResponseFormat>(
    context: string,
    listener: (msg: RpcConsumerMessage<TRequestData, TResponseData>) => void
  ): void {
    this.emitter.once(context, listener);
  }

  public removeListener<TRequestData extends IHasContext, TResponseData extends IHasResponseFormat>(
    context: string,
    listener: (msg: RpcConsumerMessage<TRequestData, TResponseData>) => void
  ): void {
    this.emitter.removeListener(context, listener);
  }

  public startConsumingQueue(): void {
    this.channel.consume(this.queueName, this.receiveMessage, { noAck: false });
  }

  /**
   * Add each incoming job to the local message backlog and emit a context based event
   */
  private receiveMessage = (msg: Message): void => {
    // tslint:disable-next-line:no-any
    const consumerMessage: RpcConsumerMessage<any, any> = new RpcConsumerMessage<any, any>(this.channel, msg);
    if (msg == null) {
      return;
    }

    try {
      const parsedData: IHasContext = this.parseMessageContent(msg);
      consumerMessage.setRequestMessagePayload(parsedData);
      this.emitter.emit(parsedData.context, consumerMessage);
    } catch (err) {
      const errorMessage: IHasResponseFormat = {
        error: <Error>err,
        messageStatus: MessageStatus.UnprocessableEntity
      };
      consumerMessage.reply(errorMessage);
      this.emitter.emit(this.exceptionEventName, err);
    }
  };

  /**
   * Tries to parse the message content.
   * @param msg The received message
   */
  private parseMessageContent(msg: Message): IHasContext {
    const parsedContent: IHasContext = <IHasContext>JSON.parse(msg.content.toString());

    // Check if there is a listener for this context
    if (!this.isListenerBound(parsedContent.context)) {
      throw new Error(
        `Received a message with context '${parsedContent.context}' but there is no listener bound for this context.`
      );
    }

    return parsedContent;
  }

  /**
   * Checks if there are listeners bound to a given event name.
   * @param eventName The event whose listener count shall be checked
   */
  private isListenerBound(eventName: string): boolean {
    return this.emitter.listeners(eventName) != null;
  }
}

export type Listener<T> = (event: T) => {};
