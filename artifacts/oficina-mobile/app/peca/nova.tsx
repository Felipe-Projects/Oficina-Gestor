import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import { apiPost } from "@/utils/api";

function FormField({
  label,
  required,
  hint,
  children,
  C,
}: {
  label: string;
  required?: boolean;
  hint?: string;
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
      {hint && (
        <Text style={{ fontSize: 11, color: C.textTertiary, fontFamily: "Inter_400Regular", marginTop: 4 }}>
          {hint}
        </Text>
      )}
    </View>
  );
}

export default function NovaPecaScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [quantidade, setQuantidade] = useState("0");
  const [quantidadeMinima, setQuantidadeMinima] = useState("5");
  const [valorCusto, setValorCusto] = useState("");
  const [valorVenda, setValorVenda] = useState("");
  const [loading, setLoading] = useState(false);

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

  async function handleSave() {
    if (!nome.trim()) {
      Alert.alert("Atenção", "Nome da peça é obrigatório.");
      return;
    }
    const custo = parseFloat(valorCusto.replace(",", "."));
    const venda = parseFloat(valorVenda.replace(",", "."));
    if (isNaN(custo) || custo < 0) {
      Alert.alert("Atenção", "Valor de custo inválido.");
      return;
    }
    if (isNaN(venda) || venda < 0) {
      Alert.alert("Atenção", "Valor de venda inválido.");
      return;
    }
    setLoading(true);
    try {
      await apiPost("/api/pecas", {
        nome: nome.trim(),
        codigo: codigo.trim() || undefined,
        quantidade: parseInt(quantidade) || 0,
        quantidadeMinima: parseInt(quantidadeMinima) || 5,
        valorCusto: custo,
        valorVenda: venda,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pecas"] });
      router.back();
    } catch (e: any) {
      Alert.alert("Erro", e.message || "Não foi possível salvar a peça.");
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
    row: { flexDirection: "row" as const, gap: 12 },
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
  });

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.section}>
          <Text style={s.sectionTitle}>Identificação</Text>
          <FormField label="Nome da peça" required C={C}>
            <TextInput
              style={inputStyle}
              value={nome}
              onChangeText={setNome}
              placeholder="Ex: Filtro de óleo"
              placeholderTextColor={C.textTertiary}
              autoCapitalize="sentences"
              testID="input-nome"
            />
          </FormField>
          <FormField label="Código / Referência" C={C}>
            <TextInput
              style={inputStyle}
              value={codigo}
              onChangeText={setCodigo}
              placeholder="Ex: FO-123"
              placeholderTextColor={C.textTertiary}
              autoCapitalize="characters"
              testID="input-codigo"
            />
          </FormField>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Estoque</Text>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <FormField label="Quantidade inicial" hint="unidades" C={C}>
                <TextInput
                  style={inputStyle}
                  value={quantidade}
                  onChangeText={setQuantidade}
                  placeholder="0"
                  placeholderTextColor={C.textTertiary}
                  keyboardType="numeric"
                  testID="input-quantidade"
                />
              </FormField>
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Mínimo em estoque" hint="alerta abaixo disso" C={C}>
                <TextInput
                  style={inputStyle}
                  value={quantidadeMinima}
                  onChangeText={setQuantidadeMinima}
                  placeholder="5"
                  placeholderTextColor={C.textTertiary}
                  keyboardType="numeric"
                  testID="input-quantidade-minima"
                />
              </FormField>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Preços</Text>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <FormField label="Valor de custo" required hint="R$" C={C}>
                <TextInput
                  style={inputStyle}
                  value={valorCusto}
                  onChangeText={setValorCusto}
                  placeholder="0,00"
                  placeholderTextColor={C.textTertiary}
                  keyboardType="decimal-pad"
                  testID="input-valor-custo"
                />
              </FormField>
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Valor de venda" required hint="R$" C={C}>
                <TextInput
                  style={inputStyle}
                  value={valorVenda}
                  onChangeText={setValorVenda}
                  placeholder="0,00"
                  placeholderTextColor={C.textTertiary}
                  keyboardType="decimal-pad"
                  testID="input-valor-venda"
                />
              </FormField>
            </View>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [s.saveBtn, { opacity: pressed ? 0.8 : 1 }]}
          onPress={handleSave}
          disabled={loading}
          testID="button-salvar-peca"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="package" size={18} color="#fff" />
              <Text style={s.saveBtnText}>Salvar Peça</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
