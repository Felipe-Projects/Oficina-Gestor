import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { Colors } from "@/constants/colors";
import { apiGet, apiPost } from "@/utils/api";

function FormField({
  label,
  required,
  children,
  C,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  C: typeof Colors.light;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          fontFamily: "Inter_600SemiBold",
          color: C.textSecondary,
          marginBottom: 6,
        }}
      >
        {label}
        {required && <Text style={{ color: C.danger }}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

export default function NovoVeiculoScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ clienteId?: string }>();

  const [clienteId, setClienteId] = useState<number | null>(
    params.clienteId ? parseInt(params.clienteId) : null
  );
  const [clienteNome, setClienteNome] = useState("");
  const [placa, setPlaca] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [ano, setAno] = useState(String(new Date().getFullYear()));
  const [km, setKm] = useState("");
  const [cor, setCor] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [loading, setLoading] = useState(false);
  const [showClientePicker, setShowClientePicker] = useState(false);
  const [clienteSearch, setClienteSearch] = useState("");

  const { data: clientes } = useQuery({
    queryKey: ["/api/clientes"],
    queryFn: () => apiGet("/api/clientes"),
    enabled: !params.clienteId,
  });

  useEffect(() => {
    if (params.clienteId && clientes) {
      const c = Array.isArray(clientes)
        ? clientes.find((x: any) => x.id === parseInt(params.clienteId!))
        : null;
      if (c) setClienteNome(c.nome);
    }
  }, [params.clienteId, clientes]);

  const filteredClientes = Array.isArray(clientes)
    ? clientes.filter((c: any) =>
        clienteSearch
          ? (c.nome || "").toLowerCase().includes(clienteSearch.toLowerCase())
          : true
      )
    : [];

  const inputStyle = {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: C.text,
  };

  const rowStyle = {
    flexDirection: "row" as const,
    gap: 12,
  };

  async function handleSave() {
    if (!clienteId) {
      Alert.alert("Atenção", "Selecione o proprietário.");
      return;
    }
    if (!placa.trim()) {
      Alert.alert("Atenção", "Placa é obrigatória.");
      return;
    }
    if (!marca.trim() || !modelo.trim()) {
      Alert.alert("Atenção", "Marca e modelo são obrigatórios.");
      return;
    }
    const anoNum = parseInt(ano);
    if (isNaN(anoNum) || anoNum < 1950 || anoNum > new Date().getFullYear() + 1) {
      Alert.alert("Atenção", "Ano inválido.");
      return;
    }
    setLoading(true);
    try {
      await apiPost("/api/veiculos", {
        clienteId,
        placa: placa.trim().toUpperCase(),
        marca: marca.trim(),
        modelo: modelo.trim(),
        ano: anoNum,
        km: km ? parseInt(km) : undefined,
        cor: cor.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/veiculos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clientes", clienteId] });
      router.back();
    } catch (e: any) {
      Alert.alert("Erro", e.message || "Não foi possível salvar o veículo.");
    } finally {
      setLoading(false);
    }
  }

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    scroll: { padding: 16 },
    section: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "700",
      fontFamily: "Inter_700Bold",
      color: C.textTertiary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 14,
    },
    picker: {
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 13,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    pickerText: { fontSize: 15, fontFamily: "Inter_400Regular", color: C.text },
    pickerPlaceholder: { fontSize: 15, fontFamily: "Inter_400Regular", color: C.textTertiary },
    saveBtn: {
      backgroundColor: C.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
      marginBottom: 40,
    },
    saveBtnText: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold", color: "#fff" },
    modal: { flex: 1, backgroundColor: C.background },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: Platform.OS === "ios" ? 56 : 16,
      paddingBottom: 12,
      backgroundColor: C.card,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      gap: 12,
    },
    modalTitle: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold", color: C.text, flex: 1 },
    modalSearch: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.background,
      borderRadius: 10,
      marginHorizontal: 16,
      marginVertical: 10,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: C.border,
    },
    modalSearchInput: { flex: 1, height: 40, color: C.text, fontSize: 14, fontFamily: "Inter_400Regular", paddingLeft: 6 },
    modalItem: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    modalItemText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.text },
  });

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.section}>
          <Text style={s.sectionTitle}>Proprietário</Text>
          {!params.clienteId && (
            <FormField label="Cliente" required C={C}>
              <Pressable
                style={({ pressed }) => [s.picker, { opacity: pressed ? 0.7 : 1 }]}
                onPress={() => setShowClientePicker(true)}
                testID="button-pick-cliente"
              >
                {clienteNome ? (
                  <Text style={s.pickerText}>{clienteNome}</Text>
                ) : (
                  <Text style={s.pickerPlaceholder}>Selecionar cliente...</Text>
                )}
                <Feather name="chevron-down" size={16} color={C.textTertiary} />
              </Pressable>
            </FormField>
          )}
          {params.clienteId && clienteNome ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Feather name="user" size={16} color={C.primary} />
              <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: C.text }}>{clienteNome}</Text>
            </View>
          ) : null}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Dados do Veículo</Text>
          <FormField label="Placa" required C={C}>
            <TextInput
              style={inputStyle}
              value={placa}
              onChangeText={(v) => setPlaca(v.toUpperCase())}
              placeholder="ABC-1234"
              placeholderTextColor={C.textTertiary}
              autoCapitalize="characters"
              maxLength={8}
              testID="input-placa"
            />
          </FormField>
          <View style={rowStyle}>
            <View style={{ flex: 1 }}>
              <FormField label="Marca" required C={C}>
                <TextInput
                  style={inputStyle}
                  value={marca}
                  onChangeText={setMarca}
                  placeholder="Fiat"
                  placeholderTextColor={C.textTertiary}
                  autoCapitalize="words"
                  testID="input-marca"
                />
              </FormField>
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Modelo" required C={C}>
                <TextInput
                  style={inputStyle}
                  value={modelo}
                  onChangeText={setModelo}
                  placeholder="Uno"
                  placeholderTextColor={C.textTertiary}
                  autoCapitalize="words"
                  testID="input-modelo"
                />
              </FormField>
            </View>
          </View>
          <View style={rowStyle}>
            <View style={{ flex: 1 }}>
              <FormField label="Ano" required C={C}>
                <TextInput
                  style={inputStyle}
                  value={ano}
                  onChangeText={setAno}
                  placeholder="2020"
                  placeholderTextColor={C.textTertiary}
                  keyboardType="numeric"
                  maxLength={4}
                  testID="input-ano"
                />
              </FormField>
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="KM atual" C={C}>
                <TextInput
                  style={inputStyle}
                  value={km}
                  onChangeText={setKm}
                  placeholder="50000"
                  placeholderTextColor={C.textTertiary}
                  keyboardType="numeric"
                  testID="input-km"
                />
              </FormField>
            </View>
          </View>
          <FormField label="Cor" C={C}>
            <TextInput
              style={inputStyle}
              value={cor}
              onChangeText={setCor}
              placeholder="Prata"
              placeholderTextColor={C.textTertiary}
              autoCapitalize="sentences"
              testID="input-cor"
            />
          </FormField>
          <FormField label="Observações" C={C}>
            <TextInput
              style={[inputStyle, { minHeight: 70, textAlignVertical: "top" }]}
              value={observacoes}
              onChangeText={setObservacoes}
              placeholder="Informações adicionais..."
              placeholderTextColor={C.textTertiary}
              multiline
              testID="input-observacoes"
            />
          </FormField>
        </View>

        <Pressable
          style={({ pressed }) => [s.saveBtn, { opacity: pressed ? 0.8 : 1 }]}
          onPress={handleSave}
          disabled={loading}
          testID="button-salvar-veiculo"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="truck" size={18} color="#fff" />
              <Text style={s.saveBtnText}>Salvar Veículo</Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      <Modal visible={showClientePicker} animationType="slide">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Selecionar Cliente</Text>
            <Pressable onPress={() => setShowClientePicker(false)}>
              <Feather name="x" size={22} color={C.text} />
            </Pressable>
          </View>
          <View style={s.modalSearch}>
            <Feather name="search" size={16} color={C.textTertiary} />
            <TextInput
              style={s.modalSearchInput}
              placeholder="Buscar cliente..."
              placeholderTextColor={C.textTertiary}
              value={clienteSearch}
              onChangeText={setClienteSearch}
              autoFocus
            />
          </View>
          <FlatList
            data={filteredClientes}
            keyExtractor={(item: any) => String(item.id)}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [s.modalItem, { opacity: pressed ? 0.7 : 1 }]}
                onPress={() => {
                  setClienteId(item.id);
                  setClienteNome(item.nome);
                  setShowClientePicker(false);
                  setClienteSearch("");
                }}
              >
                <Text style={s.modalItemText}>{item.nome}</Text>
                <Text style={{ fontSize: 12, color: C.textSecondary, fontFamily: "Inter_400Regular", marginTop: 2 }}>
                  {item.telefone}
                </Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
