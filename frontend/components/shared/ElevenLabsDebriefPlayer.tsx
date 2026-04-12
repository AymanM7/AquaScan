"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import { apiJson } from "@/lib/api";
import { DEMO_REP_ID } from "@/lib/demoMode";
import { ONBOARDING_COOKIE } from "@/lib/onboarding-cookie";

type DebriefPayload = {
  script_text: string | null;
  elevenlabs_audio_url: string | null;
};

function isOnboarded(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith(`${ONBOARDING_COOKIE}=1`));
}

function WaveformBars({ playing }: { playing: boolean }) {
  return (
    <div className="flex h-6 items-end gap-[2px]">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full bg-accent-teal transition-all ${playing ? "animate-pulse" : ""}`}
          style={{
            height: playing ? `${6 + Math.sin(Date.now() / 200 + i) * 10 + Math.random() * 6}px` : "3px",
            animationDelay: `${i * 50}ms`,
            animationDuration: `${400 + i * 30}ms`,
            opacity: playing ? 0.6 + Math.random() * 0.4 : 0.2,
          }}
        />
      ))}
    </div>
  );
}

export function ElevenLabsDebriefPlayer() {
  const [data, setData] = useState<DebriefPayload | null>(null);
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [transcriptIdx, setTranscriptIdx] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReady(isOnboarded());
  }, []);

  const load = useCallback(async () => {
    if (!isOnboarded()) return;
    try {
      const qs = new URLSearchParams({ user_id: DEMO_REP_ID });
      const d = await apiJson<DebriefPayload>(`/api/debrief?${qs.toString()}`);
      setData(d);
    } catch {
      setData(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Transcript scroll animation
  useEffect(() => {
    if (!playing || !data?.script_text) return;
    const words = data.script_text.split(" ");
    const interval = setInterval(() => {
      setTranscriptIdx((i) => {
        const next = Math.min(i + 1, words.length);
        if (transcriptRef.current) {
          transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
        return next;
      });
    }, 280); // ~130 words per minute
    return () => clearInterval(interval);
  }, [playing, data?.script_text]);

  const playDebrief = () => {
    if (!data?.script_text) return;
    // Use browser speechSynthesis as fallback when no ElevenLabs audio
    if (data.elevenlabs_audio_url && audioRef.current) {
      audioRef.current.play();
      setPlaying(true);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(data.script_text);
    utterance.rate = 0.95;
    utterance.onend = () => setPlaying(false);
    setPlaying(true);
    setTranscriptIdx(0);
    window.speechSynthesis.speak(utterance);
  };

  const pauseDebrief = () => {
    if (audioRef.current) audioRef.current.pause();
    window.speechSynthesis.cancel();
    setPlaying(false);
  };

  const regenerate = async () => {
    setLoading(true);
    try {
      const d = await apiJson<DebriefPayload>("/api/debrief/generate", {
        method: "POST",
        body: JSON.stringify({ user_id: DEMO_REP_ID }),
      });
      setData(d);
      setTranscriptIdx(0);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  if (!ready) return null;

  if (!open) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        type="button"
        className="fixed bottom-4 left-4 z-[60] flex items-center gap-2 rounded-full border border-accent-teal/30 bg-bg-surface-2/90 px-3 py-2 text-xs text-accent-teal shadow-teal-glow backdrop-blur"
        onClick={() => setOpen(true)}
      >
        <span className="text-sm">🎙️</span>
        Intelligence Debrief
      </motion.button>
    );
  }

  const words = data?.script_text?.split(" ") || [];
  const visibleText = words.slice(0, transcriptIdx).join(" ");

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-4 left-4 z-[60] w-[min(100vw-2rem,24rem)] rounded-xl border border-edge bg-bg-surface/95 p-4 shadow-teal-glow backdrop-blur"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎙️</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-accent-teal">
              Intelligence Debrief
            </span>
          </div>
          <button
            type="button"
            className="text-content-secondary/50 hover:text-content-primary text-sm"
            onClick={() => { pauseDebrief(); setOpen(false); }}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>

        {/* Waveform */}
        <div className="mb-3">
          <WaveformBars playing={playing} />
        </div>

        {/* Audio element (hidden, for ElevenLabs URL) */}
        {data?.elevenlabs_audio_url && (
          <audio
            ref={audioRef}
            src={data.elevenlabs_audio_url}
            onPlay={() => { setPlaying(true); setTranscriptIdx(0); }}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            className="hidden"
          />
        )}

        {/* Transcript scroll */}
        {data?.script_text && (
          <div
            ref={transcriptRef}
            className="mb-3 max-h-24 overflow-y-auto rounded-lg bg-bg-primary/60 p-2 text-xs leading-relaxed"
          >
            {playing ? (
              <span className="text-content-primary">{visibleText}<span className="animate-pulse text-accent-teal">|</span></span>
            ) : (
              <span className="text-content-secondary">{data.script_text}</span>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          {data?.script_text && (
            <button
              type="button"
              onClick={playing ? pauseDebrief : playDebrief}
              className="flex-1 rounded-lg bg-accent-teal/15 py-2 text-xs font-semibold text-accent-teal hover:bg-accent-teal/25 transition-colors"
            >
              {playing ? "⏸ Pause" : "▶ Play Debrief"}
            </button>
          )}
          <button
            type="button"
            disabled={loading}
            onClick={() => void regenerate()}
            className="flex-1 rounded-lg border border-edge py-2 text-xs font-semibold text-content-secondary hover:border-edge-active hover:text-content-primary disabled:opacity-50 transition-colors"
          >
            {loading ? "Generating…" : "🔄 Refresh"}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
