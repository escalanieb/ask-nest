import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Render the actual panel with seeded query data. Stub only the transport;
// this test must not contact real feeds or require a browser/login session.
test("a shared default feed renders its fetched articles without a manual selection", async () => {
  const source = await readFile(new URL("../src/components/widgets/RssFeedPanel.tsx", import.meta.url), "utf8");
  const isolated = source.replace(
    'import { rssFeedApi } from "../../services/api/rssFeedApi";',
    'const rssFeedApi = { list: () => { throw new Error("Unexpected network call"); }, fetch: () => { throw new Error("Unexpected network call"); } };',
  );
  assert.notEqual(isolated, source, "The API import must be isolated before rendering.");
  const compiled = ts.transpileModule(isolated, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const temporaryModule = new URL(`.rss-panel-${randomUUID()}.mjs`, import.meta.url);
  await writeFile(temporaryModule, compiled, { flag: "wx" });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } } });
  try {
    const { default: RssFeedPanel } = await import(temporaryModule.href);
    const feed = { id: 7, name: "Shared comms feed", url: "https://synthetic.example.test/rss", active: true, is_shared: true, can_manage: false, category: "Synthetic" };
    client.setQueryData(["rss-feeds"], [feed]);
    client.setQueryData(["rss-items", feed.id], {
      feed,
      items: [{ title: "Synthetic shared article", link: "https://synthetic.example.test/story", published: null, summary: "Test story", image: null }],
    });
    const html = renderToStaticMarkup(React.createElement(QueryClientProvider, { client }, React.createElement(RssFeedPanel)));
    assert.match(html, /Synthetic shared article/);
    assert.doesNotMatch(html, /Select a feed to start reading articles/);
    assert.match(html, /Refresh RSS feed/);
  } finally {
    client.clear();
    await unlink(temporaryModule);
  }
});
