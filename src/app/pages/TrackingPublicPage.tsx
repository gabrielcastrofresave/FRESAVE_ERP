import { useState, useEffect } from "react";
import { trackingAPI } from "../api";
import { OrderStatusView } from "../components/OrderStatusView";
import { Loader2, PackageX } from "lucide-react";

export function TrackingPublicPage({ code }: { code: string }) {
  const [job, setJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    trackingAPI
      .getByCode(code)
      .then((data) => {
        if (!data) {
          setNotFound(true);
        } else {
          setJob(data);
        }
      })
      .catch((err) => {
        console.error("Erro ao consultar estado:", err);
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [code]);

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-12">
      <div className="mx-auto max-w-lg">
        <p className="mb-8 text-center text-xs font-semibold tracking-[0.14em] text-amber-600 dark:text-amber-300">
          FRESAVE · RASTREIO DE ENCOMENDA
        </p>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center text-sm text-zinc-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />A
            consultar estado…
          </div>
        ) : notFound ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-white py-16 text-center">
            <PackageX className="h-10 w-10 text-zinc-300" />
            <p className="text-sm font-medium text-zinc-700">
              Código não encontrado
            </p>
            <p className="max-w-xs text-xs text-zinc-400">
              Verifica se o código foi copiado corretamente e
              tenta novamente.
            </p>
          </div>
        ) : (
          <OrderStatusView job={job} />
        )}
      </div>
    </div>
  );
}