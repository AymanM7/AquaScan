"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";

type Props = {
  buildingName: string;
  recipientEmail: string;
  recipientName: string;
  emailSubject: string;
  emailPreview: string;
  onApprove: () => void;
  onReject: () => void;
  trigger: React.ReactNode;
};

export function ApprovalGate({
  buildingName,
  recipientEmail,
  recipientName,
  emailSubject,
  emailPreview,
  onApprove,
  onReject,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[min(100vw-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-edge-active bg-bg-surface p-6 shadow-panel">
          <Dialog.Title className="font-display text-lg text-content-primary">
            Review before sending
          </Dialog.Title>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-accent-amber">
            AI agent action pending
          </p>
          <p className="mt-4 text-sm text-content-secondary">
            Dossier for <strong className="text-content-primary">{buildingName}</strong> →{" "}
            <strong>{recipientName || recipientEmail}</strong>
          </p>
          <div className="mt-3 rounded-lg border border-edge bg-bg-surface-2 p-3 text-xs">
            <p className="font-mono text-content-mono">Subject: {emailSubject}</p>
            <p className="mt-2 text-content-secondary">{emailPreview}</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              className="flex-1 rounded-lg bg-accent-teal px-3 py-2 text-sm font-semibold text-bg-primary"
              onClick={() => {
                onApprove();
                setOpen(false);
              }}
            >
              Approve send
            </button>
            <button
              type="button"
              className="flex-1 rounded-lg border border-edge px-3 py-2 text-sm text-content-primary"
              onClick={() => {
                onReject();
                setOpen(false);
              }}
            >
              Cancel
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
