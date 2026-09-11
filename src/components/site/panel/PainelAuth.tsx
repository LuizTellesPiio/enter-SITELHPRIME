import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, KeyRound, Loader2, LogIn, ShieldCheck, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthMode = "login" | "signup" | "reset";

const COPY: Record<AuthMode, { title: string; description: string; action: string }> = {
  login: {
    title: "Entrar no painel",
    description: "Acesso restrito à equipe LH Prime.",
    action: "Entrar",
  },
  signup: {
    title: "Criar acesso",
    description: "A primeira conta criada se torna a administradora do painel.",
    action: "Criar acesso",
  },
  reset: {
    title: "Recuperar senha",
    description: "Enviaremos as instruções para o e-mail cadastrado.",
    action: "Enviar instruções",
  },
};

const translateAuthError = (message: string): string => {
  const text = message.toLowerCase();
  if (text.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (text.includes("already registered") || text.includes("already exists")) {
    return "Este e-mail já possui conta. Use a opção Entrar.";
  }
  if (text.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (text.includes("password")) return "A senha deve ter pelo menos 8 caracteres.";
  if (text.includes("rate limit") || text.includes("too many")) {
    return "Muitas tentativas. Aguarde alguns instantes.";
  }
  if (text.includes("unable to validate email") || text.includes("invalid email")) return "E-mail inválido.";
  return "Não foi possível concluir a operação. Tente novamente.";
};

export const PainelAuth = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [signupAvailable, setSignupAvailable] = useState<boolean | null>(null);

  // O cadastro do PRIMEIRO administrador só existe enquanto não há admin.
  // Com um admin já criado, o cadastro fica fechado (decisão vem do backend).
  useEffect(() => {
    let active = true;
    supabase
      .rpc("admin_exists")
      .then(({ data, error }) => {
        if (!active) return;
        setSignupAvailable(error ? false : data === false);
      })
      .catch(() => {
        if (active) setSignupAvailable(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Segurança: se o cadastro inicial está fechado, o modo signup nunca fica ativo.
  useEffect(() => {
    if (mode === "signup" && signupAvailable === false) setMode("login");
  }, [mode, signupAvailable]);

  const copy = COPY[mode];

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setPassword("");
    setFeedback(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setFeedback(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setFeedback({ type: "error", text: "Informe o e-mail." });
      return;
    }
    if (mode !== "reset" && password.length < 8) {
      setFeedback({ type: "error", text: "A senha deve ter pelo menos 8 caracteres." });
      return;
    }

    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) setFeedback({ type: "error", text: translateAuthError(error.message) });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) setFeedback({ type: "error", text: translateAuthError(error.message) });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/painel`,
        });
        if (error) setFeedback({ type: "error", text: translateAuthError(error.message) });
        else {
          setFeedback({
            type: "success",
            text: "Se existir uma conta com este e-mail, as instruções de recuperação foram enviadas.",
          });
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full w-full flex-col bg-background">
      <header className="gradient-ink">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-on-dark-muted">
              Painel LH Prime
            </p>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">
              Cliente <span className="text-emerald">Premiado</span>
            </h1>
          </div>
          <Button asChild variant="hero-secondary" size="sm" className="w-fit">
            <Link to="/">
              <ArrowLeft className="size-4" />
              Voltar ao site
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-5 py-10 lg:px-8">
        <div className="w-full max-w-md rounded-3xl border border-border/70 bg-card p-6 shadow-card sm:p-8">
          <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
            <ShieldCheck className="size-5" />
          </span>

          <h2 className="mt-4 font-display text-xl font-bold text-primary">{copy.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{copy.description}</p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="painel-email">E-mail</Label>
              <Input
                id="painel-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@exemplo.com"
                className="h-11"
              />
            </div>

            {mode !== "reset" ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="painel-password">Senha</Label>
                <Input
                  id="painel-password"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Mínimo de 8 caracteres"
                  className="h-11"
                />
              </div>
            ) : null}

            {feedback ? (
              <p
                className={
                  feedback.type === "error"
                    ? "rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                    : "rounded-xl border border-emerald/30 bg-emerald/10 px-4 py-3 text-sm text-emerald"
                }
              >
                {feedback.text}
              </p>
            ) : null}

            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {copy.action}
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-3 border-t border-border/70 pt-5">
            {mode === "login" ? (
              <>
                {signupAvailable === true ? (
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className="flex items-center gap-2 text-left text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    <UserPlus className="size-4" />
                    Primeiro acesso? Criar a conta de administrador
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => switchMode("reset")}
                  className="flex items-center gap-2 text-left text-sm font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  <KeyRound className="size-4" />
                  Esqueci minha senha
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="flex items-center gap-2 text-left text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                <LogIn className="size-4" />
                Voltar para o login
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
