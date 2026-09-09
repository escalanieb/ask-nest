import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { AscMessage as AscMessageType } from "../../types/asc";
import AscSourceCard from "./AscSourceCard";

interface Props {
  message: AscMessageType;
  streaming?: boolean;
}

export default function AscMessage({ message, streaming = false }: Props) {
  const isUser = message.role === "user";

  return (
    <article
      className={`flex animate-[asc-msg-in_180ms_ease-out] ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div className={`max-w-[82%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={
            isUser
              ? "rounded-2xl rounded-br-md bg-slate-800 px-4 py-3 text-white shadow-sm"
              : "rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-slate-700 shadow-sm"
          }
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-[12px] leading-5">{message.content}</p>
          ) : (
            <div className="asc-markdown text-[12px] leading-5">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ children, ...props }) => (
                    <a
                      {...props}
                      target="_blank"
                      rel="noreferrer"
                      className="text-red-600 underline"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
              {streaming && <span aria-hidden="true" className="asc-stream-cursor ml-0.5" />}
            </div>
          )}
        </div>

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {message.sources.map((source) => (
              <AscSourceCard
                key={`${source.category}:${source.title}:${source.date ?? ""}:${source.url ?? ""}`}
                source={source}
              />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
