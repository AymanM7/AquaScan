"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
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
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");

  const handleApprove = () => {
    setStatus("approved");
    onApprove();
    setTimeout(() => setOpen(false), 1200);
  };

  const handleReject = () => {
    setStatus("rejected");
    onReject();
    setTimeout(() => setOpen(false), 800);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { setOpen(v); if (v) setStatus("pending"); }}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[min(100vw-2rem,30rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-edge-active bg-bg-surface p-6 shadow-panel">
          {/* Header with AI agent pulse */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-accent-teal/40 bg-accent-teal/10 text-lg">
                🤖
              </div>
              {status === "pending" && (
                <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-amber opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-accent-amber" />
                </span>
              )}
            </div>
            <div>
              <Dialog.Title className="font-display text-lg text-content-primary">
                {status === "pending" ? "AI Agent Awaiting Approval" : status === "approved" ? "Action Approved" : "Action Declined"}
              </Dialog.Title>
              <p className="font-mono text-[10px] uppercase tracking-widest text-accent-amber">
                Human-in-the-loop gate
              </p>
            </div>
          </div>

          {status === "pending" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <p className="mt-4 text-sm text-content-secondary">
                Your AI agent is about to send this dossier to{" "}
                <strong className="text-content-primary">{recipientName || "Prospect"}</strong>.
                Review the action before it executes.
              </p>

              {/* Action details */}
              <div className="mt-4 space-y-2">
                <div className="rounded-lg border border-edge bg-bg-primary/60 p-3 text-xs">
                  <div className="grid grid-cols-[80px_1fr] gap-1">
                    <span className="text-content-secondary">Building:</span>
                    <span className="font-medium text-content-primary">{buildingName}</span>
                    <span className="text-content-secondary">Recipient:</span>
                    <span className="font-medium text-content-primary">{recipientName || recipientEmail}</span>
                    <span className="text-content-secondary">Email:</span>
                    <span className="font-mono text-content-mono">{recipientEmail}</span>
                  </div>
                </div>
                <div className="rounded-lg border border-edge bg-bg-primary/60 p-3 text-xs">
                  <p className="font-mono text-content-mono">Subject: {emailSubject}</p>
                  <p className="mt-2 max-h-24 overflow-y-auto text-content-secondary leading-relaxed">{emailPreview}</p>
                </div>
              </div>

              {/* Action log */}
              <div className="mt-4 rounded-lg bg-bg-surface-2/50 p-2 text-[10px] font-mono text-content-secondary">
                <div className="flex items-center gap-2">
                  <span className="text-accent-teal">✓</span> Dossier assembled from building intelligence
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-accent-teal">✓</span> Email drafted by Claude API
                </div>
                <div className="flex items-center gap-2">
                  <span className="animate-pulse text-accent-amber">●</span> Waiting for human approval...
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  className="flex-1 rounded-lg bg-accent-teal px-4 py-2.5 text-sm font-semibold text-bg-primary shadow-teal-glow transition-all hover:shadow-[0_0_20px_rgba(0,229,204,0.4)]"
                  onClick={handleApprove}
                >
                  ✓ Approve
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-lg border border-edge px-4 py-2.5 text-sm text-content-primary hover:border-accent-coral/50 hover:text-accent-coral transition-colors"
                  onClick={handleReject}
                >
                  ✕ Reject
                </button>
              </div>
            </motion.div>
          )}

          {status === "approved" && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-6 text-center">
              <div className="text-4xl">✅</div>
              <p className="mt-2 text-sm text-accent-teal font-semibold">Action executed successfully</p>
              <p className="mt-1 text-xs text-content-secondary">Dossier sent to {recipientName || recipientEmail}</p>
            </motion.div>
          )}

          {status === "rejected" && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-6 text-center">
              <div className="text-4xl">🚫</div>
              <p className="mt-2 text-sm text-content-secondary">Action declined and logged</p>
            </motion.div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
