// src/app/pages/MyActivityPage.tsx

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useApp } from "../AppContext";
import { productionTasksAPI, jobsAPI } from "../api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "../components/ui/dialog";
import { JobPicker } from "../components/JobPicker";
import {
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
} from "lucide-react";

type ViewMode = "dia" | "semana" | "mes";

const DAY_NAMES = [
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
  "Dom",
];

// Pausas de lanche (em minutos desde a meia-noite) que não contam
const PAUSAS_LANCHE: [number, number][] = [
  [10 * 60 + 30, 10 * 60 + 40], // 10:30–10:40
  [16 * 60, 16 * 60 + 10], // 16:00–16:10
];

// Opções de almoço (valor em minutos; "0" = não almoçou)
const ALMOCO_OPCOES = [
  { value: "0", label: "Não almocei" },
  { value: "30", label: "30 minutos (½ hora)" },
  { value: "60", label: "1 hora" },
  { value: "90", label: "1 hora e meia" },
];

// Data no formato YYYY-MM-DD, na hora local (toISOString devolvia o dia anterior em Lisboa)
function toDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function startOfWeekMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// Intervalo de datas que a vista atual mostra (só este período é pedido à base de dados)
function periodoVisivel(view: ViewMode, cursor: Date) {
  if (view === "dia") {
    const s = toDateInput(cursor);
    return { from: s, to: s };
  }
  if (view === "semana") {
    const inicio = startOfWeekMonday(cursor);
    return {
      from: toDateInput(inicio),
      to: toDateInput(addDays(inicio, 6)),
    };
  }
  // Mês: a grelha tem 42 dias a começar na segunda da primeira semana
  const primeiro = startOfWeekMonday(
    new Date(cursor.getFullYear(), cursor.getMonth(), 1),
  );
  return {
    from: toDateInput(primeiro),
    to: toDateInput(addDays(primeiro, 41)),
  };
}

// Chave do dia de um registo ("YYYY-MM-DD"), mesmo que a coluna venha com hora
function chaveDia(row: any) {
  return String(row.data).slice(0, 10);
}

