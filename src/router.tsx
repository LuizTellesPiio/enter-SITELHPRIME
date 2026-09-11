import Index from "./pages/Index";
import ClientePremiado from "./pages/ClientePremiado";
import Painel from "./pages/Painel";
import NotFound from "./pages/NotFound";

export const routers = [
  {
    path: "/",
    name: "home",
    element: <Index />,
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
