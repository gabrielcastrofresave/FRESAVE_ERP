import image_logo_1 from "@/imports/logo-grande.png";
import { useState } from "react";
import { useApp } from "../AppContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { ArrowRight, Eye, EyeOff, KeyRound, Loader2, ShieldCheck, Search, Package, Radio, CheckCircle2 } from "lucide-react";

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
        if (rememberMe) localStorage.setItem("rememberMe", "true");
        else localStorage.removeItem("rememberMe");
      } else setError("Nº de funcionário/email ou senha incorretos");
    } catch (err) {
      setError("Erro ao fazer login");
      console.error(err);
    } finally { setLoading(false); }
  };

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingCode.trim()) return;
    window.location.href = `/?rastreio=${encodeURIComponent(trackingCode.trim().toUpperCase())}`;
  };

  return (
    <main className="min-h-screen bg-[#e4e4e7] p-3 sm:p-6 lg:p-8 dark:bg-[#050505]">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1400px] overflow-hidden rounded-[1.75rem] border border-white/60 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.16)] sm:min-h-[calc(100vh-3rem)] sm:rounded-[2rem] lg:grid-cols-[1.05fr_0.95fr] dark:border-white/10 dark:bg-[#0a0a0a]">
        <section className="relative flex min-h-[390px] flex-col justify-between overflow-hidden bg-[#0a0a0a] p-6 text-white sm:p-10 lg:min-h-0 lg:p-14">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border-[28px] border-red-400/10" />
          <div className="absolute -bottom-36 -left-24 h-80 w-80 rounded-full border-[36px] border-red-300/10" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-[116px] items-center overflow-hidden rounded-xl bg-white px-2 shadow-lg shadow-black/20"><img src={image_logo_1} alt="Fresave" className="h-full w-full object-contain" /></div>
            <div><p className="text-sm font-bold tracking-[0.18em] text-white">FRESAVE</p><p className="text-xs text-zinc-400">ERP operacional</p></div>
          </div>
          <div className="relative my-12 max-w-xl lg:my-0">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1.5 text-xs font-semibold text-red-400"><ShieldCheck className="h-3.5 w-3.5 text-red-400" /> Área reservada à equipa</div>
            <h1 className="max-w-xl text-4xl font-bold leading-[1.02] tracking-[-0.04em] sm:text-5xl lg:text-6xl">A operação no terreno, sob controlo.</h1>
            <p className="mt-6 max-w-lg text-sm leading-7 text-zinc-300 sm:text-base">Frota, obras, stock e manutenção ligados num único centro operacional.</p>
            <div className="mt-8 flex flex-wrap gap-2 text-xs font-medium text-zinc-200"><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2"><Radio className="h-3.5 w-3.5 text-red-400" /> Dados em tempo real</span><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> Processos rastreáveis</span></div>
          </div>
          <div className="relative grid grid-cols-3 gap-2 text-xs text-zinc-300 sm:gap-3"><div className="rounded-xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-sm"><p className="font-bold text-white">Frota</p><p className="mt-1 leading-4">Viaturas e máquinas</p></div><div className="rounded-xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-sm"><p className="font-bold text-white">Manutenção</p><p className="mt-1 leading-4">Preventiva e corretiva</p></div><div className="rounded-xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-sm"><p className="font-bold text-white">Obras</p><p className="mt-1 leading-4">Prazos e custos</p></div></div>
        </section>

        <section className="flex items-center bg-white p-6 sm:p-12 lg:p-16 dark:bg-[#0a0a0a]"><div className="mx-auto w-full max-w-sm">
          <div className="mb-8"><div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300"><KeyRound className="h-5 w-5" /></div><p className="erp-eyebrow">Acesso ao sistema</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">Bem-vindo de volta</h2><p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">Introduza as suas credenciais para continuar.</p></div>
          <form className="space-y-5" onSubmit={handleSubmit}><div className="space-y-2"><Label htmlFor="identifier">Nº de Funcionário ou Email</Label><Input id="identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="h-11 bg-zinc-50 dark:bg-zinc-900/60" placeholder="Ex: 12345 ou nome@email.com" autoComplete="username" disabled={loading} required /></div><div className="space-y-2"><Label htmlFor="senha">Palavra-passe</Label><div className="relative"><Input id="senha" type={showPassword ? "text" : "password"} value={senha} onChange={(e) => setSenha(e.target.value)} className="h-11 pr-11 bg-zinc-50 dark:bg-zinc-900/60" placeholder="Palavra-passe" autoComplete="current-password" disabled={loading} required /><button type="button" aria-label={showPassword ? "Ocultar palavra-passe" : "Mostrar palavra-passe"} onClick={() => setShowPassword(!showPassword)} className="erp-touch-target absolute right-1 top-1/2 -translate-y-1/2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white" disabled={loading}>{showPassword ? <EyeOff className="mx-auto h-4 w-4" /> : <Eye className="mx-auto h-4 w-4" />}</button></div></div><div className="flex items-center gap-2"><Checkbox id="rememberMe" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked as boolean)} disabled={loading} /><Label htmlFor="rememberMe" className="cursor-pointer text-sm font-normal text-zinc-600 dark:text-zinc-400">Lembrar-me neste dispositivo</Label></div>{error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">{error}</div>}<Button className="h-11 w-full bg-red-600 text-white shadow-lg shadow-red-600/15 hover:bg-red-700" type="submit" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Entrar</span><ArrowRight className="h-4 w-4" /></>}</Button></form>
          <div className="my-7 flex items-center gap-3"><div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" /><span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">ou</span><div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" /></div>
          <form onSubmit={handleTrack} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50"><div className="mb-3 flex items-center gap-2"><Package className="h-4 w-4 text-amber-600" /><p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Consultar estado de encomenda</p></div><div className="flex gap-2"><Input aria-label="Código de rastreio" value={trackingCode} onChange={(e) => setTrackingCode(e.target.value.toUpperCase())} placeholder="Ex: AB12CD34" className="h-11 flex-1 bg-white font-mono uppercase tracking-widest dark:bg-zinc-950" /><Button type="submit" variant="outline" aria-label="Consultar rastreio" className="erp-touch-target h-11 shrink-0 border-amber-500 text-amber-700 hover:bg-amber-500 hover:text-white dark:text-red-400"><Search className="h-4 w-4" /></Button></div></form>
          <p className="mt-6 text-center text-xs text-zinc-400">Fresave · Sistema de Gestão</p>
        </div></section>
      </div>
    </main>
  );
}
