import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
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
  return `R$ ${Math.abs(val).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR");
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function FinanceiroScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth());
  const [ano, setAno] = useState(now.getFullYear());

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/financeiro"],
    queryFn: () => apiGet("/api/financeiro"),
  });

  const { receitas, despesas, lucro, filtrados } = useMemo(() => {
    if (!Array.isArray(data)) return { receitas: 0, despesas: 0, lucro: 0, filtrados: [] };
    const list = data.filter((t: any) => {
      const d = new Date(t.data + "T12:00:00");
      return d.getMonth() === mes && d.getFullYear() === ano;
    });
    const receitas = list.filter((t: any) => t.tipo === "receita").reduce((s: number, t: any) => s + parseFloat(t.valor ?? "0"), 0);
    const despesas = list.filter((t: any) => t.tipo === "despesa").reduce((s: number, t: any) => s + parseFloat(t.valor ?? "0"), 0);
    return { receitas, despesas, lucro: receitas - despesas, filtrados: list };
  }, [data, mes, ano]);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    header: {
      backgroundColor: C.card,
      paddingTop: topInset + 12,
      paddingBottom: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    headerTitle: { fontSize: 22, fontWeight: "700" as const, color: C.text, fontFamily: "Inter_700Bold" },
    monthRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 16,
      marginTop: 10,
    },
    monthLabel: { fontSize: 16, fontWeight: "600" as const, color: C.text, fontFamily: "Inter_600SemiBold", minWidth: 120, textAlign: "center" as const },
    monthBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: C.background,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    statsRow: { flexDirection: "row" as const, gap: 8, paddingHorizontal: 16, paddingTop: 14 },
    statCard: {
      flex: 1,
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: C.border,
    },
    statLabel: { fontSize: 11, color: C.textSecondary, fontFamily: "Inter_400Regular" },
    statValue: { fontSize: 15, fontWeight: "700" as const, fontFamily: "Inter_700Bold", marginTop: 4 },
    listHeader: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
      fontSize: 13,
      fontWeight: "600" as const,
      color: C.textSecondary,
      fontFamily: "Inter_600SemiBold",
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
    },
    card: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 14,
      marginHorizontal: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: C.border,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
    },
    iconCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    desc: { fontSize: 14, fontWeight: "600" as const, color: C.text, fontFamily: "Inter_600SemiBold" },
    dateText: { fontSize: 12, color: C.textSecondary, fontFamily: "Inter_400Regular", marginTop: 2 },
    valor: { marginLeft: "auto" as any, fontSize: 15, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
    empty: { alignItems: "center" as const, justifyContent: "center" as const, paddingVertical: 40 },
    emptyText: { fontSize: 15, color: C.textSecondary, fontFamily: "Inter_400Regular", marginTop: 12 },
    loading: { alignItems: "center" as const, justifyContent: "center" as const, paddingVertical: 40 },
    pad: { height: 100 },
  });

  function prevMes() {
    if (mes === 0) { setMes(11); setAno(a => a - 1); }
    else setMes(m => m - 1);
  }
  function nextMes() {
    if (mes === 11) { setMes(0); setAno(a => a + 1); }
    else setMes(m => m + 1);
  }

  const lucroPosOrNeg = lucro >= 0;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Financeiro</Text>
        <View style={s.monthRow}>
          <Pressable style={s.monthBtn} onPress={prevMes} testID="button-prev-mes">
            <Feather name="chevron-left" size={16} color={C.text} />
          </Pressable>
          <Text style={s.monthLabel}>{MESES[mes]} {ano}</Text>
          <Pressable style={s.monthBtn} onPress={nextMes} testID="button-next-mes">
            <Feather name="chevron-right" size={16} color={C.text} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={filtrados}
        keyExtractor={(item: any) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={C.primary} />}
        ListHeaderComponent={
          <View>
            <View style={s.statsRow}>
              <View style={s.statCard}>
                <Text style={s.statLabel}>Receitas</Text>
                <Text style={[s.statValue, { color: C.success }]}>{formatCurrency(receitas)}</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statLabel}>Despesas</Text>
                <Text style={[s.statValue, { color: C.danger }]}>{formatCurrency(despesas)}</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statLabel}>Lucro</Text>
                <Text style={[s.statValue, { color: lucroPosOrNeg ? C.success : C.danger }]}>
                  {lucroPosOrNeg ? "" : "-"}{formatCurrency(lucro)}
                </Text>
              </View>
            </View>
            <Text style={s.listHeader}>Lançamentos</Text>
          </View>
        }
        renderItem={({ item: t }) => {
          const isReceita = t.tipo === "receita";
          return (
            <View style={s.card}>
              <View style={[s.iconCircle, { backgroundColor: isReceita ? C.successBg : C.dangerBg }]}>
                <Feather name={isReceita ? "arrow-down-left" : "arrow-up-right"} size={18} color={isReceita ? C.success : C.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.desc}>{t.descricao}</Text>
                <Text style={s.dateText}>{t.categoria} • {formatDate(t.data)}</Text>
              </View>
              <Text style={[s.valor, { color: isReceita ? C.success : C.danger }]}>
                {isReceita ? "+" : "-"}{formatCurrency(parseFloat(t.valor ?? "0"))}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          isLoading ? (
            <View style={s.loading}><ActivityIndicator color={C.primary} /></View>
          ) : (
            <View style={s.empty}>
              <Feather name="dollar-sign" size={40} color={C.textTertiary} />
              <Text style={s.emptyText}>Nenhum lançamento neste mês</Text>
            </View>
          )
        }
        ListFooterComponent={<View style={s.pad} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
