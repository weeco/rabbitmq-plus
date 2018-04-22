import { MessageStatus } from '../enums/message-status';

export interface IHasResponseFormat {
  messageStatus: MessageStatus;
  error?: Error;
  payload?: {};
}
