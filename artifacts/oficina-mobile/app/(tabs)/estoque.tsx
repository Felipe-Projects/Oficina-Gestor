import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { apiGet } from "@/utils/api";

function formatCurrency(val: number) {
  return `R$ ${val.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

export default function EstoqueScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [showLowOnly, setShowLowOnly] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/pecas"],
    queryFn: () => apiGet("/api/pecas"),
  });

  const pecas = useMemo(() => {
    if (!Array.isArray(data)) return [];
    let list = data;
    if (showLowOnly) list = list.filter((p: any) => parseInt(p.quantidade) <= parseInt(p.quantidadeMinima ?? "5"));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p: any) => (p.nome || "").toLowerCase().includes(q) || (p.codigo || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, search, showLowOnly]);

  const lowCount = useMemo(() => {
    if (!Array.isArray(data)) return 0;
    return data.filter((p: any) => parseInt(p.quantidade) <= parseInt(p.quantidadeMinima ?? "5")).length;
  }, [data]);

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
    headerRow: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const },
    headerTitle: { fontSize: 22, fontWeight: "700" as const, color: C.text, fontFamily: "Inter_700Bold" },
    searchRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      backgroundColor: C.background,
      borderRadius: 10,
      marginTop: 10,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: C.border,
    },
    searchInput: { flex: 1, height: 38, color: C.text, fontSize: 14, fontFamily: "Inter_400Regular", paddingLeft: 6 },
    alertBanner: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      backgroundColor: C.dangerBg,
      marginHorizontal: 16,
      marginTop: 12,
      padding: 12,
      borderRadius: 10,
      gap: 8,
    },
    alertText: { fontSize: 13, color: C.danger, fontFamily: "Inter_600SemiBold", fontWeight: "600" as const },
    filterRow: { paddingHorizontal: 16, paddingVertical: 10 },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      alignSelf: "flex-start" as const,
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
    partName: { fontSize: 15, fontWeight: "600" as const, color: C.text, fontFamily: "Inter_600SemiBold" },
    partCode: { fontSize: 12, color: C.textSecondary, fontFamily: "Inter_400Regular", marginTop: 2 },
    priceRow: { flexDirection: "row" as const, gap: 12, marginTop: 6, alignItems: "center" as const },
    price: { fontSize: 13, fontWeight: "700" as const, color: C.text, fontFamily: "Inter_700Bold" },
    priceLabel: { fontSize: 11, color: C.textTertiary, fontFamily: "Inter_400Regular" },
    stockBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    stockText: { fontSize: 12, fontWeight: "700" as const, fontFamily: "Inter_700Bold" },
    empty: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, paddingVertical: 60 },
    emptyText: { fontSize: 15, color: C.textSecondary, fontFamily: "Inter_400Regular", marginTop: 12 },
    loading: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, paddingVertical: 60 },
    pad: { height: 100 },
  });

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.headerTitle}>Estoque</Text>
        </View>
        <View style={s.searchRow}>
          <Feather name="search" size={16} color={C.textTertiary} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar peça ou código..."
            placeholderTextColor={C.textTertiary}
            value={search}
            onChangeText={setSearch}
            testID="input-search-peca"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={C.textTertiary} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={pecas}
        keyExtractor={(item: any) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={C.primary} />}
        ListHeaderComponent={
          <View>
            {lowCount > 0 && (
              <Pressable style={s.alertBanner} onPress={() => setShowLowOnly(!showLowOnly)}>
                <Feather name="alert-triangle" size={16} color={C.danger} />
                <Text style={s.alertText}>
                  {lowCount} peça{lowCount !== 1 ? "s" : ""} com estoque baixo
                </Text>
                <Feather name="chevron-right" size={14} color={C.danger} style={{ marginLeft: "auto" as any }} />
              </Pressable>
            )}
            <View style={s.filterRow}>
              {lowCount > 0 && (
                <Pressable
                  style={[
                    s.filterChip,
                    {
                      backgroundColor: showLowOnly ? C.danger : C.card,
                      borderColor: showLowOnly ? C.danger : C.border,
                    },
                  ]}
                  onPress={() => setShowLowOnly(!showLowOnly)}
                  testID="filter-low-stock"
                >
                  <Text style={[s.filterText, { color: showLowOnly ? "#fff" : C.textSecondary }]}>
                    {showLowOnly ? "Mostrando estoque baixo" : "Todos"}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        }
        renderItem={({ item: peca }) => {
          const qty = parseInt(peca.quantidade ?? "0");
          const minQty = parseInt(peca.quantidadeMinima ?? "5");
          const isLow = qty <= minQty;
          return (
            <View style={[s.card, isLow ? { borderColor: C.danger + "60" } : {}]}>
              <View style={s.cardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.partName}>{peca.nome}</Text>
                  {peca.codigo ? <Text style={s.partCode}>Cód: {peca.codigo}</Text> : null}
                </View>
                <View style={[s.stockBadge, { backgroundColor: isLow ? C.dangerBg : C.successBg }]}>
                  <Text style={[s.stockText, { color: isLow ? C.danger : C.success }]}>
                    {qty} un
                  </Text>
                </View>
              </View>
              <View style={s.priceRow}>
                <View>
                  <Text style={s.priceLabel}>Custo</Text>
                  <Text style={s.price}>{formatCurrency(parseFloat(peca.precoCusto ?? "0"))}</Text>
                </View>
                <View>
                  <Text style={s.priceLabel}>Venda</Text>
                  <Text style={[s.price, { color: C.primary }]}>{formatCurrency(parseFloat(peca.precoVenda ?? "0"))}</Text>
                </View>
                <View>
                  <Text style={s.priceLabel}>Mínimo</Text>
                  <Text style={[s.price, { color: C.textSecondary }]}>{minQty} un</Text>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          isLoading ? (
            <View style={s.loading}><ActivityIndicator color={C.primary} /></View>
          ) : (
            <View style={s.empty}>
              <Feather name="package" size={40} color={C.textTertiary} />
              <Text style={s.emptyText}>Nenhuma peça encontrada</Text>
            </View>
          )
        }
        ListFooterComponent={<View style={s.pad} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
