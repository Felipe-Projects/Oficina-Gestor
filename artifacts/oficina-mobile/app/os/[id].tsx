import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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

export default function OSDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: os, isLoading } = useQuery({
    queryKey: ["/api/ordens", id],
    queryFn: () => apiGet(`/api/ordens/${id}`),
    enabled: !!id,
  });

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    loading: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
    scroll: { flex: 1 },
    section: { padding: 16 },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: C.textSecondary,
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
      marginBottom: 10,
      fontFamily: "Inter_600SemiBold",
    },
    card: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
      gap: 10,
    },
    row: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const },
    label: { fontSize: 12, color: C.textSecondary, fontFamily: "Inter_400Regular" },
    value: { fontSize: 14, color: C.text, fontFamily: "Inter_600SemiBold", fontWeight: "600" as const },
    badge: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    badgeText: { fontSize: 12, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
    divider: { height: 1, backgroundColor: C.border },
    totalRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: C.card,
      marginHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
    },
    totalLabel: { fontSize: 16, fontWeight: "600" as const, color: C.text, fontFamily: "Inter_600SemiBold" },
    totalValue: { fontSize: 20, fontWeight: "700" as const, color: C.primary, fontFamily: "Inter_700Bold" },
    whatsBtn: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
      backgroundColor: "#25D366",
      borderRadius: 12,
      padding: 14,
      marginHorizontal: 16,
      marginTop: 12,
      justifyContent: "center" as const,
    },
    whatsBtnText: { fontSize: 15, fontWeight: "600" as const, color: "#fff", fontFamily: "Inter_600SemiBold" },
    itemRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
    itemName: { flex: 1, fontSize: 14, color: C.text, fontFamily: "Inter_400Regular" },
    itemQty: { fontSize: 13, color: C.textSecondary, fontFamily: "Inter_400Regular" },
    itemPrice: { fontSize: 13, fontWeight: "600" as const, color: C.text, fontFamily: "Inter_600SemiBold" },
    pad: { height: Platform.OS === "web" ? 100 : 100 },
    obs: { fontSize: 14, color: C.text, fontFamily: "Inter_400Regular", lineHeight: 20 },
  });

  if (isLoading) {
    return (
      <View style={[s.container, s.loading]}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  if (!os) {
    return (
      <View style={[s.container, s.loading]}>
        <Feather name="alert-circle" size={40} color={C.textTertiary} />
        <Text style={[s.label, { marginTop: 8, fontSize: 15 }]}>OS não encontrada</Text>
      </View>
    );
  }

  const st = STATUS_MAP[os.status] ?? { label: os.status, color: C.textSecondary, icon: "circle" };
  const servicos: any[] = Array.isArray(os.servicos) ? os.servicos : [];
  const pecas: any[] = Array.isArray(os.pecas) ? os.pecas : [];

  function handleWhatsApp() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const phone = (os.telefone || "").replace(/\D/g, "");
    const msg = `Olá ${os.clienteNome}, sua OS #${os.numero} está com status: ${st.label}. Total: ${formatCurrency(parseFloat(os.total ?? "0"))}`;
    const url = `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `OS #${os.numero}`,
          headerBackTitle: "Voltar",
        }}
      />
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Status */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Status</Text>
          <View style={s.card}>
            <View style={s.row}>
              <View>
                <Text style={s.label}>Número</Text>
                <Text style={s.value}>#{os.numero}</Text>
              </View>
              <View style={[s.badge, { backgroundColor: st.color + "20" }]}>
                <Feather name={st.icon as any} size={13} color={st.color} />
                <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
              </View>
            </View>
            <View style={s.divider} />
            <View style={s.row}>
              <View>
                <Text style={s.label}>Entrada</Text>
                <Text style={s.value}>{formatDate(os.dataEntrada)}</Text>
              </View>
              <View style={{ alignItems: "flex-end" as const }}>
                <Text style={s.label}>Previsão</Text>
                <Text style={s.value}>{formatDate(os.dataPrevisao)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Client & Vehicle */}
        <View style={[s.section, { paddingTop: 0 }]}>
          <Text style={s.sectionTitle}>Cliente e Veículo</Text>
          <View style={s.card}>
            <View style={s.row}>
              <Text style={s.label}>Cliente</Text>
              <Text style={s.value}>{os.clienteNome}</Text>
            </View>
            {os.telefone && (
              <View style={s.row}>
                <Text style={s.label}>Telefone</Text>
                <Text style={s.value}>{os.telefone}</Text>
              </View>
            )}
            <View style={s.divider} />
            <View style={s.row}>
              <Text style={s.label}>Veículo</Text>
              <Text style={s.value}>{os.veiculo}</Text>
            </View>
            {os.quilometragem && (
              <View style={s.row}>
                <Text style={s.label}>Quilometragem</Text>
                <Text style={s.value}>{parseInt(os.quilometragem).toLocaleString("pt-BR")} km</Text>
              </View>
            )}
          </View>
        </View>

        {/* Services */}
        {servicos.length > 0 && (
          <View style={[s.section, { paddingTop: 0 }]}>
            <Text style={s.sectionTitle}>Serviços ({servicos.length})</Text>
            <View style={s.card}>
              {servicos.map((sv: any, idx: number) => (
                <View key={idx}>
                  {idx > 0 && <View style={[s.divider, { marginVertical: 8 }]} />}
                  <View style={s.itemRow}>
                    <Text style={s.itemName}>{sv.nome || sv.descricao}</Text>
                    <Text style={s.itemQty}>x{sv.quantidade ?? 1}</Text>
                    <Text style={s.itemPrice}>{formatCurrency(parseFloat(sv.valorUnitario ?? sv.preco ?? "0"))}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Parts */}
        {pecas.length > 0 && (
          <View style={[s.section, { paddingTop: 0 }]}>
            <Text style={s.sectionTitle}>Peças ({pecas.length})</Text>
            <View style={s.card}>
              {pecas.map((p: any, idx: number) => (
                <View key={idx}>
                  {idx > 0 && <View style={[s.divider, { marginVertical: 8 }]} />}
                  <View style={s.itemRow}>
                    <Text style={s.itemName}>{p.nome}</Text>
                    <Text style={s.itemQty}>x{p.quantidade}</Text>
                    <Text style={s.itemPrice}>{formatCurrency(parseFloat(p.precoUnitario ?? "0"))}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Observations */}
        {os.observacoes && (
          <View style={[s.section, { paddingTop: 0 }]}>
            <Text style={s.sectionTitle}>Observações</Text>
            <View style={s.card}>
              <Text style={s.obs}>{os.observacoes}</Text>
            </View>
          </View>
        )}

        {/* Total */}
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Total</Text>
          <Text style={s.totalValue}>{formatCurrency(parseFloat(os.total ?? "0"))}</Text>
        </View>

        {/* WhatsApp */}
        {os.telefone && (
          <Pressable
            style={({ pressed }) => [s.whatsBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={handleWhatsApp}
            testID="button-whatsapp"
          >
            <Feather name="message-circle" size={20} color="#fff" />
            <Text style={s.whatsBtnText}>Contatar via WhatsApp</Text>
          </Pressable>
        )}

        <View style={s.pad} />
      </ScrollView>
    </>
  );
}
