"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiJson } from "@/lib/api";

type RunNowResponse = { task_id: string };
type RunStatusResponse = { status: string; progress: Record<string, unknown>; result: unknown };

export function useAutomationRun() {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  const trigger = useCallback(async (userId: string, demoMode = true) => {
    setError(null);
    setStatus("QUEUED");
    try {
      const res = await apiJson<RunNowResponse>("/api/automation/run-now", {
        method: "POST",
        body: JSON.stringify({ user_id: userId, demo_mode: demoMode }),
      });
      setTaskId(res.task_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    if (!taskId) return;
    clearTimer();
    const poll = async () => {
      try {
        const s = await apiJson<RunStatusResponse>(`/api/automation/run-status/${taskId}`);
        setStatus(s.status);
        if (s.status === "SUCCESS" || s.status === "FAILURE") {
          clearTimer();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Status poll failed");
        clearTimer();
      }
    };
    void poll();
    timer.current = setInterval(() => void poll(), 1500);
    return () => clearTimer();
  }, [taskId]);

  return { taskId, status, error, trigger, clear: () => setTaskId(null) };
}
