import { MessageStatus } from '../enums/message-status';

// Error has to be preserialized before as JSON.stringify is not capable of properly stringifying an Error object
export interface IPreSerializedResponseFormat {
  messageStatus: MessageStatus;
  error?: string;
  payload?: {};
}
