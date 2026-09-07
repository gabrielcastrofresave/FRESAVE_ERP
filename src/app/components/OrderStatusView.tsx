// src/app/components/OrderStatusView.tsx

import { CheckCircle2, Circle, Package } from "lucide-react";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function OrderStatusView({ job }: { job: any }) {
  const checklist = job.checklist || [];
  const doneCount = checklist.filter(
    (c: any) => c.checked,
  ).length;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400">
          <Package className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {job.title}
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {job.status === "concluido" ? (
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              Concluído em{" "}
              {job.completed_at
                ? formatDate(job.completed_at)
                : "-"}
            </span>
          ) : (
            <>
              Previsão de conclusão: {formatDate(job.due_date)}
            </>
          )}
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-5 text-center text-xs font-semibold uppercase tracking-[0.1em] text-zinc-400">
          {doneCount}/{checklist.length} fases concluídas
        </p>
        <div className="relative">
          {checklist.map((item: any, index: number) => (
            <div
              key={item.item_key}
              className="relative flex gap-4 pb-8 last:pb-0"
            >
              {index < checklist.length - 1 && (
                <div
                  className={`absolute left-[15px] top-8 h-full w-0.5 ${
                    item.checked
                      ? "bg-emerald-400"
                      : "bg-zinc-200 dark:bg-zinc-700"
                  }`}
                />
              )}
              <div
                className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                  item.checked
                    ? "bg-emerald-500 text-white"
                    : "border-2 border-zinc-300 bg-white text-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-700"
                }`}
              >
                {item.checked ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </div>
              <div className="pt-1">
                <p
                  className={`text-sm font-medium ${
                    item.checked
                      ? "text-zinc-900 dark:text-zinc-50"
                      : "text-zinc-400 dark:text-zinc-600"
                  }`}
                >
                  {item.label}
                </p>
                {item.checked && item.checked_at && (
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {formatDate(item.checked_at)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}