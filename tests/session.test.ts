import { test } from "node:test";
import assert from "node:assert/strict";
import { changeSession, sessionFetch, sessionQueryHash } from "../src/lib/session.ts";

test("query hashes partition identical resource keys by user and team", () => {
  changeSession("user1:communications");
  const first = sessionQueryHash(["datasets"]);
  changeSession("user1:legislative");
  assert.notEqual(first, sessionQueryHash(["datasets"]));
  changeSession("user2:communications");
  assert.notEqual(first, sessionQueryHash(["datasets"]));
});

test("account changes abort outstanding network requests", async () => {
  const original = globalThis.fetch;
  let observedSignal: AbortSignal | undefined;
  globalThis.fetch = async (_input, init) => {
    observedSignal = init?.signal as AbortSignal;
    return new Promise((_resolve, reject) => {
      observedSignal!.addEventListener("abort", () =>
        reject(new DOMException("Aborted", "AbortError")),
      );
    });
  };
  try {
    changeSession("user1:communications");
    const pending = sessionFetch("https://synthetic.invalid/api");
    changeSession("user2:legislative");
    assert.equal(observedSignal?.aborted, true);
    await assert.rejects(pending, { name: "AbortError" });
  } finally {
    globalThis.fetch = original;
  }
});

test("late response bodies cannot deliver data into a new session", async () => {
  const original = globalThis.fetch;
  let deliver: ((chunk: Uint8Array) => void) | undefined;
  globalThis.fetch = async () =>
    new Response(
      new ReadableStream({
        start(controller) {
          deliver = (chunk) => {
            controller.enqueue(chunk);
            controller.close();
          };
        },
      }),
    );
  try {
    changeSession("user1:communications");
    const response = await sessionFetch("https://synthetic.invalid/api");
    const body = response.text();
    changeSession("user2:legislative");
    deliver!(new TextEncoder().encode("private old response"));
    await assert.rejects(body, { name: "AbortError" });
  } finally {
    globalThis.fetch = original;
  }
});
