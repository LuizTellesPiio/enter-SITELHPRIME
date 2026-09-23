import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Calculator, Film, Loader2, LogOut, ShieldAlert, Ticket, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PainelAuth } from "@/components/site/panel/PainelAuth";
import { ParticipacoesPanel } from "@/components/site/panel/ParticipacoesPanel";
import { PremiosPanel } from "@/components/site/panel/PremiosPanel";
import { PortfolioPanel } from "@/components/site/panel/PortfolioPanel";
import { PricingPanel } from "@/components/site/panel/PricingPanel";
import { cn } from "@/lib/utils";

type PanelTab = "participacoes" | "premios" | "portfolio" | "precificacao";

const TABS: { key: PanelTab; label: string; icon: typeof Ticket }[] = [
  { key: "participacoes", label: "Participações", icon: Ticket },
  { key: "premios", label: "Prêmios", icon: Trophy },
  { key: "portfolio", label: "Portfólio", icon: Film },
  { key: "precificacao", label: "Diária & Precificação", icon: Calculator },
];

const Painel = () => {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [access, setAccess] = useState<"loading" | "granted" | "denied">("loading");
  const [tab, setTab] = useState<PanelTab>("participacoes");

  const loadRole = useCallback(async (id: string) => {
    const { data } = await supabase.from("profiles").select("role").eq("id", id).maybeSingle();
    setAccess(data?.role === "admin" ? "granted" : "denied");
  }, []);

  useEffect(() => {
    let active = true;

    // Listener registrado ANTES de checar a sessão existente.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const id = session?.user?.id ?? null;
      setUserId(id);
      setAccess("loading");
      if (id) {
        window.setTimeout(() => {
          if (active) void loadRole(id);
        }, 0);
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const id = data.session?.user?.id ?? null;
      setUserId(id);
      if (id) void loadRole(id);
      setReady(true);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadRole]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserId(null);
    setAccess("loading");
  };

  if (!ready) {
    return (
      <div className="flex min-h-full items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!userId) return <PainelAuth />;

  if (access === "loading") {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verificando seu acesso...</p>
      </div>
    );
  }

  if (access === "denied") {
    return (
      <div className="flex min-h-full w-full flex-col bg-background">
        <header className="gradient-ink">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 lg:px-8">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-on-dark-muted">
                Painel LH Prime
              </p>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">
                Cliente <span className="text-emerald">Premiado</span>
              </h1>
            </div>
            <Button variant="hero-secondary" size="sm" onClick={() => void handleSignOut()}>
              <LogOut className="size-4" />
              Sair
            </Button>
          </div>
        </header>

        <main className="flex flex-1 items-start justify-center px-5 py-10 lg:px-8">
          <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-3xl border border-border/70 bg-card p-8 text-center shadow-card">
            <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ShieldAlert className="size-6" />
            </span>
            <h2 className="font-display text-lg font-bold text-primary">Acesso restrito</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Esta conta não tem permissão de administrador. O painel é exclusivo da equipe LH Prime.
            </p>
            <Button asChild variant="light-outline" size="sm">
              <Link to="/">
                <ArrowLeft className="size-4" />
                Voltar ao site
              </Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-full w-full bg-background">
      <header className="gradient-ink">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-on-dark-muted">
                Painel LH Prime
              </p>
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Cliente <span className="text-emerald">Premiado</span>
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="hero-secondary" size="sm">
                <Link to="/cliente-premiado">Ver campanha</Link>
              </Button>
              <Button variant="hero-secondary" size="sm" onClick={() => void handleSignOut()}>
                <LogOut className="size-4" />
                Sair
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            {TABS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition-colors",
                    tab === item.key
                      ? "border-emerald bg-emerald text-emerald-foreground"
                      : "border-white/25 bg-white/10 text-on-dark backdrop-blur-sm hover:bg-white/20",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 py-8 lg:px-8">
        {tab === "participacoes" ? (
          <ParticipacoesPanel />
        ) : tab === "premios" ? (
          <PremiosPanel />
        ) : tab === "portfolio" ? (
          <PortfolioPanel />
        ) : (
          <PricingPanel />
        )}
      </main>
    </div>
  );
};

export default Painel;
