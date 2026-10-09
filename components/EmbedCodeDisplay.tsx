"use client";

import type { EmbedCodeOptions } from "@/lib/embed/tour-types";
import { generateEmbedCode } from "@/lib/integration/tour-service";

export interface EmbedCodeDisplayProps {
  embedUrl: string;
  options?: EmbedCodeOptions;
  onCopy?: () => void;
}

export function EmbedCodeDisplay({
  embedUrl,
  options,
  onCopy,
}: EmbedCodeDisplayProps) {
  const code = generateEmbedCode(embedUrl, options);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    onCopy?.();
  }

  return (
    <div data-venviewer-embed-code>
      <pre
        style={{
          margin: 0,
          padding: 16,
          background: "#0f172a",
          color: "#e2e8f0",
          borderRadius: 8,
          overflowX: "auto",
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        style={{
          marginTop: 12,
          padding: "8px 14px",
          borderRadius: 8,
          border: "1px solid #cbd5e1",
          background: "#fff",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        Copy embed code
      </button>
    </div>
  );
}
