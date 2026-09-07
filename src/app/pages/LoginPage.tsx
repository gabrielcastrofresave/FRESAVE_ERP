import image_logo_1 from "@/imports/logo-grande.png";
import { useState } from "react";
import { useApp } from "../AppContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
  Search,
  Package,
} from "lucide-react";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [senha, setSenha] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const { login } = useApp();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const success = await login(identifier.trim(), senha);

      if (success) {
        if (rememberMe) {
          localStorage.setItem("rememberMe", "true");
        } else {
          localStorage.removeItem("rememberMe");
        }
      } else {
        setError("Nº de funcionário/email ou senha incorretos");
      }
    } catch (err) {
      setError("Erro ao fazer login");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingCode.trim()) return;
    window.location.href = `/?rastreio=${encodeURIComponent(
      trackingCode.trim().toUpperCase(),
    )}`;
  };

  return (
    <div className="min-h-screen px-5 py-8 lg:p-10 bg-slate-100">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl lg:grid-cols-[1.08fr_0.92fr]">
        {/* Painel esquerdo — institucional */}
        <section className="relative flex flex-col justify-between overflow-hidden bg-[#10374a] p-8 text-white lg:p-12">
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-[112px] items-center overflow-hidden rounded-xl bg-white px-2 shadow-lg shadow-black/20">
              <img
                src={image_logo_1}
                alt="Fresave"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <p className="font-semibold tracking-[0.16em] text-white text-[15px]">
                FRESAVE
              </p>
              <p className="text-slate-300 text-[12px]">
                Sistema de Gestão
              </p>
            </div>
          </div>

          <div className="relative my-16 max-w-lg lg:my-0">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-sky-100">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-300" />
              Área reservada à equipa
            </div>
            <h1 className="max-w-md text-4xl font-semibold leading-[1.06] tracking-tight lg:text-5xl">
              O controlo da frota, num só lugar.
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-slate-200">
              Acompanhe viaturas, stock, processos e manutenções
              com rastreabilidade completa.
            </p>
          </div>

          <div className="relative grid grid-cols-3 gap-3 text-xs text-slate-200">
            {[
              ["Frota", "Viaturas"],
              ["Manutenção", "Corretivas e Preventivas"],
              ["Processos", "Faturação e Deadlines"],
            ].map(([title, description]) => (
              <div
                key={title}
                className="rounded-xl border border-white/10 bg-white/[0.07] p-3 backdrop-blur-sm"
              >
                <p className="font-semibold text-white">
                  {title}
                </p>
                <p className="mt-1 leading-4 text-slate-300">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Painel direito — formulário */}
        <section className="flex items-center bg-white p-7 sm:p-12">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-8">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-[#0e7490]">
                <KeyRound className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-[#0e7490]">
                ACESSO AO SISTEMA
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                Bem-vindo de volta
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Introduza as suas credenciais para continuar.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="identifier">
                  Nº de Funcionário ou Email
                </Label>
                <Input
                  id="identifier"
                  value={identifier}
                  onChange={(e) =>
                    setIdentifier(e.target.value)
                  }
                  className="h-10"
                  placeholder="Ex: 12345 ou nome@email.com"
                  autoComplete="username"
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha">Palavra-passe</Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={showPassword ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="h-10 pr-10"
                    placeholder="Palavra-passe"
                    autoComplete="current-password"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={(checked) =>
                    setRememberMe(checked as boolean)
                  }
                  disabled={loading}
                />
                <Label
                  htmlFor="rememberMe"
                  className="font-normal cursor-pointer text-sm text-slate-600"
                >
                  Lembrar-me neste dispositivo
                </Label>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-xs leading-5 text-red-700">
                  {error}
                </div>
              )}

              <Button
                className="h-11 w-full bg-[#0e7490] text-white hover:bg-[#0a6078]"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>Entrar</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                ou
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <form
              onSubmit={handleTrack}
              className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <Package className="h-4 w-4 text-[#0e7490]" />
                <p className="text-sm font-medium text-slate-700">
                  Consultar estado de encomenda
                </p>
              </div>
              <div className="flex gap-2">
                <Input
                  value={trackingCode}
                  onChange={(e) =>
                    setTrackingCode(
                      e.target.value.toUpperCase(),
                    )
                  }
                  placeholder="Ex: AB12CD34"
                  className="h-10 flex-1 bg-white font-mono uppercase tracking-widest"
                />
                <Button
                  type="submit"
                  variant="outline"
                  className="h-10 shrink-0 border-[#0e7490] text-[#0e7490] hover:bg-[#0e7490] hover:text-white"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </form>

            <p className="mt-5 text-center text-xs leading-5 text-slate-400">
              Fresave · Sistema de Gestão
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}