import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";

import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/dashboard";
import OrdensList from "@/pages/ordens";
import OrdemForm from "@/pages/ordem-form";
import ClientesList from "@/pages/clientes";
import ClienteDetalhes from "@/pages/cliente-detalhes";
import VeiculosList from "@/pages/veiculos";
import Estoque from "@/pages/estoque";
import Financeiro from "@/pages/financeiro";
import Servicos from "@/pages/servicos";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  }
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/ordens" component={OrdensList} />
        <Route path="/ordens/nova" component={OrdemForm} />
        <Route path="/ordens/:id" component={OrdemForm} />
        <Route path="/clientes" component={ClientesList} />
        <Route path="/clientes/:id" component={ClienteDetalhes} />
        <Route path="/veiculos" component={VeiculosList} />
        <Route path="/estoque" component={Estoque} />
        <Route path="/financeiro" component={Financeiro} />
        <Route path="/servicos" component={Servicos} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
