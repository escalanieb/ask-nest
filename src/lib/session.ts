// Shared by both API clients and query clients without importing React stores.
let generation = 0;
let identity = "anonymous";
const controllers = new Set<AbortController>();

export function sessionGeneration() {
  return generation;
}
export function sessionQueryHash(key: readonly unknown[]) {
  return JSON.stringify([identity, ...key]);
}
export function assertSession(expected: number) {
  if (expected !== generation) throw new DOMException("Session changed", "AbortError");
}
export function changeSession(nextIdentity: string) {
  generation += 1;
  identity = nextIdentity;
  for (const controller of controllers) controller.abort();
  controllers.clear();
}

export async function sessionFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const expected = generation;
  const controller = new AbortController();
  controllers.add(controller);
  const signal = init?.signal
    ? AbortSignal.any([controller.signal, init.signal])
    : controller.signal;
  try {
    const response = await fetch(input, { ...init, signal });
    assertSession(expected);
    if (!response.body) {
      controllers.delete(controller);
      return response;
    }
    const reader = response.body.getReader();
    const body = new ReadableStream({
      async pull(stream) {
        try {
          assertSession(expected);
          const result = await reader.read();
          assertSession(expected);
          if (result.done) {
            controllers.delete(controller);
            stream.close();
          } else stream.enqueue(result.value);
        } catch (error) {
          controllers.delete(controller);
          stream.error(error);
        }
      },
      cancel(reason) {
        controllers.delete(controller);
        controller.abort();
        return reader.cancel(reason);
      },
    });
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    controllers.delete(controller);
    throw error;
  }
}
