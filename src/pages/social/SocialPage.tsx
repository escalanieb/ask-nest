import { useState } from "react";
import PostsTab from "./tabs/PostsTab";
import CommentsTab from "./tabs/CommentsTab";
import ComposeTab from "./tabs/ComposeTab";

type Tab = "posts" | "comments" | "compose";

const TABS: { id: Tab; label: string; description: string }[] = [
  { id: "posts", label: "Posts", description: "Posts from connected accounts" },
  {
    id: "comments",
    label: "Comments",
    description: "Engage with comment threads",
  },
  { id: "compose", label: "Compose", description: "Write and publish posts" },
];

export default function SocialPage() {
  const [activeTab, setActiveTab] = useState<Tab>("posts");

  const current = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Page Header */}
      <header
        className="flex shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-6 shadow-sm"
        style={{ height: 56 }}
      >
        <div>
          <h1 className="text-sm font-bold text-slate-800 leading-none">Social Media</h1>
          <p className="mt-0.5 text-[11px] text-slate-400">{current.description}</p>
        </div>

        {/* Tab bar */}
        <div className="ml-6 flex h-full items-end gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                "relative flex h-full items-center px-4 text-xs font-semibold transition-colors border-b-2",
                activeTab === tab.id
                  ? "border-red-600 text-red-600"
                  : "border-transparent text-slate-400 hover:text-slate-700",
              ].join(" ")}
            >
              {tab.label}
              {tab.id === "compose" && (
                <span className="ml-1.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  NEW
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            No platform connected
          </span>
          <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            + Connect Platform
          </button>
        </div>
      </header>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden bg-slate-50">
        {activeTab === "posts" && <PostsTab />}
        {activeTab === "comments" && <CommentsTab />}
        {activeTab === "compose" && <ComposeTab />}
      </div>
    </div>
  );
}
