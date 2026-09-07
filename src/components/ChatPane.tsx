"use client";

import { Download, Eraser, Menu } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { Composer } from "@/components/Composer";
import { MessageBubble } from "@/components/MessageBubble";
import { Welcome } from "@/components/Welcome";
import { Button } from "@/components/ui/Button";
import { findChatModel } from "@/lib/models";
import { suggestQuestions } from "@/lib/prompt";
import { useStore } from "@/lib/store";

function exportMarkdown(
  messages: ReturnType<typeof useStore.getState>["messages"],
  docNames: string[],
) {
  const lines = [
    "# DocuChat transcript",
    "",
    `Documents: ${docNames.join(", ") || "none"}`,
    `Exported: ${new Date().toISOString()}`,
    "",
  ];

  for (const message of messages) {
    lines.push(message.role === "user" ? `## Question\n\n${message.content}` : `## Answer\n\n${message.content}`);
    if (message.citations?.length) {
      lines.push("", "### Sources", "");
      for (const citation of message.citations) {
        const where = citation.page ? `, page ${citation.page}` : "";
        lines.push(`- **[${citation.n}]** ${citation.docName}${where}`);
        lines.push(`  > ${citation.text.replace(/\n+/g, " ").slice(0, 400)}…`);
      }
    }
    lines.push("");
  }

  const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `docuchat-${new Date().toISOString().slice(0, 10)}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ChatPane({
  onOpenSettings,
  onOpenSidebar,
}: {
  onOpenSettings: () => void;
  onOpenSidebar: () => void;
}) {
  const messages = useStore((state) => state.messages);
  const docs = useStore((state) => state.docs);
  const chunks = useStore((state) => state.chunks);
  const settings = useStore((state) => state.settings);
  const clearChat = useStore((state) => state.clearChat);

  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);

  // Follow the stream, but stop fighting the user once they scroll up.
  useEffect(() => {
    if (!messages.length) return;
    const node = scrollRef.current;
    if (node && pinnedRef.current) node.scrollTop = node.scrollHeight;
  }, [messages]);

  const model = findChatModel(
    settings.provider === "anthropic" ? settings.anthropicModel : settings.openaiModel,
  );

  const suggestions = useMemo(() => {
    if (!docs.length) return [];
    const sample = chunks.slice(0, 3).map((chunk) => chunk.text).join("\n");
    return suggestQuestions(docs, sample);
  }, [docs, chunks]);

  const inScope = docs.filter((doc) => doc.enabled);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b border-white/8 bg-ink-900/40 px-3 py-2.5 backdrop-blur-xl sm:px-5">
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSidebar}
          aria-label="Open library"
          className="lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </Button>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <button
            type="button"
            onClick={onOpenSettings}
            className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[11.5px] text-mist-300 transition-colors hover:border-iris-400/40 hover:text-white"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
            {model?.label ?? "No model"}
          </button>

          <span className="hidden items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[11.5px] text-mist-400 sm:inline-flex">
            {settings.retrievalMode} · top {settings.topK}
          </span>

          <span className="truncate text-[11.5px] text-mist-500">
            {inScope.length
              ? `${inScope.length} doc${inScope.length === 1 ? "" : "s"} · ${chunks.length} chunks`
              : "No documents yet"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={!messages.length}
            onClick={() => exportMarkdown(messages, docs.map((doc) => doc.name))}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button variant="ghost" size="sm" disabled={!messages.length} onClick={clearChat}>
            <Eraser className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </Button>
        </div>
      </header>

      <div
        ref={scrollRef}
        onScroll={(event) => {
          const node = event.currentTarget;
          pinnedRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 120;
        }}
        className="scroll-slim min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-6"
      >
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.length ? (
            messages.map((message) => <MessageBubble key={message.id} message={message} />)
          ) : (
            <Welcome onOpenSettings={onOpenSettings} />
          )}
        </div>
      </div>

      <div className="border-t border-white/8 bg-ink-900/40 px-3 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
        <div className="mx-auto max-w-3xl">
          <Composer suggestions={messages.length ? undefined : suggestions} />
        </div>
      </div>
    </div>
  );
}
