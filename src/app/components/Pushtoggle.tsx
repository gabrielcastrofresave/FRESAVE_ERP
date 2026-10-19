// src/app/components/PushToggle.tsx
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { pushAPI } from "../api";
import {
  disablePush,
  enablePush,
  getPushState,
  type PushState,
} from "../push";

export function PushToggle() {
  const [state, setState] = useState<PushState | "loading">("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    getPushState().then(setState);
  }, []);

  // Sem suporte (ou bloqueado): não mostra nada de enganador
  if (state === "loading" || state === "unsupported") return null;

  const toggle = async () => {
    setBusy(true);
    setMsg(null);
    try {
      if (state === "on") await disablePush();
      else await enablePush();
    } catch (e: any) {
      setMsg(e?.message ?? "Não foi possível alterar as notificações.");
    } finally {
      setState(await getPushState());
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await pushAPI.test();
      setMsg("Teste enviado — deves receber já o aviso.");
    } catch (e: any) {
      setMsg(e?.message ?? "Falha ao enviar o teste.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {state === "on" && (
          <button
            type="button"
            onClick={sendTest}
            disabled={busy}
            className="text-xs text-zinc-500 underline-offset-2 hover:underline disabled:opacity-50"
          >
            Enviar teste
          </button>
        )}
        <Button
          variant="outline"
          className="h-10"
          onClick={toggle}
          disabled={busy || state === "denied"}
          title={
            state === "denied"
              ? "Bloqueadas no browser: ativa-as nas definições do site"
              : undefined
          }
        >
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : state === "on" ? (
            <Bell className="mr-2 h-4 w-4 text-emerald-600" />
          ) : (
            <BellOff className="mr-2 h-4 w-4" />
          )}
          {state === "on"
            ? "Notificações ativas"
            : state === "denied"
              ? "Notificações bloqueadas"
              : "Ativar notificações"}
        </Button>
      </div>
      {msg && <p className="text-xs text-zinc-500">{msg}</p>}
    </div>
  );
}