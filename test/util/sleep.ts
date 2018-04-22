export async function sleep(ms: number): Promise<{}> {
  return new Promise((resolve: resolveFn): NodeJS.Timer => setTimeout(resolve, ms));
}

type resolveFn = (thenableOrResult?: {} | PromiseLike<{}>) => void;
