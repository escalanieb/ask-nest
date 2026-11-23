import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("./ts-resolve-hooks.mjs", import.meta.url);

// The auth store persists to localStorage; give Node an in-memory one before it loads.
const memory = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
    removeItem: (key: string) => void memory.delete(key),
  },
});

const { useAuthStore } = await import("../src/stores/useAuthStore.ts");
const { changeSession } = await import("../src/lib/session.ts");
const { chroniclesApi, ChroniclesApiError, publicUrl } =
  await import("../src/services/chroniclesApi.ts");

const user = (capabilities: string[]) => ({
  id: 1,
  name: "Ana",
  email: "ana@example.test",
  role: "viewer" as const,
  capabilities,
});

function signIn(capabilities: string[], token = "ask-nest-jwt") {
  changeSession(`1:${capabilities.join(",")}`);
  useAuthStore.setState({ token, user: user(capabilities) });
}

async function withFetch(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  run: () => Promise<void>,
) {
  const original = globalThis.fetch;
  globalThis.fetch = handler as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = original;
  }
}

test("calls are blocked, with no network request, without the chronicles capability", async () => {
  signIn(["rss.use"]);
  let calls = 0;
  await withFetch(
    async () => {
      calls += 1;
      return new Response("[]");
    },
    async () => {
      await assert.rejects(chroniclesApi.timelines(), (error: unknown) => {
        assert.ok(error instanceof ChroniclesApiError);
        assert.equal(error.status, 403);
        return true;
      });
    },
  );
  assert.equal(calls, 0);
});

test("the ask-nest token is sent as the bearer credential", async () => {
  signIn(["chronicles.use"], "ask-nest-jwt");
  let seen: Headers | undefined;
  let url = "";
  await withFetch(
    async (input, init) => {
      url = String(input);
      seen = new Headers(init?.headers);
      return Response.json([{ id: 1 }]);
    },
    async () => {
      assert.deepEqual(await chroniclesApi.timelines(), [{ id: 1 }]);
    },
  );
  assert.equal(seen?.get("Authorization"), "Bearer ask-nest-jwt");
  assert.equal(seen?.get("Accept"), "application/json");
  assert.match(url, /\/admin\/timelines$/);
});

test("JSON bodies get a content type and uploads do not", async () => {
  signIn(["chronicles.use"]);
  const types: (string | null)[] = [];
  await withFetch(
    async (_input, init) => {
      types.push(new Headers(init?.headers).get("Content-Type"));
      return Response.json({ path: "timelines/1/a.png" });
    },
    async () => {
      await chroniclesApi.saveTimeline(undefined, { name: "x" });
      await chroniclesApi.uploadImage(1, new File(["x"], "a.png", { type: "image/png" }));
    },
  );
  assert.equal(types[0], "application/json");
  assert.equal(types[1], null);
});

test("validation errors are flattened into one message and keep their details", async () => {
  signIn(["chronicles.use"]);
  await withFetch(
    async () =>
      Response.json(
        {
          message: "The given data was invalid.",
          errors: { slug: ["Taken."], name: ["Required."] },
        },
        { status: 422 },
      ),
    async () => {
      await assert.rejects(chroniclesApi.saveTimeline(undefined, {}), (error: unknown) => {
        assert.ok(error instanceof ChroniclesApiError);
        assert.equal(error.status, 422);
        assert.equal(error.message, "Taken. Required.");
        return true;
      });
    },
  );
});

test("a 204 response resolves to undefined", async () => {
  signIn(["chronicles.use"]);
  await withFetch(
    async () => new Response(null, { status: 204 }),
    async () => {
      assert.equal(await chroniclesApi.deleteEntry(1, 2), undefined);
    },
  );
});

test("a session change aborts requests in flight", async () => {
  signIn(["chronicles.use"]);
  await withFetch(
    (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      }),
    async () => {
      const pending = chroniclesApi.timelines();
      await new Promise((resolve) => setTimeout(resolve, 0));
      changeSession("someone-else");
      await assert.rejects(pending, { name: "AbortError" });
    },
  );
});

test("public links use the configured root domain", () => {
  assert.equal(publicUrl("seagames"), "https://seagames.timeline.asc-nest.org");
});
