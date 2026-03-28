import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, Save, Trash2, Database, RefreshCw, Clock } from "lucide-react";

interface BackupItem {
  id: number;
  nome: string;
  tipo: string;
  tamanho: number;
  createdAt: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(val: string) {
  const d = new Date(val);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Backup() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);
  const [exportando, setExportando] = useState(false);

  const { data: historico = [], isLoading } = useQuery<BackupItem[]>({
    queryKey: ["/api/backup/historico"],
    queryFn: () => apiRequest("GET", "/api/backup/historico"),
  });

  const salvarMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/backup/salvar", { tipo: "manual" }),
    onSuccess: () => {
      toast({ title: "Backup salvo com sucesso!" });
      qc.invalidateQueries({ queryKey: ["/api/backup/historico"] });
    },
    onError: () => toast({ title: "Erro ao salvar backup", variant: "destructive" }),
  });

  const deletarMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/backup/historico/${id}`),
    onSuccess: () => {
      toast({ title: "Backup removido" });
      qc.invalidateQueries({ queryKey: ["/api/backup/historico"] });
    },
    onError: () => toast({ title: "Erro ao remover backup", variant: "destructive" }),
  });

  async function handleExportar() {
    setExportando(true);
    try {
      const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
      const res = await fetch(`${base}/api/backup/exportar`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dataHoje = new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `backup_oficina_${dataHoje}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Backup exportado com sucesso!" });
    } catch {
      toast({ title: "Erro ao exportar backup", variant: "destructive" });
    } finally {
      setExportando(false);
    }
  }

  async function handleBaixarBackup(id: number, nome: string) {
    try {
      const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
      const res = await fetch(`${base}/api/backup/historico/${id}/baixar`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${nome.replace(/ /g, "_")}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Erro ao baixar backup", variant: "destructive" });
    }
  }

  async function handleImportar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportando(true);
    try {
      const texto = await file.text();
      const dados = JSON.parse(texto);
      await apiRequest("POST", "/api/backup/importar", dados);
      toast({ title: "Backup importado com sucesso!", description: "Todos os dados foram restaurados." });
      qc.invalidateQueries();
    } catch {
      toast({ title: "Erro ao importar backup", description: "Verifique se o arquivo é um backup válido.", variant: "destructive" });
    } finally {
      setImportando(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const ultimoAuto = historico.filter((b) => b.tipo === "automatico")[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Backup e Restauração</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie backups dos seus dados. Backups automáticos são criados a cada 7 dias.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Último Backup Automático
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ultimoAuto ? (
              <p className="text-sm text-foreground font-medium">{formatDate(ultimoAuto.createdAt)}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum backup automático ainda</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Próximo: automaticamente em 7 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              Total de Backups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{historico.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Máximo de 10 backups armazenados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary" />
              Ciclo de Backup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-foreground">A cada 7 dias</p>
            <p className="text-xs text-muted-foreground mt-1">Backup automático em segundo plano</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ações de Backup</CardTitle>
          <CardDescription>
            Exporte todos os dados para um arquivo JSON ou importe um backup existente.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            onClick={handleExportar}
            disabled={exportando}
            className="flex items-center gap-2"
            data-testid="button-exportar-backup"
          >
            <Download className="w-4 h-4" />
            {exportando ? "Exportando..." : "Exportar Backup (.json)"}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-2"
                data-testid="button-importar-backup"
              >
                <Upload className="w-4 h-4" />
                {importando ? "Importando..." : "Importar Backup"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Importar Backup</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação substituirá todos os dados atuais pelos dados do backup. Esta operação
                  não pode ser desfeita. Deseja continuar?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => fileInputRef.current?.click()}>
                  Confirmar e Selecionar Arquivo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportar}
          />

          <Button
            variant="secondary"
            onClick={() => salvarMutation.mutate()}
            disabled={salvarMutation.isPending}
            className="flex items-center gap-2"
            data-testid="button-salvar-backup"
          >
            <Save className="w-4 h-4" />
            {salvarMutation.isPending ? "Salvando..." : "Criar Backup Agora"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Backups</CardTitle>
          <CardDescription>
            Backups salvos no sistema. Os 10 mais recentes são mantidos automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : historico.length === 0 ? (
            <div className="text-center py-8">
              <Database className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Nenhum backup salvo ainda</p>
              <p className="text-xs text-muted-foreground mt-1">
                Clique em "Criar Backup Agora" para salvar o estado atual dos dados
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {historico.map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between py-3 gap-3 flex-wrap"
                  data-testid={`row-backup-${backup.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Database className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{backup.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(backup.createdAt)} &bull; {formatBytes(backup.tamanho)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={backup.tipo === "automatico" ? "secondary" : "outline"}>
                      {backup.tipo === "automatico" ? "Automático" : "Manual"}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleBaixarBackup(backup.id, backup.nome)}
                      title="Baixar backup"
                      data-testid={`button-baixar-backup-${backup.id}`}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Remover backup"
                          data-testid={`button-deletar-backup-${backup.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover Backup</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja remover o backup "{backup.nome}"? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deletarMutation.mutate(backup.id)}
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
