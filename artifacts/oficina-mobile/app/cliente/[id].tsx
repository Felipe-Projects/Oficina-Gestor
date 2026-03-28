import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
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
import { Colors } from "@/constants/colors";
import { apiGet } from "@/utils/api";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  orcamento: { label: "Orçamento", color: "#2563EB" },
  em_andamento: { label: "Em andamento", color: "#D97706" },
  finalizado: { label: "Finalizado", color: "#059669" },
  entregue: { label: "Entregue", color: "#7C3AED" },
  cancelado: { label: "Cancelado", color: "#DC2626" },
};

function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-BR");
}
function formatCurrency(val: number) {
  return `R$ ${val.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

export default function ClienteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;

  const { data: clientes, isLoading: cLoading } = useQuery({
    queryKey: ["/api/clientes"],
    queryFn: () => apiGet("/api/clientes"),
  });
  const { data: veiculos } = useQuery({
    queryKey: ["/api/veiculos"],
    queryFn: () => apiGet("/api/veiculos"),
  });
  const { data: ordens } = useQuery({
    queryKey: ["/api/ordens"],
    queryFn: () => apiGet("/api/ordens"),
  });

  const cliente = Array.isArray(clientes) ? clientes.find((c: any) => String(c.id) === String(id)) : null;
  const veiculosCliente = Array.isArray(veiculos) ? veiculos.filter((v: any) => String(v.clienteId) === String(id)) : [];
  const ordensCliente = Array.isArray(ordens) ? ordens.filter((o: any) => String(o.clienteId) === String(id)) : [];

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    loading: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
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
    divider: { height: 1, backgroundColor: C.border },
    vCard: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 8,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
    },
    vIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: C.primaryLight,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    vName: { fontSize: 14, fontWeight: "600" as const, color: C.text, fontFamily: "Inter_600SemiBold" },
    vSub: { fontSize: 12, color: C.textSecondary, fontFamily: "Inter_400Regular", marginTop: 2 },
    oCard: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 8,
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
    },
    oNumber: { fontSize: 12, fontWeight: "700" as const, color: C.primary, fontFamily: "Inter_700Bold" },
    oSub: { fontSize: 12, color: C.textSecondary, fontFamily: "Inter_400Regular", marginTop: 2 },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      alignSelf: "flex-start" as const,
    },
    badgeText: { fontSize: 11, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
    callBtn: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      backgroundColor: C.primary,
      borderRadius: 10,
      padding: 12,
      marginHorizontal: 16,
      justifyContent: "center" as const,
    },
    callBtnText: { fontSize: 14, fontWeight: "600" as const, color: "#fff", fontFamily: "Inter_600SemiBold" },
    pad: { height: Platform.OS === "web" ? 100 : 100 },
  });

  if (cLoading) {
    return (
      <View style={[s.container, s.loading]}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  if (!cliente) {
    return (
      <View style={[s.container, s.loading]}>
        <Feather name="alert-circle" size={40} color={C.textTertiary} />
        <Text style={[s.label, { marginTop: 8, fontSize: 15 }]}>Cliente não encontrado</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: cliente.nome, headerBackTitle: "Voltar" }} />
      <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
        {/* Info */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Informações</Text>
          <View style={s.card}>
            {cliente.telefone && (
              <View style={s.row}>
                <Text style={s.label}>Telefone</Text>
                <Text style={s.value}>{cliente.telefone}</Text>
              </View>
            )}
            {cliente.email && (
              <View style={s.row}>
                <Text style={s.label}>Email</Text>
                <Text style={s.value}>{cliente.email}</Text>
              </View>
            )}
            {cliente.cpfCnpj && (
              <View style={s.row}>
                <Text style={s.label}>CPF/CNPJ</Text>
                <Text style={s.value}>{cliente.cpfCnpj}</Text>
              </View>
            )}
            {cliente.endereco && (
              <View style={s.row}>
                <Text style={s.label}>Endereço</Text>
                <Text style={[s.value, { flex: 1, textAlign: "right" as const }]}>{cliente.endereco}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Vehicles */}
        {veiculosCliente.length > 0 && (
          <View style={[s.section, { paddingTop: 0 }]}>
            <Text style={s.sectionTitle}>Veículos ({veiculosCliente.length})</Text>
            {veiculosCliente.map((v: any) => (
              <View key={v.id} style={s.vCard}>
                <View style={s.vIcon}>
                  <Feather name="truck" size={16} color={C.primary} />
                </View>
                <View>
                  <Text style={s.vName}>{v.marca} {v.modelo} {v.ano}</Text>
                  <Text style={s.vSub}>{v.placa} • {v.cor}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Orders */}
        {ordensCliente.length > 0 && (
          <View style={[s.section, { paddingTop: 0 }]}>
            <Text style={s.sectionTitle}>Ordens de Serviço ({ordensCliente.length})</Text>
            {ordensCliente.map((os: any) => {
              const st = STATUS_MAP[os.status] ?? { label: os.status, color: C.textSecondary };
              return (
                <View key={os.id} style={s.oCard}>
                  <View>
                    <Text style={s.oNumber}>#{os.numero}</Text>
                    <Text style={s.oSub}>{os.veiculo}</Text>
                    <Text style={s.oSub}>{formatDate(os.dataEntrada)}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" as const }}>
                    <View style={[s.badge, { backgroundColor: st.color + "20" }]}>
                      <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
                    </View>
                    <Text style={[s.oNumber, { marginTop: 6, color: C.text }]}>
                      {formatCurrency(parseFloat(os.total ?? "0"))}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Call button */}
        {cliente.telefone && (
          <Pressable
            style={({ pressed }) => [s.callBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => Linking.openURL(`tel:${cliente.telefone}`)}
            testID="button-call"
          >
            <Feather name="phone" size={18} color="#fff" />
            <Text style={s.callBtnText}>Ligar para {cliente.nome.split(" ")[0]}</Text>
          </Pressable>
        )}

        <View style={s.pad} />
      </ScrollView>
    </>
  );
}
