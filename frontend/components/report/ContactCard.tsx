"use client";

import { Copy } from "@phosphor-icons/react";

import type { ContactData } from "@/types/report";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* ignore */
  }
}

export function ContactCard({ contact }: { contact: ContactData }) {
  return (
    <section className="rounded-xl border border-edge bg-bg-surface-2 p-6">
      <h2 className="font-mono text-[11px] uppercase tracking-widest text-content-secondary">
        Decision maker
      </h2>
      <div className="mt-4 flex gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-edge-active bg-bg-surface font-display text-lg text-accent-teal">
          {initials(contact.name || "DM")}
        </div>
        <div>
          <h3 className="font-display text-lg text-content-primary">{contact.name || "Unknown"}</h3>
          <p className="text-sm text-content-secondary">{contact.title}</p>
          <p className="text-sm text-content-mono">{contact.company}</p>
        </div>
      </div>
      <div className="mt-4 space-y-2 text-sm">
        {contact.email ? (
          <div className="flex flex-wrap items-center gap-2 text-content-secondary">
            <span>{contact.email}</span>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded border border-edge px-2 py-0.5 text-xs text-accent-teal"
              onClick={() => void copyText(contact.email!)}
            >
              <Copy size={14} /> Copy
            </button>
          </div>
        ) : null}
        {contact.linkedin ? (
          <a
            href={contact.linkedin}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-accent-blue hover:underline"
          >
            View LinkedIn →
          </a>
        ) : null}
      </div>
      <p className="mt-4 text-xs text-content-secondary">
        Sourced via Perplexity Sonar from public registries and professional profiles (when configured).
      </p>
      <button
        type="button"
        className="mt-3 w-full rounded-lg border border-edge-active py-2 text-xs font-semibold text-accent-teal"
        onClick={() =>
          void copyText(
            [contact.name, contact.title, contact.company, contact.email, contact.linkedin]
              .filter(Boolean)
              .join("\n"),
          )
        }
      >
        Copy full contact
      </button>
    </section>
  );
}
