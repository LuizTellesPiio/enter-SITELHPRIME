import { Instagram, MapPin, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { NAV_LINKS, INSTAGRAM_URL, CITY } from "@/data/site";
import { DEFAULT_WHATSAPP_LINK } from "@/lib/whatsapp";

export const Footer = () => {
  return (
    <footer className="border-t border-white/10 bg-primary">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 py-14 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="flex flex-col gap-4">
            <a
              href="#inicio"
              className="font-display text-xl font-bold tracking-tight text-white"
            >
              LH <span className="text-emerald">Prime</span> Pinturas
            </a>
            <p className="max-w-xs text-sm leading-relaxed text-on-dark-muted">
              Pintura e acabamento de alto padrão em Bom Jesus do Itabapoana e
              região.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-white">
              Navegação
            </h4>
            <nav className="flex flex-col gap-2">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="w-fit text-sm text-on-dark-muted transition-colors hover:text-white"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-white">
              Contato
            </h4>
            <a
              href={DEFAULT_WHATSAPP_LINK}
              target="_blank"
              rel="noreferrer"
              className="flex w-fit items-center gap-2 text-sm text-on-dark-muted transition-colors hover:text-white"
            >
              <MessageCircle className="size-4 text-emerald" />
              WhatsApp: (22) 99253-8926
            </a>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="flex w-fit items-center gap-2 text-sm text-on-dark-muted transition-colors hover:text-white"
            >
              <Instagram className="size-4 text-emerald" />
              @luuiiztellespio
            </a>
            <p className="flex items-center gap-2 text-sm text-on-dark-muted">
              <MapPin className="size-4 shrink-0 text-emerald" />
              {CITY}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-between">
          <p className="text-center text-xs text-on-dark-muted sm:text-left">
            © {new Date().getFullYear()} LH Prime Pinturas. Todos os direitos
            reservados.
          </p>
          <Link
            to="/painel"
            className="text-xs font-medium text-on-dark-muted underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            Painel LH Prime
          </Link>
        </div>
      </div>
    </footer>
  );
};
