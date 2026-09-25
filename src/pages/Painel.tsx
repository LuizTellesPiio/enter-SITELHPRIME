import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, LogOut, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PainelAuth } from "@/components/site/panel/PainelAuth";
import { PainelHeader } from "@/components/site/panel/PainelHeader";
import { PanelTabs } from "@/components/site/panel/PanelTabs";
import { ParticipacoesPanel } from "@/components/site/panel/ParticipacoesPanel";
import { PremiosPanel } from "@/components/site/panel/PremiosPanel";
import { PortfolioPanel } from "@/components/site/panel/PortfolioPanel";
import { PricingPanel } from "@/components/site/panel/PricingPanel";
import {
  ACTIVE_PANEL_MODULES,
  CLIENTE_PREMIADO_SECTIONS,
  type ActivePanelModuleKey,
  type ClientePremiadoSectionKey,
} from "@/lib/brand";

/* Painel — Central de Gestão                                          */
/* Módulos ativos: Cliente Premiado (Participações + Prêmios),         */
/* Portfólio e Diária & Precificação. Módulos previstos ficam          */
/* registrados em `@/lib/brand` sem tela vazia.                        */

const Painel = () => {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [access, setAccess] = useState<"loading" | "granted" | "denied">("loading");
  const [module, setModule] = useState<ActivePanelModuleKey>("cliente-premiado");
  const [section, setSection] = useState<ClientePremiadoSectionKey>("participacoes");

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
        <PainelHeader
          actions={
            <Button variant="hero-secondary" size="sm" onClick={() => void handleSignOut()}>
              <LogOut className="size-4" />
              Sair
            </Button>
          }
        />

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

  const renderModule = () => {
    switch (module) {
      case "cliente-premiado":
        return section === "participacoes" ? <ParticipacoesPanel /> : <PremiosPanel />;
      case "portfolio":
        return <PortfolioPanel />;
      case "precificacao":
        return <PricingPanel />;
      default:
        // Módulos previstos (Orçamentos, Clientes, Obras, Configurações) ainda não têm tela.
        return null;
    }
  };

  const activeModuleLabel =
    ACTIVE_PANEL_MODULES.find((item) => item.key === module)?.label ?? "";

  return (
    <div className="min-h-full w-full bg-background">
      <PainelHeader
        actions={
          <>
            <Button asChild variant="hero-secondary" size="sm">
              <Link to="/cliente-premiado">Ver campanha</Link>
            </Button>
            <Button variant="hero-secondary" size="sm" onClick={() => void handleSignOut()}>
              <LogOut className="size-4" />
              Sair
            </Button>
          </>
        }
        navigation={
          <div className="flex flex-col gap-3">
            <PanelTabs
              items={ACTIVE_PANEL_MODULES}
              value={module}
              onChange={(key) => setModule(key)}
            />

            {module === "cliente-premiado" ? (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/15 bg-white/5 p-1.5 pl-3">
                <span className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-on-dark-muted">
                  {activeModuleLabel}
                </span>
                <PanelTabs
                  variant="secondary"
                  items={CLIENTE_PREMIADO_SECTIONS}
                  value={section}
                  onChange={(key) => setSection(key)}
                />
              </div>
            ) : null}
          </div>
        }
      />

      <main className="mx-auto w-full max-w-6xl px-5 py-8 lg:px-8">{renderModule()}</main>
    </div>
  );
};

export default Painel;
