import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NAV_LINKS } from "@/data/site";
import { DEFAULT_WHATSAPP_LINK } from "@/lib/whatsapp";
import { BrandLogo } from "@/components/site/BrandLogo";
import { cn } from "@/lib/utils";

export const Navbar = () => {
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  return (
    /* Menu desktop a partir de 1280px (xl): abaixo disso os itens não cabem
       em uma única linha e o cabeçalho passa para a versão com hambúrguer. */
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-primary/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 xl:h-24 xl:px-8">
        <a
          href="#inicio"
          className="flex items-center text-white"
        >
          {/* Mobile: símbolo. Desktop: versão compacta (símbolo + PRIME). */}
          <BrandLogo variant="mark" size="md" className="rounded-md xl:hidden" />
          <BrandLogo variant="compact" size="md" className="hidden rounded-lg xl:block" />
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 xl:flex">
          {NAV_LINKS.map((link) =>
            link.to ? (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm font-medium text-on-dark transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-on-dark transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ),
          )}
          <Link
            to="/cliente-premiado"
            className="text-sm font-medium text-emerald transition-colors hover:text-white"
          >
            Cliente Premiado
          </Link>
        </nav>

        <div className="hidden xl:block">
          <Button asChild variant="whatsapp">
            <a href={DEFAULT_WHATSAPP_LINK} target="_blank" rel="noreferrer">
              <MessageCircle className="size-4" />
              Orçamento
            </a>
          </Button>
        </div>

        {/* Mobile trigger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 xl:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="gradient-ink flex w-72 flex-col gap-6 border-white/10 text-white [&>button]:text-white"
          >
            <SheetHeader>
              <SheetTitle className="flex items-center text-left text-white">
                <BrandLogo variant="mark" size="md" className="rounded-md" />
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link) =>
                link.to ? (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={closeMenu}
                    className={cn(
                      "rounded-lg px-3 py-2.5 text-base font-medium text-on-dark transition-colors hover:bg-white/10 hover:text-white",
                    )}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={closeMenu}
                    className={cn(
                      "rounded-lg px-3 py-2.5 text-base font-medium text-on-dark transition-colors hover:bg-white/10 hover:text-white",
                    )}
                  >
                    {link.label}
                  </a>
                ),
              )}
              <Link
                to="/cliente-premiado"
                onClick={closeMenu}
                className="rounded-lg px-3 py-2.5 text-base font-medium text-emerald transition-colors hover:bg-white/10 hover:text-white"
              >
                Cliente Premiado
              </Link>
            </nav>
            <Button asChild variant="whatsapp" size="lg" className="mt-2">
              <a
                href={DEFAULT_WHATSAPP_LINK}
                target="_blank"
                rel="noreferrer"
                onClick={closeMenu}
              >
                <MessageCircle className="size-4" />
                Solicitar orçamento
              </a>
            </Button>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};
