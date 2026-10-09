import { useMemo } from "react";

const LIMITE = 500;

function formatData(data?: string) {
  if (!data) return "—";
  const [y, m, d] = data.split("-");
  return `${d}/${m}/${y}`;
}

export function HorasWintouchTable({ rows }: { rows: any[] }) {
  const { visiveis, total, horas } = useMemo(() => {
    const importadas = rows
      .filter((r) => r.origem_wintouch)
      .sort((a, b) =>
        String(b.data ?? "").localeCompare(
          String(a.data ?? ""),
        ),
      );

    const horas = importadas.reduce(
      (s, r) => s + Number(r.horas_liquidas || 0),
      0,
    );

    return {
      visiveis: importadas.slice(0, LIMITE),
      total: importadas.length,
      horas,
    };
  }, [rows]);

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-1 border-b border-zinc-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          Horas importadas do Wintouch
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {total} registos · {horas.toFixed(2)} h somadas
          {total > LIMITE &&
            ` · a mostrar os ${LIMITE} mais recentes`}
        </p>
      </div>

      <div className="max-h-[32rem] overflow-auto">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="sticky top-0 bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-400 dark:bg-zinc-800/80">
            <tr>
              <th className="px-4 py-2 font-semibold">Data</th>
              <th className="px-4 py-2 font-semibold">
                Utilizador
              </th>
              <th className="px-4 py-2 font-semibold">
                Trabalho
              </th>
              <th className="px-4 py-2 text-right font-semibold">
                Horas
              </th>
              <th className="px-4 py-2 font-semibold">
                Origem
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {visiveis.map((r) => (
              <tr
                key={r.id}
                className="text-zinc-700 dark:text-zinc-300"
              >
                <td className="whitespace-nowrap px-4 py-2">
                  {formatData(r.data)}
                </td>
                <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-50">
                  {r.users?.nome ||
                    r.wintouch_nome ||
                    r.wintouch_custo ||
                    "—"}
                </td>
                <td
                  className="max-w-[260px] truncate px-4 py-2"
                  title={r.titulo}
                >
                  {r.titulo || "(sem título)"}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">
                  {r.horas_liquidas != null
                    ? Number(r.horas_liquidas).toFixed(2)
                    : "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-2 font-mono text-[10px] text-zinc-400">
                  {r.origem_wintouch}
                </td>
              </tr>
            ))}
            {visiveis.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-zinc-400"
                >
                  Sem horas importadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}