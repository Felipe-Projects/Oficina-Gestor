import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, ClipboardList, Users, Car, 
  Package, DollarSign, Wrench, Menu, X, Settings, Sun, Moon, CalendarClock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ordens", label: "Ordens de Serviço", icon: ClipboardList },
  { href: "/agendamentos", label: "Agendamentos", icon: CalendarClock },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/veiculos", label: "Veículos", icon: Car },
  { href: "/estoque", label: "Estoque", icon: Package },
  { href: "/servicos", label: "Catálogo de Serviços", icon: Wrench },
  { href: "/financeiro", label: "Financeiro", icon: DollarSign },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { theme, toggle } = useTheme();

  const isActive = (href: string) => {
    if (href === "/" && location === "/") return true;
    if (href !== "/" && location.startsWith(href)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border z-30">
        <div className="flex items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}images/logo-icon.png`} alt="Logo" className="w-8 h-8 rounded-lg" />
          <span className="font-display font-bold text-lg text-foreground">Oficina Pro</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={theme === "dark" ? "Modo claro" : "Modo escuro"}
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="p-2 text-foreground">
            {isMobileOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-72 bg-card border-r border-border/50 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:relative",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center gap-3 hidden md:flex">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center shadow-lg shadow-primary/20 p-2">
            <img src={`${import.meta.env.BASE_URL}images/logo-icon.png`} alt="Logo" className="w-full h-full object-contain filter brightness-0 invert" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-foreground leading-none">Oficina Pro</h1>
            <p className="text-xs text-muted-foreground mt-1">Gestão Automotiva</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setIsMobileOpen(false)}>
              <span className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer group relative",
                isActive(item.href) 
                  ? "bg-primary text-primary-foreground font-medium shadow-md shadow-primary/20" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}>
                <item.icon className={cn("w-5 h-5", isActive(item.href) ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary")} />
                {item.label}
              </span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border/50 space-y-1">
          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors group"
          >
            <div className="relative w-5 h-5">
              <Sun className={cn(
                "w-5 h-5 absolute inset-0 transition-all duration-300",
                theme === "dark" ? "opacity-100 rotate-0" : "opacity-0 rotate-90"
              )} />
              <Moon className={cn(
                "w-5 h-5 absolute inset-0 transition-all duration-300",
                theme === "dark" ? "opacity-0 -rotate-90" : "opacity-100 rotate-0"
              )} />
            </div>
            <span className="font-medium">
              {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
            </span>
            <div className={cn(
              "ml-auto w-10 h-5 rounded-full transition-colors duration-300 relative",
              theme === "dark" ? "bg-primary" : "bg-muted-foreground/30"
            )}>
              <div className={cn(
                "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300",
                theme === "dark" ? "left-[calc(100%-1.125rem)]" : "left-0.5"
              )} />
            </div>
          </button>

          <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer">
            <Settings className="w-5 h-5" />
            <span className="font-medium">Configurações</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </div>
      </main>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </div>
  );
}
