"use client";

import { useEffect, useState } from "react";
import { removePushSubscription, savePushSubscription, testPush } from "./actions";

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

function base64UrlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const b64 = (s + "=".repeat((4 - (s.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration("/")) ?? navigator.serviceWorker.register("/sw.js");
}

/** Per-device opt-in for push notifications (new matches, ready to book, booked). */
export function Notifications({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setState(ios && !standalone ? "ios-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setState("denied");
      const sub = await (await registration()).pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    setBusy(true);
    setNote(null);
    try {
      if ((await Notification.requestPermission()) !== "granted") return setState("denied");
      const reg = await registration();
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToBytes(vapidPublicKey),
        }));
      await savePushSubscription(sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } });
      setState("on");
    } catch (e) {
      setNote(`Couldn’t turn on notifications (${(e as Error).message}).`);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    const sub = await (await registration()).pushManager.getSubscription();
    if (sub) {
      await removePushSubscription(sub.endpoint);
      await sub.unsubscribe();
    }
    setState("off");
    setBusy(false);
  }

  if (state === "loading") return <p className="text-sm text-muted">Checking…</p>;
  if (state === "ios-install")
    return (
      <p className="text-sm text-muted">
        On iPhone, first add this app to your home screen (Share → <em>Add to Home Screen</em>), open
        it from there, and turn notifications on here.
      </p>
    );
  if (state === "unsupported")
    return <p className="text-sm text-muted">This browser doesn’t support notifications.</p>;
  if (state === "denied")
    return (
      <p className="text-sm text-muted">
        Notifications are blocked for this site. Allow them in your browser or phone settings, then
        reload.
      </p>
    );

  return (
    <div className="flex flex-wrap items-center gap-3">
      {state === "on" ? (
        <>
          <span className="chip">✓ On for this device</span>
          <button
            className="btn-ghost"
            disabled={busy}
            onClick={async () => setNote((await testPush()) ? "Test sent ✓" : "No device registered.")}
          >
            Send test
          </button>
          <button className="btn-danger" disabled={busy} onClick={disable}>
            Turn off
          </button>
        </>
      ) : (
        <button className="btn" disabled={busy} onClick={enable}>
          {busy ? "Turning on…" : "Turn on notifications"}
        </button>
      )}
      {note && <span className="text-sm text-muted">{note}</span>}
    </div>
  );
}
