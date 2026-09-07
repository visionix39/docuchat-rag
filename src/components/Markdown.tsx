"use client";

import { Children, isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Citation } from "@/lib/types";

const CITATION = /\[(\d{1,2})\]/g;

function CitationChip({ citation, onOpen }: { citation: Citation; onOpen: (c: Citation) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(citation)}
      title={`${citation.docName}${citation.page ? ` · page ${citation.page}` : ""}`}
      className="focus-ring mx-0.5 inline-flex h-[18px] min-w-[18px] translate-y-[-1px] items-center justify-center rounded-[5px] border border-iris-400/35 bg-iris-500/15 px-1 align-middle font-mono text-[10.5px] font-semibold text-iris-300 transition-colors hover:border-iris-400/70 hover:bg-iris-500/30 hover:text-white"
    >
      {citation.n}
    </button>
  );
}

/**
 * Replaces bare `[3]` markers in rendered text with clickable chips. Only
 * string children are touched, so nested elements keep their own formatting
 * and code spans are left exactly as the model wrote them.
 */
function decorate(
  children: ReactNode,
  citations: Citation[],
  onOpen: (citation: Citation) => void,
): ReactNode {
  if (!citations.length) return children;

  return Children.map(children, (child, childIndex) => {
    if (typeof child !== "string") return child;

    const parts: ReactNode[] = [];
    let cursor = 0;
    let match: RegExpExecArray | null;
    CITATION.lastIndex = 0;

    while ((match = CITATION.exec(child)) !== null) {
      const citation = citations.find((entry) => entry.n === Number(match![1]));
      if (!citation) continue;
      if (match.index > cursor) parts.push(child.slice(cursor, match.index));
      parts.push(
        <CitationChip
          key={`${childIndex}-${match.index}`}
          citation={citation}
          onOpen={onOpen}
        />,
      );
      cursor = match.index + match[0].length;
    }

    if (!parts.length) return child;
    if (cursor < child.length) parts.push(child.slice(cursor));
    return parts;
  });
}

export function Markdown({
  content,
  citations = [],
  onOpenCitation,
}: {
  content: string;
  citations?: Citation[];
  onOpenCitation?: (citation: Citation) => void;
}) {
  const open = onOpenCitation ?? (() => {});
  const wrap = (children: ReactNode) => decorate(children, citations, open);

  const components: Components = {
    p: ({ children }) => <p>{wrap(children)}</p>,
    li: ({ children }) => <li>{wrap(children)}</li>,
    h1: ({ children }) => <h1>{wrap(children)}</h1>,
    h2: ({ children }) => <h2>{wrap(children)}</h2>,
    h3: ({ children }) => <h3>{wrap(children)}</h3>,
    strong: ({ children }) => <strong>{wrap(children)}</strong>,
    em: ({ children }) => <em>{wrap(children)}</em>,
    td: ({ children }) => <td>{wrap(children)}</td>,
    th: ({ children }) => <th>{wrap(children)}</th>,
    blockquote: ({ children }) => <blockquote>{wrap(children)}</blockquote>,
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    pre: ({ children }) => {
      const first = Children.toArray(children)[0];
      const language =
        isValidElement<{ className?: string }>(first) &&
        /language-(\w+)/.exec(first.props.className ?? "")?.[1];
      return (
        <div className="relative">
          {language ? (
            <span className="absolute right-2.5 top-2 font-mono text-[10px] uppercase tracking-wide text-mist-500">
              {language}
            </span>
          ) : null}
          <pre>{children}</pre>
        </div>
      );
    },
  };

  return (
    <div className="prose-answer">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
