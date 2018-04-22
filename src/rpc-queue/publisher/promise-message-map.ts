import { Deferred } from '../../util/deferred';

/**
 * Maintains a message promise message map which is a helper class for promisifying RabbitMQ messages/jobs
 */
export class PromiseMessageMap {
  private promiseMap: Map<string, Deferred> = new Map();

  public addDispatchedMessage(correlationId: string, promise: Deferred): void {
    this.promiseMap.set(correlationId, promise);
  }

  public getDispatchedMessage(correlationId: string): Deferred {
    const deferredPromise: Deferred = this.promiseMap.get(correlationId);
    if (deferredPromise == null) {
      return null;
    }
    this.promiseMap.delete(correlationId);

    return deferredPromise;
  }
}
