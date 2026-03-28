import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { apiGet } from "@/utils/api";

function formatCurrency(val: number) {
  return `R$ ${val.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR");
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
  orcamento: { label: "Orçamento", color: "#2563EB", icon: "file-text" },
  em_andamento: { label: "Em andamento", color: "#D97706", icon: "clock" },
  finalizado: { label: "Finalizado", color: "#059669", icon: "check-circle" },
  entregue: { label: "Entregue", color: "#7C3AED", icon: "truck" },
  cancelado: { label: "Cancelado", color: "#DC2626", icon: "x-circle" },
};

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["/api/dashboard"],
    queryFn: () => apiGet("/api/dashboard"),
  });

  const { data: alertas, isLoading: alertasLoading, refetch: refetchAlertas } = useQuery({
    queryKey: ["/api/manutencao/alertas"],
    queryFn: () => apiGet("/api/manutencao/alertas"),
  });

  const { data: ordens, isLoading: ordensLoading, refetch: refetchOrdens } = useQuery({
    queryKey: ["/api/ordens"],
    queryFn: () => apiGet("/api/ordens"),
  });

  const isLoading = statsLoading || alertasLoading || ordensLoading;

  const onRefresh = () => {
    refetchStats();
    refetchAlertas();
    refetchOrdens();
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const recentOrdens = Array.isArray(ordens) ? ordens.slice(0, 5) : [];

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    header: {
      backgroundColor: C.card,
      paddingTop: topInset + 12,
      paddingBottom: 16,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "700" as const,
      color: C.text,
      fontFamily: "Inter_700Bold",
    },
    headerSub: {
      fontSize: 13,
      color: C.textSecondary,
      marginTop: 2,
      fontFamily: "Inter_400Regular",
    },
    scroll: { flex: 1 },
    section: { paddingHorizontal: 16, paddingTop: 20 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: C.textSecondary,
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
      marginBottom: 12,
      fontFamily: "Inter_600SemiBold",
    },
    statsGrid: { flexDirection: "row" as const, gap: 10, marginBottom: 8 },
    statCard: {
      flex: 1,
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: C.border,
    },
    statValue: {
      fontSize: 20,
      fontWeight: "700" as const,
      color: C.text,
      marginTop: 6,
      fontFamily: "Inter_700Bold",
    },
    statLabel: {
      fontSize: 11,
      color: C.textSecondary,
      fontFamily: "Inter_400Regular",
    },
    alertCard: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: C.border,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      marginBottom: 8,
    },
    alertIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: C.warningBg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    alertName: { fontSize: 14, fontWeight: "600" as const, color: C.text, fontFamily: "Inter_600SemiBold" },
    alertSub: { fontSize: 12, color: C.textSecondary, fontFamily: "Inter_400Regular" },
    alertDays: {
      marginLeft: "auto" as any,
      backgroundColor: C.warningBg,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    alertDaysText: { fontSize: 12, fontWeight: "700" as const, color: C.warning, fontFamily: "Inter_700Bold" },
    osCard: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 8,
      flexDirection: "row" as const,
      alignItems: "center" as const,
    },
    osNumber: { fontSize: 13, fontWeight: "700" as const, color: C.primary, fontFamily: "Inter_700Bold" },
    osClient: { fontSize: 14, fontWeight: "600" as const, color: C.text, fontFamily: "Inter_600SemiBold" },
    osSub: { fontSize: 12, color: C.textSecondary, fontFamily: "Inter_400Regular" },
    badge: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    badgeText: { fontSize: 11, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
    bottomPad: { height: Platform.OS === "web" ? 100 : 100 },
    loading: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
    empty: { alignItems: "center" as const, paddingVertical: 24 },
    emptyText: { fontSize: 14, color: C.textSecondary, fontFamily: "Inter_400Regular" },
    seeAll: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingVertical: 12,
      gap: 4,
    },
    seeAllText: { fontSize: 13, color: C.primary, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
  });

  function diasAte(dateStr: string) {
    if (!dateStr) return 9999;
    const d = new Date(dateStr + "T12:00:00");
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - hoje.getTime()) / 86400000);
  }

  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Oficina Pro</Text>
        <Text style={s.headerSub}>{todayCapitalized}</Text>
      </View>

      <ScrollView
        style={s.scroll}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={C.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Resumo do Dia</Text>
          <View style={s.statsGrid}>
            <View style={s.statCard}>
              <Feather name="dollar-sign" size={18} color={C.success} />
              <Text style={[s.statValue, { color: C.success, fontSize: 16 }]}>
                {statsLoading ? "..." : formatCurrency(parseFloat(stats?.faturamentoHoje ?? "0"))}
              </Text>
              <Text style={s.statLabel}>Faturamento hoje</Text>
            </View>
            <View style={s.statCard}>
              <Feather name="clock" size={18} color={C.warning} />
              <Text style={[s.statValue, { color: C.warning }]}>
                {statsLoading ? "..." : (stats?.osEmAndamento ?? 0)}
              </Text>
              <Text style={s.statLabel}>Em andamento</Text>
            </View>
            <View style={s.statCard}>
              <Feather name="alert-triangle" size={18} color={C.danger} />
              <Text style={[s.statValue, { color: C.danger }]}>
                {statsLoading ? "..." : (stats?.osAtrasadas ?? 0)}
              </Text>
              <Text style={s.statLabel}>Atrasadas</Text>
            </View>
          </View>
        </View>

        {/* Maintenance Alerts */}
        {Array.isArray(alertas) && alertas.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Alertas de Manutenção</Text>
            {alertas.slice(0, 3).map((a: any) => {
              const dias = diasAte(a.proximaTrocaData);
              const isUrgente = dias <= 30;
              return (
                <View key={a.id} style={s.alertCard}>
                  <View style={[s.alertIcon, { backgroundColor: isUrgente ? C.dangerBg : C.warningBg }]}>
                    <Feather name="tool" size={16} color={isUrgente ? C.danger : C.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.alertName}>{a.tipoTroca}</Text>
                    <Text style={s.alertSub}>{a.nome} • {a.placa}</Text>
                  </View>
                  <View style={[s.alertDays, { backgroundColor: isUrgente ? C.dangerBg : C.warningBg }]}>
                    <Text style={[s.alertDaysText, { color: isUrgente ? C.danger : C.warning }]}>
                      {dias < 0 ? "Vencido" : dias === 0 ? "Hoje" : `${dias}d`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Recent Orders */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Ordens Recentes</Text>
          {ordensLoading ? (
            <View style={s.loading}>
              <ActivityIndicator color={C.primary} />
            </View>
          ) : recentOrdens.length === 0 ? (
            <View style={s.empty}>
              <Feather name="clipboard" size={32} color={C.textTertiary} />
              <Text style={[s.emptyText, { marginTop: 8 }]}>Nenhuma ordem de serviço</Text>
            </View>
          ) : (
            recentOrdens.map((os: any) => {
              const st = STATUS_MAP[os.status] ?? { label: os.status, color: C.textSecondary, icon: "circle" };
              return (
                <Pressable
                  key={os.id}
                  style={({ pressed }) => [s.osCard, { opacity: pressed ? 0.75 : 1 }]}
                  onPress={() => router.push({ pathname: "/os/[id]", params: { id: os.id } })}
                  testID={`os-card-${os.id}`}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.osNumber}>#{os.numero}</Text>
                    <Text style={s.osClient}>{os.clienteNome}</Text>
                    <Text style={s.osSub}>{os.veiculo} • {formatDate(os.dataEntrada)}</Text>
                  </View>
                  <View>
                    <View style={[s.badge, { backgroundColor: st.color + "20" }]}>
                      <Feather name={st.icon as any} size={11} color={st.color} />
                      <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
                    </View>
                    <Text style={[s.osSub, { textAlign: "right" as const, marginTop: 4 }]}>
                      {formatCurrency(parseFloat(os.total ?? "0"))}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
          {recentOrdens.length > 0 && (
            <Pressable style={s.seeAll} onPress={() => router.push("/(tabs)/ordens" as any)}>
              <Text style={s.seeAllText}>Ver todas</Text>
              <Feather name="chevron-right" size={14} color={C.primary} />
            </Pressable>
          )}
        </View>

        <View style={s.bottomPad} />
      </ScrollView>
    </View>
  );
}
