"use client";

import { useEffect } from "react";
import { HEARTBEAT_INTERVAL_MS } from "@/features/auth/constants";

export function PresenceHeartbeat() {
  useEffect(() => {
    let stopped = false;
    async function sendHeartbeat() {
      if (stopped || document.visibilityState !== "visible") return;
      await fetch("/api/presence", { method: "POST", credentials: "same-origin", keepalive: true }).catch(() => undefined);
    }
    void sendHeartbeat();
    const timer = window.setInterval(() => void sendHeartbeat(), HEARTBEAT_INTERVAL_MS);
    const onVisibility = () => { if (document.visibilityState === "visible") void sendHeartbeat(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { stopped = true; window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);
  return null;
}
