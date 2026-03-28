import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
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
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { apiGet } from "@/utils/api";

const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
  orcamento: { label: "Orçamento", color: "#2563EB", icon: "file-text" },
  em_andamento: { label: "Em andamento", color: "#D97706", icon: "clock" },
  finalizado: { label: "Finalizado", color: "#059669", icon: "check-circle" },
  entregue: { label: "Entregue", color: "#7C3AED", icon: "truck" },
  cancelado: { label: "Cancelado", color: "#DC2626", icon: "x-circle" },
};

const FILTERS = [
  { key: "todos", label: "Todos" },
  { key: "em_andamento", label: "Andamento" },
  { key: "orcamento", label: "Orçamento" },
  { key: "finalizado", label: "Finalizado" },
  { key: "entregue", label: "Entregue" },
];

function formatCurrency(val: number) {
  return `R$ ${val.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}
function formatDate(val: any): string {
  if (!val) return "-";
  try {
    const d = val instanceof Date ? val : new Date(String(val).length === 10 ? String(val) + "T12:00:00" : val);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("pt-BR");
  } catch { return "-"; }
}

export default function OrdensScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todos");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/ordens"],
    queryFn: () => apiGet("/api/ordens"),
  });

  const ordens = useMemo(() => {
    if (!Array.isArray(data)) return [];
    let filtered = data;
    if (filter !== "todos") filtered = filtered.filter((o: any) => o.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (o: any) =>
          String(o.numero).includes(q) ||
          (o.clienteNome || "").toLowerCase().includes(q) ||
          (o.veiculo || "").toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [data, filter, search]);

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
    headerRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      marginBottom: 10,
    },
    headerTitle: { fontSize: 22, fontWeight: "700" as const, color: C.text, fontFamily: "Inter_700Bold" },
    addBtn: {
      backgroundColor: C.primary,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
    },
    addBtnText: { fontSize: 14, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold", color: "#fff" },
    searchRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      backgroundColor: C.background,
      borderRadius: 10,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: C.border,
    },
    searchInput: { flex: 1, height: 38, color: C.text, fontSize: 14, fontFamily: "Inter_400Regular", paddingLeft: 6 },
    filterRow: {
      flexDirection: "row" as const,
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
    },
    filterText: { fontSize: 12, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
    card: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 14,
      marginHorizontal: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: C.border,
    },
    cardRow: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const },
    osNumber: { fontSize: 12, fontWeight: "700" as const, color: C.primary, fontFamily: "Inter_700Bold" },
    clientName: { fontSize: 15, fontWeight: "600" as const, color: C.text, fontFamily: "Inter_600SemiBold", marginTop: 2 },
    sub: { fontSize: 12, color: C.textSecondary, fontFamily: "Inter_400Regular", marginTop: 2 },
    badge: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    badgeText: { fontSize: 11, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
    value: { fontSize: 14, fontWeight: "700" as const, fontFamily: "Inter_700Bold", textAlign: "right" as const, marginTop: 4 },
    empty: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, paddingVertical: 60 },
    emptyText: { fontSize: 15, color: C.textSecondary, fontFamily: "Inter_400Regular", marginTop: 12 },
    loading: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, paddingVertical: 60 },
    pad: { height: 100 },
  });

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.headerTitle}>Ordens de Serviço</Text>
          <Pressable
            style={({ pressed }) => [s.addBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => router.push("/os/nova")}
            testID="button-nova-os"
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={s.addBtnText}>Nova OS</Text>
          </Pressable>
        </View>
        <View style={s.searchRow}>
          <Feather name="search" size={16} color={C.textTertiary} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar cliente, placa ou OS..."
            placeholderTextColor={C.textTertiary}
            value={search}
            onChangeText={setSearch}
            testID="input-search-os"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={C.textTertiary} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={ordens}
        keyExtractor={(item: any) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={C.primary} />}
        ListHeaderComponent={
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <Pressable
                  key={f.key}
                  style={[
                    s.filterChip,
                    {
                      backgroundColor: active ? C.primary : C.card,
                      borderColor: active ? C.primary : C.border,
                    },
                  ]}
                  onPress={() => setFilter(f.key)}
                  testID={`filter-${f.key}`}
                >
                  <Text style={[s.filterText, { color: active ? "#fff" : C.textSecondary }]}>{f.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        }
        renderItem={({ item: os }) => {
          const st = STATUS_MAP[os.status] ?? { label: os.status, color: C.textSecondary, icon: "circle" };
          return (
            <Pressable
              style={({ pressed }) => [s.card, { opacity: pressed ? 0.75 : 1 }]}
              onPress={() => router.push({ pathname: "/os/[id]", params: { id: os.id } })}
              testID={`os-card-${os.id}`}
            >
              <View style={s.cardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.osNumber}>#{os.numero}</Text>
                  <Text style={s.clientName}>{os.clienteNome}</Text>
                  <Text style={s.sub}>{os.veiculo} • Entrada: {formatDate(os.dataEntrada)}</Text>
                </View>
                <View style={{ alignItems: "flex-end" as const }}>
                  <View style={[s.badge, { backgroundColor: st.color + "20" }]}>
                    <Feather name={st.icon as any} size={11} color={st.color} />
                    <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
                  </View>
                  <Text style={[s.value, { color: C.text }]}>
                    {formatCurrency(parseFloat(os.total ?? "0"))}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          isLoading ? (
            <View style={s.loading}><ActivityIndicator color={C.primary} /></View>
          ) : (
            <View style={s.empty}>
              <Feather name="clipboard" size={40} color={C.textTertiary} />
              <Text style={s.emptyText}>Nenhuma ordem encontrada</Text>
            </View>
          )
        }
        ListFooterComponent={<View style={s.pad} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