function formatDataLonga(data?: string) {
  if (!data) return "";
  return new Date(
    `${String(data).slice(0, 10)}T00:00:00`,
  ).toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// ---------- Cálculo de horas ----------

// Converte "HH:MM" (ou "HH:MM:SS") em minutos desde a meia-noite
function toMinutes(time?: string | null): number | null {
  if (!time) return null;
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

// Minutos brutos entre início e fim; null se inválido
function minutesBetween(
  inicio?: string | null,
  fim?: string | null,
): number | null {
  const a = toMinutes(inicio);
  const b = toMinutes(fim);
  if (a === null || b === null || b <= a) return null;
  return b - a;
}

// Minutos de sobreposição entre dois intervalos
function overlap(
  a1: number,
  a2: number,
  b1: number,
  b2: number,
) {
  return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
}

// Total líquido: desconta pausas de lanche e o almoço escolhido
function netMinutes(
  inicio?: string | null,
  fim?: string | null,
  almocoMin?: number | null,
): number | null {
  const a = toMinutes(inicio);
  const b = toMinutes(fim);
  if (a === null || b === null || b <= a) return null;
  const pausas = PAUSAS_LANCHE.reduce(
    (acc, [p1, p2]) => acc + overlap(a, b, p1, p2),
    0,
  );
  return Math.max(0, b - a - pausas - (almocoMin ?? 0));
}

// Ex.: 510 min -> "8,5 h"
function formatHours(mins: number) {
  return `${(mins / 60).toLocaleString("pt-PT", {
    maximumFractionDigits: 2,
  })} h`;
}

// ---------- Exportação (Excel / Word) ----------

// Período exportado: dia e semana = o que se vê; mês = só os dias do mês
// (a grelha do mês mostra também dias dos meses vizinhos)
function periodoExport(view: ViewMode, cursor: Date) {
  if (view === "mes") {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    return {
      from: toDateInput(new Date(y, m, 1)),
      to: toDateInput(new Date(y, m + 1, 0)),
    };
  }
  return periodoVisivel(view, cursor);
}

function formatDataCurta(chave: string) {
  const [y, m, d] = chave.split("-");
  return `${d}/${m}/${y}`;
}

// 510 min -> "8,50" (vírgula decimal: o Excel em PT lê como número)
function formatHorasNumero(mins: number) {
  return (mins / 60).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function almocoTexto(min?: number | null) {
  if (min == null) return "-";
  if (min === 0) return "Não";
  return `${min} min`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// CSV com ";" e BOM: abre direto no Excel com os acentos certos
function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
) {
  const escapeCell = (value: string | number) => {
    let str = String(value ?? "");
    // evita que o Excel interprete texto como fórmula
    if (/^[=+@]|^-(?=\w)/.test(str)) str = `'${str}`;
    if (/[;"\r\n]/.test(str))
      return `"${str.replace(/"/g, '""')}"`;
    return str;
  };
  const lines = [
    headers.map(escapeCell).join(";"),
    ...rows.map((row) => row.map(escapeCell).join(";")),
  ];
  downloadBlob(
    new Blob(["﻿" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    }),
    filename,
  );
}

// Registos do período, ordenados, com as horas líquidas já calculadas
function buildExport(
  rows: any[],
  view: ViewMode,
  cursor: Date,
) {
  const { from, to } = periodoExport(view, cursor);
  const linhas = rows
    .filter((r) => {
      const k = chaveDia(r);
      return k >= from && k <= to;
    })
    .sort(
      (a, b) =>
        chaveDia(a).localeCompare(chaveDia(b)) ||
        String(a.hora_inicio ?? "").localeCompare(
          String(b.hora_inicio ?? ""),
        ),
    )
    .map((r) => ({
      chave: chaveDia(r),
      data: formatDataCurta(chaveDia(r)),
      titulo: r.titulo || "(sem título)",
      inicio: r.hora_inicio?.slice(0, 5) ?? "",
      fim: r.hora_fim?.slice(0, 5) ?? "",
      almoco: almocoTexto(r.almoco_minutos),
      mins:
        netMinutes(
          r.hora_inicio,
          r.hora_fim,
          r.almoco_minutos,
        ) ?? 0,
    }));
  const total = linhas.reduce((s, l) => s + l.mins, 0);
  return { from, to, linhas, total };
}

function exportarExcel(
  rows: any[],
  view: ViewMode,
  cursor: Date,
) {
  const d = buildExport(rows, view, cursor);
  if (d.linhas.length === 0) {
    alert("Sem registos neste período.");
    return;
  }
  const linhas: (string | number)[][] = d.linhas.map((l) => [
    l.data,
    l.titulo,
    l.inicio,
    l.fim,
    l.almoco,
    formatHorasNumero(l.mins),
  ]);
  linhas.push(["", "", "", "", "", ""]);
  linhas.push([
    "TOTAL",
    "",
    "",
    "",
    "",
    formatHorasNumero(d.total),
  ]);
  downloadCsv(
    `atividade_${d.from}_${d.to}.csv`,
    ["Data", "Título", "Início", "Fim", "Almoço", "Horas"],
    linhas,
  );
}

function exportarWord(
  rows: any[],
  view: ViewMode,
  cursor: Date,
  periodoTitulo: string,
  nomeUtilizador: string,
) {
  const d = buildExport(rows, view, cursor);
  if (d.linhas.length === 0) {
    alert("Sem registos neste período.");
    return;
  }

  const td = "padding:6px 10px; border:1px solid #e4e4e7;";
  const tdR = `${td} text-align:right;`;

  const linhasHtml = d.linhas
    .map(
      (l) => `
        <tr>
          <td style="${td}">${escapeHtml(l.data)}</td>
          <td style="${td}">${escapeHtml(l.titulo)}</td>
          <td style="${td}">${escapeHtml(l.inicio)}–${escapeHtml(l.fim)}</td>
          <td style="${td}">${escapeHtml(l.almoco)}</td>
          <td style="${tdR} font-weight:bold;">${formatHorasNumero(l.mins)} h</td>
        </tr>`,
    )
    .join("");

  // Resumo por dia (só em semana/mês)
  let resumoHtml = "";
  if (view !== "dia") {
    const porDia = new Map<string, number>();
    for (const l of d.linhas) {
      porDia.set(l.chave, (porDia.get(l.chave) ?? 0) + l.mins);
    }
    const linhasResumo = [...porDia.entries()]
      .map(
        ([chave, mins]) => `
        <tr>
          <td style="${td}">${formatDataCurta(chave)}</td>
          <td style="${tdR} font-weight:bold;">${formatHorasNumero(mins)} h</td>
        </tr>`,
      )
      .join("");
    resumoHtml = `
        <h2>Resumo por dia</h2>
        <table>
          <tr><th>Data</th><th style="text-align:right;">Horas</th></tr>
          ${linhasResumo}
        </table>`;
  }

  const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
      <head>
        <meta charset="utf-8">
        <title>Atividade - ${escapeHtml(periodoTitulo)}</title>
        <style>
          body { font-family: Calibri, Arial, sans-serif; color: #18181b; margin: 0; }
          .header { padding: 0 0 18px; border-bottom: 3px solid #dc2626; margin-bottom: 26px; }
          .doc-title { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #dc2626; font-weight: bold; margin: 0 0 4px; }
          h1 { color: #18181b; margin: 0; font-size: 24px; }
          .sub { color: #71717a; font-size: 13px; margin: 6px 0 0; }
          h2 { font-size: 12px; color: #dc2626; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 2px solid #f4f4f5; padding-bottom: 8px; margin-top: 30px; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
          th { background: #f4f4f5; text-align: left; padding: 6px 10px; border: 1px solid #e4e4e7; font-size: 11px; text-transform: uppercase; color: #71717a; }
        </style>
      </head>
      <body style="padding: 30px 36px;">
        <div class="header">
          <p class="doc-title">Registo de Atividade</p>
          <h1>${escapeHtml(nomeUtilizador || "Utilizador")}</h1>
          <p class="sub">${escapeHtml(periodoTitulo)}</p>
        </div>

        <h2>Registos</h2>
        <table>
          <tr><th>Data</th><th>Título</th><th>Horário</th><th>Almoço</th><th style="text-align:right;">Horas</th></tr>
          ${linhasHtml}
        </table>
        ${resumoHtml}

        <p style="text-align:right; font-weight:bold; font-size:15px; margin-top:24px;">
          Total de horas: ${formatHorasNumero(d.total)} h
        </p>
        <p style="color:#a1a1aa; font-size:10px;">
          Horas líquidas: pausas de lanche (10:30–10:40 e 16:00–16:10) e almoço já descontados.
        </p>
      </body>
      </html>
    `;

  downloadBlob(
    new Blob(["﻿", html], { type: "application/msword" }),
    `atividade_${d.from}_${d.to}.doc`,
  );
}

export function MyActivityPage() {
  const { currentUser } = useApp();
  const userId = currentUser?.id;

  const [rows, setRows] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("semana");
  const [cursor, setCursor] = useState(new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<any | null>(
    null,
  );

  const pedidoAtual = useRef(0);
  const jobsPedidos = useRef(false);

  // Só pede o período visível e ignora respostas antigas
  const loadRows = useCallback(async () => {
    if (!userId) return;
    const id = ++pedidoAtual.current;
    setLoading(true);
    try {
      const { from, to } = periodoVisivel(view, cursor);
      const data = await productionTasksAPI.getAll(from, to);
      if (id === pedidoAtual.current) {
        setRows(data.filter((r: any) => r.user_id === userId));
      }
    } catch (error) {
      console.error("Erro ao carregar atividade:", error);
    } finally {
      if (id === pedidoAtual.current) setLoading(false);
    }
  }, [userId, view, cursor]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  // Trabalhos: só quando um diálogo (criar/editar) abre pela primeira vez
  useEffect(() => {
    if (!(createOpen || editingRow) || jobsPedidos.current)
      return;
    jobsPedidos.current = true;
    jobsAPI
      .getAll()
      .then((data: any[]) =>
        setJobs(
          data.filter((j: any) => j.status === "em_curso"),
        ),
      )
      .catch((error: unknown) => {
        jobsPedidos.current = false;
        console.error("Erro ao carregar trabalhos:", error);
      });
  }, [createOpen, editingRow]);

  // Agrupa por dia e calcula os totais uma única vez
  const { rowsPorDia, totaisPorDia } = useMemo(() => {
    const porDia = new Map<string, any[]>();
    const totais = new Map<string, number>();
    for (const r of rows) {
      const chave = chaveDia(r);
      const lista = porDia.get(chave);
      if (lista) lista.push(r);
      else porDia.set(chave, [r]);
      const liquidos =
        netMinutes(
          r.hora_inicio,
          r.hora_fim,
          r.almoco_minutos,
        ) ?? 0;
      totais.set(chave, (totais.get(chave) ?? 0) + liquidos);
    }
    return { rowsPorDia: porDia, totaisPorDia: totais };
  }, [rows]);

  const dayRows = (day: Date) =>
    rowsPorDia.get(toDateInput(day)) ?? [];
  const dayTotal = (day: Date) =>
    totaisPorDia.get(toDateInput(day)) ?? 0;

  function shift(direction: number) {
    setCursor((current) => {
      if (view === "dia") return addDays(current, direction);
      if (view === "semana")
        return addDays(current, direction * 7);
      const d = new Date(current);
      d.setMonth(d.getMonth() + direction);
      return d;
    });
  }

  const weekStart = startOfWeekMonday(cursor);
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    addDays(weekStart, i),
  );

  const title =
    view === "dia"
      ? cursor.toLocaleDateString("pt-PT", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      : view === "semana"
        ? `${weekDays[0].toLocaleDateString("pt-PT", { day: "numeric", month: "short" })} — ${weekDays[6].toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" })}`
        : cursor.toLocaleDateString("pt-PT", {
            month: "long",
            year: "numeric",
          });

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-red-600">
            O MEU ESPAÇO
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            A Minha Atividade
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Os teus registos de horas. Clica num registo para o
            editar.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="h-10 bg-red-600 text-white hover:bg-red-700">
              <Plus className="mr-2 h-4 w-4" />
              Novo Registo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
            <DialogHeader>
              <DialogTitle>Novo Registo</DialogTitle>
              <DialogDescription>
                Regista o teu trabalho para um dia específico.
              </DialogDescription>
            </DialogHeader>
            <RegistoForm
              jobs={jobs}
              currentUser={currentUser}
              onClose={() => setCreateOpen(false)}
              onSaved={loadRows}
            />
          </DialogContent>
        </Dialog>
      </header>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 border-b border-zinc-100 px-4 py-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => shift(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => shift(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="ml-1 h-8 text-xs text-red-600"
              onClick={() => setCursor(new Date())}
            >
              Hoje
            </Button>
            <h2 className="ml-2 text-sm font-semibold capitalize text-zinc-800 dark:text-zinc-100">
              {title}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={loading}
              onClick={() => exportarExcel(rows, view, cursor)}
            >
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={loading}
              onClick={() =>
                exportarWord(
                  rows,
                  view,
                  cursor,
                  title,
                  currentUser?.nome ?? "",
                )
              }
            >
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              Word
            </Button>
            <div className="flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
              {(["dia", "semana", "mes"] as ViewMode[]).map(
                (v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                      view === v
                        ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                        : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    }`}
                  >
                    {v === "mes" ? "Mês" : v}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[28rem] items-center justify-center text-sm text-zinc-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />A
            carregar registos…
          </div>
        ) : view === "dia" ? (
          <div className="min-h-[20rem] space-y-2 p-4">
            {dayRows(cursor).length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-400">
                Sem registos neste dia.
              </p>
            ) : (
              <>
                {dayRows(cursor).map((row: any) => (
                  <TaskPill
                    key={row.id}
                    row={row}
                    onClick={() => setEditingRow(row)}
                  />
                ))}
                <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-4 py-3 dark:bg-zinc-800/50">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Total do dia
                  </span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                    {formatHours(dayTotal(cursor))}
                  </span>
                </div>
              </>
            )}
          </div>
        ) : view === "semana" ? (
          <div className="space-y-3 p-4">
            {weekDays.map((day) => {
              const hoje = isSameDay(day, new Date());
              const registos = dayRows(day);
              const total = dayTotal(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`overflow-hidden rounded-lg border ${
                    hoje
                      ? "border-red-200 dark:border-red-900/50"
                      : "border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  {/* Cabeçalho do dia */}
                  <div
                    className={`flex items-center justify-between px-4 py-2.5 ${
                      hoje
                        ? "bg-red-50 dark:bg-red-950/30"
                        : "bg-zinc-50 dark:bg-zinc-800/60"
                    }`}
                  >
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`text-[11px] font-semibold uppercase tracking-wider ${
                          hoje
                            ? "text-red-600"
                            : "text-zinc-400"
                        }`}
                      >
                        {DAY_NAMES[(day.getDay() + 6) % 7]}
                      </span>
                      <span
                        className={`text-base font-semibold ${
                          hoje
                            ? "text-red-600"
                            : "text-zinc-800 dark:text-zinc-100"
                        }`}
                      >
                        {day.getDate()}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50">
                      {total > 0 ? formatHours(total) : "—"}
                    </span>
                  </div>

                  {/* Registos do dia, uns debaixo dos outros */}
                  <div className="space-y-2 bg-white p-2 dark:bg-zinc-900">
                    {registos.length === 0 ? (
                      <p className="px-2 py-1 text-xs text-zinc-400">
                        Sem registos.
                      </p>
                    ) : (
                      registos.map((row: any) => (
                        <TaskPill
                          key={row.id}
                          wrap
                          row={row}
                          onClick={() => setEditingRow(row)}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <MonthView
            cursor={cursor}
            rowsPorDia={rowsPorDia}
            totaisPorDia={totaisPorDia}
            onSelect={setEditingRow}
          />
        )}
      </section>

      {/* Modal: editar registo */}
      <Dialog
        open={Boolean(editingRow)}
        onOpenChange={(open) => !open && setEditingRow(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar Registo</DialogTitle>
            <DialogDescription>
              {editingRow && formatDataLonga(editingRow.data)}
            </DialogDescription>
          </DialogHeader>
          {editingRow && (
            <RegistoForm
              key={editingRow.id}
              row={editingRow}
              jobs={jobs}
              currentUser={currentUser}
              onClose={() => setEditingRow(null)}
              onSaved={loadRows}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskPill({
  row,
  onClick,
  compact = false,
  wrap = false,
}: {
  row: any;
  onClick: () => void;
  compact?: boolean;
  wrap?: boolean;
}) {
  const liquidos = netMinutes(
    row.hora_inicio,
    row.hora_fim,
    row.almoco_minutos,
  );
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 text-left transition-shadow hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-800 ${
        compact ? "p-2" : ""
      }`}
    >
      <p
        className={`min-w-0 text-xs font-semibold text-zinc-900 dark:text-zinc-50 ${
          wrap ? "whitespace-normal break-words" : "truncate"
        }`}
      >
        {row.titulo || "(sem título)"}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[10px]">
        <span className="text-zinc-500 dark:text-zinc-400">
          {row.hora_inicio && row.hora_fim
            ? `${row.hora_inicio.slice(0, 5)}–${row.hora_fim.slice(0, 5)}`
            : "Sem horário"}
        </span>
        {liquidos !== null && (
          <span className="font-bold text-zinc-900 dark:text-zinc-50">
            {formatHours(liquidos)}
          </span>
        )}
      </div>
    </button>
  );
}

function MonthView({
  cursor,
  rowsPorDia,
  totaisPorDia,
  onSelect,
}: {
  cursor: Date;
  rowsPorDia: Map<string, any[]>;
  totaisPorDia: Map<string, number>;
  onSelect: (row: any) => void;
}) {
  const first = startOfWeekMonday(
    new Date(cursor.getFullYear(), cursor.getMonth(), 1),
  );
  const days = Array.from({ length: 42 }, (_, i) =>
    addDays(first, i),
  );

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-7 border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
          {DAY_NAMES.map((d) => (
            <div
              key={d}
              className="px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-zinc-400"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 divide-x divide-y divide-zinc-100 dark:divide-zinc-800">
          {days.map((day) => {
            const chave = toDateInput(day);
            const dRows = rowsPorDia.get(chave) ?? [];
            const total = totaisPorDia.get(chave) ?? 0;
            const currentMonth =
              day.getMonth() === cursor.getMonth();
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[6.5rem] p-2 ${
                  currentMonth
                    ? "bg-white dark:bg-zinc-900"
                    : "bg-zinc-50/60 dark:bg-zinc-900/40"
                }`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <div
                    className={`text-xs font-medium ${
                      isSameDay(day, new Date())
                        ? "grid h-6 w-6 place-items-center rounded-full bg-red-600 text-white"
                        : currentMonth
                          ? "text-zinc-700 dark:text-zinc-300"
                          : "text-zinc-300 dark:text-zinc-700"
                    }`}
                  >
                    {day.getDate()}
                  </div>
                  {total > 0 && (
                    <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-50">
                      {formatHours(total)}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  {dRows.slice(0, 3).map((row: any) => (
                    <button
                      key={row.id}
                      onClick={() => onSelect(row)}
                      className="block w-full truncate rounded bg-zinc-100 px-1.5 py-1 text-left text-[10px] font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {row.titulo || "(sem título)"}
                    </button>
                  ))}
                  {dRows.length > 3 && (
                    <p className="px-1 text-[10px] text-zinc-400">
                      +{dRows.length - 3} registos
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Campo de seleção do almoço
function AlmocoSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Almoço *</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="h-10 w-full rounded-md border border-zinc-200 bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/30 dark:border-zinc-700"
      >
        <option value="" disabled>
          Escolhe uma opção
        </option>
        {ALMOCO_OPCOES.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Formulário único: cria um registo novo ou edita um existente (se vier "row")
function RegistoForm({
  row,
  jobs,
  currentUser,
  onClose,
  onSaved,
}: {
  row?: any;
  jobs: any[];
  currentUser: any;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const isEdit = Boolean(row);
  const [loading, setLoading] = useState(false);
  const [titulo, setTitulo] = useState(
    row?.titulo && row.titulo !== "(sem título)"
      ? row.titulo
      : "",
  );
  const [jobId, setJobId] = useState(row?.job_id ?? "");
  const [data, setData] = useState(
    row?.data
      ? String(row.data).slice(0, 10)
      : toDateInput(new Date()),
  );
  const [horaInicio, setHoraInicio] = useState(
    row?.hora_inicio?.slice(0, 5) ?? "",
  );
  const [horaFim, setHoraFim] = useState(
    row?.hora_fim?.slice(0, 5) ?? "",
  );
  const [almoco, setAlmoco] = useState(
    row?.almoco_minutos != null
      ? String(row.almoco_minutos)
      : "",
  );

  const horasCalculadas = netMinutes(
    horaInicio,
    horaFim,
    almoco === "" ? null : Number(almoco),
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) {
      alert("Indica o título do registo.");
      return;
    }
    if (minutesBetween(horaInicio, horaFim) === null) {
      alert(
        "A hora de fim tem de ser posterior à hora de início.",
      );
      return;
    }
    if (almoco === "") {
      alert("Escolhe a opção de almoço.");
      return;
    }
    if (!isEdit && !currentUser?.id) {
      alert("Sessão inválida. Volta a iniciar sessão.");
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await productionTasksAPI.updateTask(row.task_id, {
          titulo: titulo.trim(),
          jobId: jobId || null,
          data,
        });
        await productionTasksAPI.updateAssignee(row.id, {
          horaInicio,
          horaFim,
          almocoMinutos: Number(almoco),
        });
      } else {
        await productionTasksAPI.create({
          jobId: jobId || null,
          titulo: titulo.trim(),
          data,
          horaInicio,
          horaFim,
          almocoMinutos: Number(almoco),
          createdBy: currentUser?.id,
          assigneeIds: [currentUser?.id],
        });
      }
      await onSaved();
      onClose();
    } catch (error: any) {
      console.error("Erro ao guardar registo:", error);
      alert(
        `Erro ao guardar registo: ${error?.message ?? JSON.stringify(error)}`,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="mt-3 grid gap-5 md:grid-cols-3"
      onSubmit={submit}
    >
      <div className="space-y-2 md:col-span-3">
        <Label htmlFor="titulo">Título *</Label>
        <Input
          id="titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex.: Montagem de estrutura"
          required
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label>Trabalho (opcional)</Label>
        <JobPicker
          jobs={jobs}
          value={jobId}
          onChange={setJobId}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="data">Data *</Label>
        <Input
          id="data"
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="horaInicio">Hora Início *</Label>
        <Input
          id="horaInicio"
          type="time"
          value={horaInicio}
          onChange={(e) => setHoraInicio(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="horaFim">Hora Fim *</Label>
        <Input
          id="horaFim"
          type="time"
          value={horaFim}
          onChange={(e) => setHoraFim(e.target.value)}
          required
        />
      </div>

      <AlmocoSelect
        id="almoco"
        value={almoco}
        onChange={setAlmoco}
      />

      <div className="space-y-2 md:col-span-3">
        <Label>Total de horas</Label>
        <div className="flex h-10 items-center rounded-md border border-zinc-200 bg-zinc-50 px-3 text-sm font-bold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50">
          {horasCalculadas !== null
            ? formatHours(horasCalculadas)
            : "—"}
        </div>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          Pausas de lanche (10:30–10:40 e 16:00–16:10)
          descontadas automaticamente.
        </p>
      </div>

      <DialogFooter className="mt-2 md:col-span-3">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="bg-red-600 hover:bg-red-700"
          disabled={loading}
        >
          {loading && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {isEdit ? "Guardar Alterações" : "Criar Registo"}
        </Button>
      </DialogFooter>
    </form>
  );
}