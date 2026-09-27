import Index from "./pages/Index";
import Portfolio from "./pages/Portfolio";
import ClientePremiado from "./pages/ClientePremiado";
import Painel from "./pages/Painel";
import PreviaIA from "./pages/PreviaIA";
import NotFound from "./pages/NotFound";

export const routers = [
  {
    path: "/",
    name: "home",
    element: <Index />,
  },
  {
    path: "/portfolio",
    name: "portfolio",
    element: <Portfolio />,
  },
  {
    path: "/cliente-premiado",
    name: "cliente-premiado",
    element: <ClientePremiado />,
  },
  {
    path: "/painel",
    name: "painel",
    element: <Painel />,
  },
  {
    path: "/previa-ia",
    name: "previa-ia",
    element: <PreviaIA />,
  },
  /* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */
  {
    path: "*",
    name: "404",
    element: <NotFound />,
  },
];

declare global {
  interface Window {
    __routers__: typeof routers;
  }
}

window.__routers__ = routers;
