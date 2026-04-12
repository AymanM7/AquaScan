"use client";

import { useAuth0 } from "@auth0/auth0-react";
import { Pause, Play, X } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { apiJson } from "@/lib/api";

type Debrief = { script_text: string | null; elevenlabs_audio_url: string | null };

export function ElevenLabsDebriefPlayer() {
  const { user, isAuthenticated } = useAuth0();
  const userId = user?.sub ?? "";
  const [debrief, setDebrief] = useState<Debrief | null>(null);
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const canFetch = isAuthenticated && !!userId;

  useEffect(() => {
    if (!canFetch) return;
    let cancelled = false;
    (async () => {
      try {
        const d = await apiJson<Debrief>(`/api/debrief/${encodeURIComponent(userId)}`);
        if (!cancelled) setDebrief(d);
      } catch {
        if (!cancelled) setDebrief(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canFetch, userId]);

  useEffect(() => {
    if (!canFetch) return;
    const t = window.setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(t);
  }, [canFetch]);

  const transcript = useMemo(() => debrief?.script_text ?? "", [debrief]);

  useEffect(() => {
    if (!debrief?.elevenlabs_audio_url) {
      audioRef.current = null;
      return;
    }
    const a = new Audio(debrief.elevenlabs_audio_url);
    a.volume = 0.4;
    audioRef.current = a;
    return () => {
      a.pause();
      if (audioRef.current === a) audioRef.current = null;
    };
  }, [debrief?.elevenlabs_audio_url]);

  if (!canFetch || !visible) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[100] w-[min(360px,calc(100vw-3rem))] rounded-xl border border-edge bg-bg-surface/90 p-3 text-xs text-content-primary shadow-teal-glow backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-display text-sm font-semibold text-accent-teal">Intelligence debrief</div>
        <button
          type="button"
          className="rounded p-1 text-content-secondary hover:bg-bg-surface-2"
          aria-label="Close debrief player"
          onClick={() => setVisible(false)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {!debrief?.elevenlabs_audio_url && (
        <div className="animate-pulse text-content-secondary">Generating your briefing…</div>
      )}
      {!!transcript && (
        <div className="mb-3 max-h-24 overflow-y-auto text-content-secondary">{transcript}</div>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md border border-edge px-2 py-1 hover:border-edge-active"
          onClick={() => {
            const a = audioRef.current;
            if (!a) return;
            if (playing) {
              a.pause();
              setPlaying(false);
            } else {
              void a.play().then(() => setPlaying(true)).catch(() => {});
            }
          }}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {playing ? "Pause" : "Play"}
        </button>
        <div className="flex flex-1 items-end gap-1">
          {[0.35, 0.6, 0.45, 0.7].map((h, i) => (
            <span
              key={i}
              className={playing ? "block w-1 animate-pulse rounded-sm bg-accent-teal" : "block w-1 rounded-sm bg-accent-teal/40"}
              style={{ height: `${12 + h * 20}px`, animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
