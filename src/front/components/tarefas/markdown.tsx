"use client";

import { urlSegura } from "@front/lib/tarefas";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";

/** Markdown sem HTML bruto (react-markdown nao interpreta HTML); links so http/https; sem imagens. */
export function Markdown({ texto }: { texto: string }) {
  // @[Nome](pessoa:uuid) vira link interno #mencao
  const src = texto.replace(/@\[([^\]]+)\]\(pessoa:[0-9a-fA-F-]{36}\)/g, "[@$1](#mencao)");
  return (
    <div className="space-y-2 break-words text-sm text-text">
      <ReactMarkdown
        disallowedElements={["img"]}
        unwrapDisallowed
        components={{
          a: ({ href, children }: { href?: string; children?: ReactNode }) => {
            if (href === "#mencao")
              return <span className="rounded bg-accent/10 px-1 text-accent">{children}</span>;
            const h = urlSegura(href);
            return h ? (
              <a
                href={h}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-accent underline"
              >
                {children}
              </a>
            ) : (
              <span>{children}</span>
            );
          },
          ul: ({ children }) => <ul className="list-disc space-y-0.5 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-0.5 pl-5">{children}</ol>,
          h1: ({ children }) => <h4 className="font-title text-base font-semibold">{children}</h4>,
          h2: ({ children }) => <h4 className="font-title text-base font-semibold">{children}</h4>,
          h3: ({ children }) => <h4 className="font-semibold">{children}</h4>,
          code: ({ children }) => (
            <code className="rounded bg-secondary px-1 py-0.5 font-mono text-xs">{children}</code>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded bg-secondary p-2 text-xs">{children}</pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border pl-3 text-text-muted">
              {children}
            </blockquote>
          ),
        }}
      >
        {src}
      </ReactMarkdown>
    </div>
  );
}
