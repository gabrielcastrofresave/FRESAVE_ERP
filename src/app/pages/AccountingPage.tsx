// src/app/pages/AccountingPage.tsx

import { useState, useEffect, useMemo } from "react";
import { useApp } from "../AppContext";
import {
  jobsAPI,
  productionTasksAPI,
  accountingAPI,
} from "../api";
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
} from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import {
  ShieldAlert,
  Loader2,
  Wrench,
  Clock3,
  Package,
  Plus,
  Trash2,
  Download,
  FileText,
  Calculator,
} from "lucide-react";

function formatEuro(value: number) {
  return `${value.toFixed(2)} €`;
}

function formatDatePt(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-PT");
}

function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
) {
  const escapeCell = (value: string | number) => {
    const str = String(value ?? "");
    if (
      str.includes(";") ||
      str.includes('"') ||
      str.includes("\n")
    ) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [
    headers.map(escapeCell).join(";"),
    ...rows.map((row) => row.map(escapeCell).join(";")),
  ];
  const csvContent = "\ufeff" + lines.join("\r\n");
  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function AccountingPage() {
  const { currentUser } = useApp();

  if (
    currentUser?.role !== "administrador" &&
    currentUser?.role !== "escritorio"
  ) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
        <ShieldAlert className="h-10 w-10 text-zinc-300" />
        <h1 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
          Acesso Restrito
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Esta página só está disponível para administração e
          escritório.
        </p>
      </div>
    );
  }

  const [jobs, setJobs] = useState<any[]>([]);
  const [assigneeRows, setAssigneeRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] =
    useState<string>("");

  const loadJobs = async () => {
    setLoading(true);
    try {
      const [jobsData, rowsData] = await Promise.all([
        jobsAPI.getAll(),
        productionTasksAPI.getAll(),
      ]);
      setJobs(jobsData);
      setAssigneeRows(rowsData);
      if (!selectedJobId && jobsData.length > 0) {
        setSelectedJobId(jobsData[0].id);
      }
    } catch (error) {
      console.error("Erro ao carregar projetos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedJob = jobs.find(
    (j: any) => j.id === selectedJobId,
  );

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <p className="text-xs font-semibold tracking-[0.14em] text-red-600">
          FINANCEIRO
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Contabilidade de Projetos
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          Consulta o custo total de cada máquina/projeto: horas
          trabalhadas, peças utilizadas e outros custos.
        </p>
      </header>

      <section className="grid gap-5 lg:grid-cols-[280px_1fr]">
        {/* Lista de projetos */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
              Projetos
            </p>
          </div>
          {loading ? (
            <div className="flex min-h-32 items-center justify-center text-sm text-zinc-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />A
              carregar…
            </div>
          ) : jobs.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-400">
              Nenhum projeto encontrado.
            </p>
          ) : (
            <div className="max-h-[32rem] divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
              {jobs.map((job: any) => (
                <button
                  key={job.id}
                  onClick={() => setSelectedJobId(job.id)}
                  className={`block w-full px-4 py-3 text-left transition-colors ${
                    selectedJobId === job.id
                      ? "bg-red-50 dark:bg-red-950/20"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  <p
                    className={`truncate text-sm font-medium ${
                      selectedJobId === job.id
                        ? "text-red-700 dark:text-red-400"
                        : "text-zinc-800 dark:text-zinc-100"
                    }`}
                  >
                    {job.title}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-zinc-400">
                    {job.reference}
                  </p>
                  <Badge
                    className={`mt-1.5 ${
                      job.status === "concluido"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400"
                        : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    {job.status === "concluido"
                      ? "Concluído"
                      : "Em Curso"}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ficha de custos do projeto selecionado */}
        {selectedJob ? (
          <JobCostSheet
            key={selectedJob.id}
            job={selectedJob}
            assigneeRows={assigneeRows}
          />
        ) : (
          <div className="flex min-h-64 items-center justify-center rounded-xl border border-zinc-200 bg-white text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
            Seleciona um projeto para veres os custos.
          </div>
        )}
      </section>
    </div>
  );
}

function JobCostSheet({
  job,
  assigneeRows,
}: {
  job: any;
  assigneeRows: any[];
}) {
  const [parts, setParts] = useState<any[]>([]);
  const [hourLines, setHourLines] = useState<any[]>([]);
  const [extraCosts, setExtraCosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addExtraOpen, setAddExtraOpen] = useState(false);
  const [savingRateId, setSavingRateId] = useState<
    string | null
  >(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [partsData, hourData, extraData] =
        await Promise.all([
          accountingAPI.getPartsForJob(job.id),
          accountingAPI.getHourLinesForJob(
            job.id,
            assigneeRows,
          ),
          accountingAPI.getExtraCosts(job.id),
        ]);
      setParts(partsData);
      setHourLines(hourData);
      setExtraCosts(extraData);
    } catch (error) {
      console.error("Erro ao carregar custos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id]);

  const handleRateChange = async (
    lineId: string,
    value: string,
  ) => {
    const rate = Number(value) || 0;
    setHourLines((current) =>
      current.map((l) =>
        l.id === lineId
          ? { ...l, rate, subtotal: l.hours * rate }
          : l,
      ),
    );
  };

  const handleRateBlur = async (
    lineId: string,
    rate: number,
  ) => {
    setSavingRateId(lineId);
    try {
      await accountingAPI.saveHourRate(lineId, rate);
    } catch (error) {
      console.error("Erro ao guardar preço/hora:", error);
    } finally {
      setSavingRateId(null);
    }
  };

  const handleDeleteExtra = async (id: string) => {
    if (confirm("Eliminar este custo?")) {
      await accountingAPI.deleteExtraCost(id);
      await loadData();
    }
  };

  const totalParts = parts.reduce(
    (sum, p) => sum + p.subtotal,
    0,
  );
  const totalHours = hourLines.reduce(
    (sum, l) => sum + l.subtotal,
    0,
  );
  const totalExtras = extraCosts.reduce(
    (sum, e) => sum + Number(e.valor),
    0,
  );
  const grandTotal = totalParts + totalHours + totalExtras;

  const exportCsv = () => {
    const rows: (string | number)[][] = [];
    rows.push(["PEÇAS", "", "", "", ""]);
    rows.push([
      "Artigo",
      "Quantidade",
      "Preço Unitário",
      "Data",
      "Subtotal",
    ]);
    parts.forEach((p) =>
      rows.push([
        p.item_nome,
        p.quantidade,
        p.preco_unitario.toFixed(2),
        formatDatePt(p.data),
        p.subtotal.toFixed(2),
      ]),
    );
    rows.push(["", "", "", "", ""]);
    rows.push(["HORAS TRABALHADAS", "", "", "", ""]);
    rows.push([
      "Utilizador",
      "Data",
      "Horas",
      "Preço/Hora",
      "Subtotal",
    ]);
    hourLines.forEach((l) =>
      rows.push([
        l.user_nome,
        formatDatePt(l.data),
        l.hours.toFixed(2),
        l.rate.toFixed(2),
        l.subtotal.toFixed(2),
      ]),
    );
    rows.push(["", "", "", "", ""]);
    rows.push(["OUTROS CUSTOS", "", "", "", ""]);
    rows.push(["Descrição", "Categoria", "", "", "Valor"]);
    extraCosts.forEach((e) =>
      rows.push([
        e.descricao,
        e.categoria || "-",
        "",
        "",
        Number(e.valor).toFixed(2),
      ]),
    );
    rows.push(["", "", "", "", ""]);
    rows.push([
      "TOTAL GERAL",
      "",
      "",
      "",
      grandTotal.toFixed(2),
    ]);

    downloadCsv(
      `custos-${job.reference || job.title}.csv`,
      ["Item", "Col2", "Col3", "Col4", "Valor"],
      rows,
    );
  };

  const exportDoc = () => {
    const partsRows = parts
      .map(
        (p) => `
        <tr>
          <td style="padding:8px 12px; border:1px solid #e4e4e7;">${p.item_nome}</td>
          <td style="padding:8px 12px; border:1px solid #e4e4e7; text-align:right;">${p.quantidade}</td>
          <td style="padding:8px 12px; border:1px solid #e4e4e7; text-align:right;">${formatEuro(p.preco_unitario)}</td>
          <td style="padding:8px 12px; border:1px solid #e4e4e7; text-align:right; font-weight:bold;">${formatEuro(p.subtotal)}</td>
        </tr>`,
      )
      .join("");

    const hourRows = hourLines
      .map(
        (l) => `
        <tr>
          <td style="padding:8px 12px; border:1px solid #e4e4e7;">${l.user_nome}</td>
          <td style="padding:8px 12px; border:1px solid #e4e4e7;">${formatDatePt(l.data)}</td>
          <td style="padding:8px 12px; border:1px solid #e4e4e7; text-align:right;">${l.hours.toFixed(2)}h</td>
          <td style="padding:8px 12px; border:1px solid #e4e4e7; text-align:right;">${formatEuro(l.rate)}</td>
          <td style="padding:8px 12px; border:1px solid #e4e4e7; text-align:right; font-weight:bold;">${formatEuro(l.subtotal)}</td>
        </tr>`,
      )
      .join("");

    const extraRows = extraCosts
      .map(
        (e) => `
        <tr>
          <td style="padding:8px 12px; border:1px solid #e4e4e7;">${e.descricao}</td>
          <td style="padding:8px 12px; border:1px solid #e4e4e7;">${e.categoria || "-"}</td>
          <td style="padding:8px 12px; border:1px solid #e4e4e7; text-align:right; font-weight:bold;">${formatEuro(Number(e.valor))}</td>
        </tr>`,
      )
      .join("");

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
      <head>
        <meta charset="utf-8">
        <title>Custos - ${job.title}</title>
        <style>
          body { font-family: Calibri, Arial, sans-serif; color: #18181b; margin: 0; }
          .header { padding: 0 0 18px; border-bottom: 3px solid #dc2626; margin-bottom: 26px; }
          .doc-title { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #dc2626; font-weight: bold; margin: 0 0 4px; }
          h1 { color: #18181b; margin: 0; font-size: 24px; }
          h2 { font-size: 12px; color: #dc2626; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 2px solid #f4f4f5; padding-bottom: 8px; margin-top: 30px; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
          th { background: #f4f4f5; text-align: left; padding: 8px 12px; border: 1px solid #e4e4e7; font-size: 11px; text-transform: uppercase; color: #71717a; }
          .total-box { margin-top: 30px; padding: 16px 20px; background: #18181b; color: #ffffff; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; }
          .total-box .label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #a1a1aa; }
          .total-box .value { font-size: 22px; font-weight: bold; color: #ffffff; }
        </style>
      </head>
      <body style="padding: 30px 36px;">
        <div class="header">
          <p class="doc-title">Ficha de Custos de Projeto</p>
          <h1>${job.title}</h1>
        </div>

        <h2>Peças e Materiais</h2>
        <table>
          <tr><th>Artigo</th><th style="text-align:right;">Quantidade</th><th style="text-align:right;">Preço Unit.</th><th style="text-align:right;">Subtotal</th></tr>
          ${partsRows || `<tr><td colspan="4" style="padding:12px; text-align:center; color:#a1a1aa; border:1px solid #e4e4e7;">Sem peças registadas</td></tr>`}
        </table>
        <p style="text-align:right; font-weight:bold; font-size:13px;">Subtotal Peças: ${formatEuro(totalParts)}</p>

        <h2>Horas Trabalhadas</h2>
        <table>
          <tr><th>Utilizador</th><th>Data</th><th style="text-align:right;">Horas</th><th style="text-align:right;">Preço/Hora</th><th style="text-align:right;">Subtotal</th></tr>
          ${hourRows || `<tr><td colspan="5" style="padding:12px; text-align:center; color:#a1a1aa; border:1px solid #e4e4e7;">Sem horas registadas</td></tr>`}
        </table>
        <p style="text-align:right; font-weight:bold; font-size:13px;">Subtotal Horas: ${formatEuro(totalHours)}</p>

        <h2>Outros Custos</h2>
        <table>
          <tr><th>Descrição</th><th>Categoria</th><th style="text-align:right;">Valor</th></tr>
          ${extraRows || `<tr><td colspan="3" style="padding:12px; text-align:center; color:#a1a1aa; border:1px solid #e4e4e7;">Sem custos adicionais</td></tr>`}
        </table>
        <p style="text-align:right; font-weight:bold; font-size:13px;">Subtotal Outros: ${formatEuro(totalExtras)}</p>

        <div class="total-box">
          <span class="label">Custo Total do Projeto</span>
          <span class="value">${formatEuro(grandTotal)}</span>
        </div>
      </body>
      </html>
    `;
    const blob = new Blob(["\ufeff", html], {
      type: "application/msword",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `custos-${job.reference || job.title}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-xl border border-zinc-200 bg-white text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />A
        carregar ficha de custos…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header do projeto + total */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
              {job.reference}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {job.title}
            </h2>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-9"
              onClick={exportCsv}
            >
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button
              variant="outline"
              className="h-9"
              onClick={exportDoc}
            >
              <FileText className="mr-2 h-4 w-4" />
              Word
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between bg-zinc-900 px-5 py-4">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-400">
            Custo Total do Projeto
          </span>
          <span className="text-2xl font-bold text-white">
            {formatEuro(grandTotal)}
          </span>
        </div>
      </div>

      {/* Peças */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Peças e Materiais
            </h3>
          </div>
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {formatEuro(totalParts)}
          </span>
        </div>
        {parts.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-zinc-400">
            Sem peças atribuídas a este projeto.
          </p>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
              <tr>
                <th className="px-5 py-2">Artigo</th>
                <th className="px-4 py-2 text-right">Qtd.</th>
                <th className="px-4 py-2 text-right">
                  Preço Unit.
                </th>
                <th className="px-5 py-2 text-right">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {parts.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-2 text-sm text-zinc-800 dark:text-zinc-100">
                    {p.item_nome}
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-zinc-600 dark:text-zinc-300">
                    {p.quantidade}
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-zinc-600 dark:text-zinc-300">
                    {formatEuro(p.preco_unitario)}
                  </td>
                  <td className="px-5 py-2 text-right text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {formatEuro(p.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Horas trabalhadas */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Horas Trabalhadas
            </h3>
          </div>
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {formatEuro(totalHours)}
          </span>
        </div>
        {hourLines.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-zinc-400">
            Sem horas registadas para este projeto.
          </p>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
              <tr>
                <th className="px-5 py-2">Utilizador</th>
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2 text-right">Horas</th>
                <th className="px-4 py-2 text-right">
                  Preço/Hora
                </th>
                <th className="px-5 py-2 text-right">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {hourLines.map((l) => (
                <tr key={l.id}>
                  <td className="px-5 py-2 text-sm text-zinc-800 dark:text-zinc-100">
                    {l.user_nome}
                  </td>
                  <td className="px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {formatDatePt(l.data)}
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-zinc-600 dark:text-zinc-300">
                    {l.hours.toFixed(2)}h
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={l.rate || ""}
                        onChange={(e) =>
                          handleRateChange(l.id, e.target.value)
                        }
                        onBlur={(e) =>
                          handleRateBlur(
                            l.id,
                            Number(e.target.value) || 0,
                          )
                        }
                        className="h-8 w-24 text-right"
                        placeholder="0.00"
                      />
                      {savingRateId === l.id && (
                        <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-2 text-right text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {formatEuro(l.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Outros custos */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Outros Custos
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              {formatEuro(totalExtras)}
            </span>
            <Dialog
              open={addExtraOpen}
              onOpenChange={setAddExtraOpen}
            >
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="h-8 bg-red-600 text-xs text-white hover:bg-red-700"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Novo Custo</DialogTitle>
                </DialogHeader>
                <ExtraCostForm
                  jobId={job.id}
                  onClose={() => setAddExtraOpen(false)}
                  onSaved={loadData}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {extraCosts.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-zinc-400">
            Sem custos adicionais registados.
          </p>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
              <tr>
                <th className="px-5 py-2">Descrição</th>
                <th className="px-4 py-2">Categoria</th>
                <th className="px-4 py-2 text-right">Valor</th>
                <th className="px-5 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {extraCosts.map((e: any) => (
                <tr key={e.id}>
                  <td className="px-5 py-2 text-sm text-zinc-800 dark:text-zinc-100">
                    {e.descricao}
                  </td>
                  <td className="px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {e.categoria || "-"}
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {formatEuro(Number(e.valor))}
                  </td>
                  <td className="px-5 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:text-zinc-500 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                      onClick={() => handleDeleteExtra(e.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ExtraCostForm({
  jobId,
  onClose,
  onSaved,
}: {
  jobId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [valor, setValor] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await accountingAPI.addExtraCost(
        jobId,
        descricao,
        categoria,
        Number(valor) || 0,
      );
      await onSaved();
      onClose();
    } catch (error) {
      console.error("Erro ao adicionar custo:", error);
      alert("Erro ao adicionar custo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-3 space-y-4" onSubmit={submit}>
      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição *</Label>
        <Input
          id="descricao"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex: Transporte de material"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="categoria">Categoria</Label>
          <Input
            id="categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            placeholder="Ex: Logística"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="valor">Valor (€) *</Label>
          <Input
            id="valor"
            type="number"
            min="0"
            step="0.01"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            required
          />
        </div>
      </div>
      <DialogFooter className="mt-2">
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
          Adicionar
        </Button>
      </DialogFooter>
    </form>
  );
}