import { useState, useEffect, useMemo } from "react";
import { Search, X } from "lucide-react";

function normalize(s: string) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function JobPicker({
  jobs,
  value,
  onChange,
}: {
  jobs: any[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const selected = jobs.find((j: any) => j.id === value);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    const list = q
      ? jobs.filter((j: any) => normalize(j.title).includes(q))
      : jobs;
    return list.slice(0, 50);
  }, [jobs, query]);

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  function select(job: any) {
    onChange(job.id);
    setQuery("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[highlight]) select(results[highlight]);
    }
  }

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
        <span className="min-w-0 truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {selected.title}
        </span>
        <button
          type="button"
          onClick={() => onChange("")}
          className="flex shrink-0 items-center gap-1 text-xs text-red-600 hover:underline"
        >
          <X className="h-3 w-3" />
          Alterar
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-zinc-200 dark:border-zinc-700">
      <div className="flex items-center gap-2 border-b border-zinc-100 px-3 dark:border-zinc-800">
        <Search className="h-4 w-4 shrink-0 text-zinc-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={`Pesquisar entre ${jobs.length} projetos...`}
          className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
        />
      </div>
      <div className="max-h-60 overflow-y-auto p-1">
        {results.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-zinc-400">
            Nenhum projeto encontrado.
          </p>
        ) : (
          results.map((j: any, i: number) => (
            <button
              type="button"
              key={j.id}
              onClick={() => select(j)}
              onMouseEnter={() => setHighlight(i)}
              className={`block w-full truncate rounded px-3 py-2 text-left text-sm ${
                i === highlight
                  ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
                  : "text-zinc-700 dark:text-zinc-300"
              }`}
            >
              {j.title}
            </button>
          ))
        )}
        {!query && jobs.length > 50 && (
          <p className="px-3 py-2 text-center text-[11px] text-zinc-400">
            A mostrar 50 de {jobs.length}. Escreve para filtrar.
          </p>
        )}
      </div>
    </div>
  );
}