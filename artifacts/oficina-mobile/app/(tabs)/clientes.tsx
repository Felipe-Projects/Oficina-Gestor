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
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { apiGet } from "@/utils/api";

function formatPhone(phone: string) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
}

function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = ["#2563EB", "#7C3AED", "#059669", "#D97706", "#DC2626"];

export default function ClientesScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/clientes"],
    queryFn: () => apiGet("/api/clientes"),
  });

  const { data: veiculos } = useQuery({
    queryKey: ["/api/veiculos"],
    queryFn: () => apiGet("/api/veiculos"),
  });

  const clientesComVeiculos = useMemo(() => {
    if (!Array.isArray(data)) return [];
    const veiculosByCliente: Record<number, number> = {};
    if (Array.isArray(veiculos)) {
      veiculos.forEach((v: any) => {
        veiculosByCliente[v.clienteId] = (veiculosByCliente[v.clienteId] ?? 0) + 1;
      });
    }
    let list = data.map((c: any) => ({ ...c, veiculoCount: veiculosByCliente[c.id] ?? 0 }));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c: any) =>
          (c.nome || "").toLowerCase().includes(q) ||
          (c.telefone || "").includes(q) ||
          (c.email || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, veiculos, search]);

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
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    avatarText: { fontSize: 15, fontWeight: "700" as const, color: "#fff", fontFamily: "Inter_700Bold" },
    name: { fontSize: 15, fontWeight: "600" as const, color: C.text, fontFamily: "Inter_600SemiBold" },
    sub: { fontSize: 12, color: C.textSecondary, fontFamily: "Inter_400Regular", marginTop: 2 },
    badge: {
      marginLeft: "auto" as any,
      backgroundColor: C.primaryLight,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
    },
    badgeText: { fontSize: 11, fontWeight: "600" as const, color: C.primary, fontFamily: "Inter_600SemiBold" },
    count: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 13,
      color: C.textSecondary,
      fontFamily: "Inter_400Regular",
    },
    empty: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, paddingVertical: 60 },
    emptyText: { fontSize: 15, color: C.textSecondary, fontFamily: "Inter_400Regular", marginTop: 12 },
    loading: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, paddingVertical: 60 },
    pad: { height: 100 },
  });

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.headerRow}>
          <Text style={s.headerTitle}>Clientes</Text>
          <Pressable
            style={({ pressed }) => [s.addBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => router.push("/cliente/novo")}
            testID="button-novo-cliente"
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={s.addBtnText}>Novo</Text>
          </Pressable>
        </View>
        <View style={s.searchRow}>
          <Feather name="search" size={16} color={C.textTertiary} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar por nome, telefone..."
            placeholderTextColor={C.textTertiary}
            value={search}
            onChangeText={setSearch}
            testID="input-search-cliente"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={C.textTertiary} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={clientesComVeiculos}
        keyExtractor={(item: any) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={C.primary} />}
        ListHeaderComponent={
          !isLoading && Array.isArray(data) ? (
            <Text style={s.count}>{clientesComVeiculos.length} cliente{clientesComVeiculos.length !== 1 ? "s" : ""}</Text>
          ) : null
        }
        renderItem={({ item: cliente, index }) => {
          const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
          return (
            <Pressable
              style={({ pressed }) => [s.card, { opacity: pressed ? 0.75 : 1 }]}
              onPress={() => router.push({ pathname: "/cliente/[id]", params: { id: cliente.id } })}
              testID={`cliente-card-${cliente.id}`}
            >
              <View style={[s.avatar, { backgroundColor: avatarColor }]}>
                <Text style={s.avatarText}>{getInitials(cliente.nome)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{cliente.nome}</Text>
                <Text style={s.sub}>{formatPhone(cliente.telefone)}</Text>
                {cliente.email ? <Text style={[s.sub, { marginTop: 1 }]}>{cliente.email}</Text> : null}
              </View>
              {cliente.veiculoCount > 0 && (
                <View style={s.badge}>
                  <Feather name="truck" size={11} color={C.primary} />
                  <Text style={s.badgeText}>{cliente.veiculoCount}</Text>
                </View>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          isLoading ? (
            <View style={s.loading}><ActivityIndicator color={C.primary} /></View>
          ) : (
            <View style={s.empty}>
              <Feather name="users" size={40} color={C.textTertiary} />
              <Text style={s.emptyText}>Nenhum cliente encontrado</Text>
            </View>
          )
        }
        ListFooterComponent={<View style={s.pad} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
