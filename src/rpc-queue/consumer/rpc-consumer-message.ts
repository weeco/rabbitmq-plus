import { Channel, Message } from 'amqplib';
import { MessageStatus } from '../enums/message-status';
import { IHasContext } from '../interfaces/has-context.interface';
import { IHasResponseFormat } from '../interfaces/has-response-format.interface';
import { IPreSerializedResponseFormat } from '../interfaces/serialized-response-format.interface';

export class RpcConsumerMessage<TRequestData extends IHasContext, TResponseData> {
  public requestMessagePayload: TRequestData;

  constructor(private channel: Channel, private requestMessage: Message) {}

  /**
   * Sends a direct reply to the original message producer.
   * @param data The to be transmitted data
   */
  public reply(payload: TResponseData, messageStatus: MessageStatus = MessageStatus.Success, error?: Error): void {
    const serialized: Buffer = this.serializeResponseObject(payload, messageStatus, error);
    this.channel.sendToQueue(this.requestMessage.properties.replyTo, serialized, {
      correlationId: this.requestMessage.properties.correlationId
    });
    this.channel.ack(this.requestMessage);
  }

  public setRequestMessagePayload(payload: TRequestData): void {
    this.requestMessagePayload = payload;
  }

  /**
   * Serializes a JSON object which may contain an Error object.
   * @param responseJson The to be serialized JSON object
   */
  private serializeResponseObject(
    payload: TResponseData,
    messageStatus: MessageStatus = MessageStatus.Success,
    error?: Error
  ): Buffer {
    // tslint:disable-next-line:prefer-object-spread
    const response: IHasResponseFormat = Object.assign({ payload }, { error }, { messageStatus });
    let serializedError: string;
    if (error != null) {
      serializedError = JSON.stringify(error, Object.getOwnPropertyNames(error));
    }
    // Spread operator can not be used. TypeScript limitation, see PR: https://github.com/Microsoft/TypeScript/pull/13288
    // tslint:disable-next-line:prefer-object-spread
    const responseSerialized: IPreSerializedResponseFormat = Object.assign(response, { error: serializedError });
    const serialized: string = JSON.stringify(responseSerialized);

    return Buffer.from(serialized);
  }
}
