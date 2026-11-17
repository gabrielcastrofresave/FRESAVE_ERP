import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

const isChunkError = (error: Error) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk|error loading dynamically imported module/i.test(
    `${error?.name} ${error?.message}`,
  );

/**
 * Apanha erros ao desenhar a aplicação: em vez de ficar tudo em branco,
 * mostra o que se passou e deixa tentar de novo.
 * Se for uma versão nova do site (ficheiros antigos já não existem), recarrega sozinha uma vez.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error("Erro na aplicação:", error, info?.componentStack);
    if (isChunkError(error)) {
      try {
        if (sessionStorage.getItem("fresave-recarregou") !== "1") {
          sessionStorage.setItem("fresave-recarregou", "1");
          window.location.reload();
        }
      } catch {
        /* sem sessionStorage: fica o ecrã de erro */
      }
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="erp-surface w-full max-w-md p-6 text-center">
          <p className="text-xs font-semibold tracking-[0.14em] text-red-600">
            ALGO CORREU MAL
          </p>
          <h1 className="mt-2 text-xl font-bold text-foreground">
            Não foi possível mostrar este ecrã
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Os seus dados não foram afetados. Tente de novo; se
            continuar, envie-nos o texto abaixo.
          </p>
          <pre className="mt-4 max-h-32 overflow-auto rounded-xl bg-muted p-3 text-left text-xs text-muted-foreground whitespace-pre-wrap">
            {String(error?.message || error)}
          </pre>
          <div className="mt-5 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Tentar de novo
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Recarregar a página
            </button>
          </div>
        </div>
      </div>
    );
  }
}
