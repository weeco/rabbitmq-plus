/**
 * Util class to resolve promises with a callback in a clean way.
 * Mainly used to promisfy the events
 */
export class Deferred {
  public resolve: ResolveFn;
  public reject: RejectFn;
  // tslint:disable-next-line:no-any
  public promise: Promise<any>;

  constructor() {
    // tslint:disable-next-line:promise-must-complete
    this.promise = new Promise((resolve: ResolveFn, reject: RejectFn): void => {
      this.reject = reject;
      this.resolve = resolve;
    });
  }
}

export type ResolveFn = (value?: {} | PromiseLike<{}>) => void;
// tslint:disable-next-line:no-any
export type RejectFn = (reason?: any) => void;
