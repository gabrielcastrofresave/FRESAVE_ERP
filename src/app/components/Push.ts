// src/app/push.ts
import { pushAPI } from "./api";

// Chave PÚBLICA (pode estar no código)
const VAPID_PUBLIC_KEY =
  "BHGpAWj-5m1byxKAXqiJK8OVT_G8NZD7PW_ueGMUs_xPqS9su5Kna2IE3JLbS0TBsuLsbQhBh_1W9uvZh2TeWdk";

function urlBase64ToUint8Array(base64: string) {
  const padded =
    base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(
    padded.replace(/-/g, "+").replace(/_/g, "/"),
  );
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export type PushState = "unsupported" | "denied" | "on" | "off";

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  try {
    const reg =
      await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    return sub && Notification.permission === "granted"
      ? "on"
      : "off";
  } catch {
    return "off";
  }
}

export async function enablePush() {
  if (!pushSupported())
    throw new Error(
      "Este browser não suporta notificações push.",
    );

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      "Permissão recusada. Ativa as notificações nas definições do browser.",
    );
  }

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        VAPID_PUBLIC_KEY,
      ) as BufferSource,
    });
  }
  await pushAPI.subscribe(sub.toJSON());
}

export async function disablePush() {
  const reg =
    await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await pushAPI.unsubscribe(endpoint).catch(() => {});
  }
}